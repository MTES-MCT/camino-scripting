const { writeFileSync: write } = require('fs')
const csv = require('csvtojson')

function toGeojson(coords) {
  if (coords.length % 4 !== 0) {
    return {
      type: 'Polygon',
      coordinates: coords.map(c => [+c.W_DD, +c.N_DD])
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: [
      coords.reduce((acc, c, i, arr) => {
        if (i % 4 === 0) {
          if (i > 0) {
            const poly = acc.slice(-1)[0]
            poly.push(poly[0])
          }

          acc.push([])
        }

        const poly = acc.slice(-1)[0]

        poly.push([+c.W_DD, +c.N_DD])

        if (i === arr.length - 1) {
          poly.push(poly[0])
        }

        return acc
      }, [])
    ]
  }
}

async function main() {
  const dossiers = await csv().fromFile('./exports/onf-dossiers-light.csv')

  const polygones = await csv().fromFile('./exports/onf-polygones.csv')
  const polycoordonnees = await csv().fromFile(
    './exports/onf-polycoordonnees-light.csv'
  )

  //  console.log(dossiers.length, polygones.length, polycoordonnees.length)
  //  console.log(dossiers[0], polygones[0], polycoordonnees[0])

  const res = dossiers.reduce((acc, dossier) => {
    if (dossier.Typededossier !== 'ARM') return acc

    const { IDDossier: id } = dossier

    const g = polygones.find(p => p.IDDossier === id)
    if (!g) return acc

    const { IDPolygone: idPoly } = g

    const coords = polycoordonnees.filter(p => p.IDPolygone === idPoly)
    if (!coords.length) return acc

    acc.push({
      id,
      dossier,
      nb: +dossier.NbPolygones,
      polygone: g,
      coords,
      geojson: toGeojson(coords)
    })

    return acc
  }, [])

  console.log('arm:', res.length)

  const multis = res.filter(r => r.geojson.type === 'MultiPolygon')

  console.log('multi:', multis.length)

  const features = {
    type: 'FeatureCollection',
    features: multis.map(m => ({
      type: 'Feature',
      properties: {
        ref: m.dossier.ReferenceONF,
        secteur: m.dossier.NomSecteur,
        demandeur: m.dossier.NomDemandeur,
        depot: m.dossier.DepotLo,
        IDDossier: m.id
      },
      geometry: m.geojson
    }))
  }

  write('./exports/arm-multi.geojson', JSON.stringify(features, null, 2))

  // const multi = res.find(r => r.polygone.IDPolygone === '1664')
  // console.log(JSON.stringify(multi.geojson))
}

main()
