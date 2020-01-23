const gdal = require('gdal')
const json2csv = require('json2csv').parse
const decamelize = require('decamelize')
const { readFileSync: read, writeFileSync: write } = require('fs')

// const perimetres = JSON.parse(read('./sources/json/onf-arm-perdues.geojson'))
//const perimetres = JSON.parse(
//  read('./sources/json/onf-arm-incoherents.geojson')
//)
//const perimetres = JSON.parse(read('./sources/json/onf-arm-epis.geojson'))
const perimetres = JSON.parse(read('./sources/json/onf-arm-3-perim.geojson'))

const titresM = require('../sources/json/titres-m-titres.json')

const mIndex = titresM.reduce(
  (r, t) => (
    t.references && t.references.ONF && (r[t.references.ONF] = t.id), r
  ),
  {}
)

const pIndex = perimetres.features.reduce((r, f) => {
  const onf = f.properties.WINREF_ONF
  const id = mIndex[onf]

  if (!r[id]) {
    r[id] = {
      id,
      onf,
      geojson: []
    }
  }

  r[id].geojson.push(f.geometry.coordinates)

  return r
}, {})

const toCsv = (res, name, prefix = '') => {
  if (!res || !res.length) {
    // console.log('empty file:', name)
    return
  }

  res = res.map(
    o => Object.keys(o).reduce((r, k) => ((r[decamelize(k)] = o[k]), r), {}),
    {}
  )

  const fields = Object.keys(res.reduce((r, o) => ({ ...r, ...o }), {}))

  const opts = { fields }

  try {
    const csv = json2csv(res, opts)
    write(
      `./exports/camino-onf-perimetres/${prefix}${decamelize(name, '_')}.csv`,
      csv
    )
  } catch (err) {
    console.error(err)
  }
}

const toWgs = (system, [coord1, coord2]) => {
  const point = new gdal.Point(coord1, coord2)
  const transformation = new gdal.CoordinateTransformation(
    gdal.SpatialReference.fromEPSG(system),
    gdal.SpatialReference.fromEPSG(4326)
  )
  point.transform(transformation)

  return [point.x, point.y]
}

const leftPad = (str, i = 2) => str.toString().padStart(i, '0')

const rgfg95 = 2972
const wgs84 = 4326

const system = rgfg95

const pointsCreate = (titreEtapeId, points, contourId, groupeId) =>
  points.slice(0, -1).map((point, pointId) => ({
    id: `${titreEtapeId}-g${leftPad(groupeId + 1)}-c${leftPad(
      contourId + 1
    )}-p${leftPad(pointId + 1, 3)}`,
    titreEtapeId,
    coordonnees: toWgs(system, point).join(','),
    groupe: groupeId + 1,
    contour: contourId + 1,
    point: pointId + 1,
    nom: String(pointId + 1),
    description: ''
  }))

const transformPoints = (
  titreEtapeId,
  contour,
  contourId,
  groupeId,
  reference
) => {
  const points = pointsCreate(titreEtapeId, contour, contourId, groupeId)

  // return points

  const references = points.map((point, i) => {
    const coords = contour[i].join(',')

    return {
      id: `${point.id}-${system}`,
      titrePointId: point.id,
      geoSystemeId: system,
      coordonnees: coords
    }
  })

  return { points, references }
}

const r = Object.values(pIndex).reduce(
  ({ points, references, incertitudes }, e) => {
    if (!e.id) {
      console.log(e)
    }

    const titreEtapeId = `${e.id}-oct01-meo01`

    e.geojson.forEach((contoursOrPoints, contourIdOrGroupId) =>
      contoursOrPoints.forEach((polygon, contourId) => {
        const res = transformPoints(
          titreEtapeId,
          polygon,
          contourId,
          contourIdOrGroupId
        )

        points.push(...res.points)
        references.push(...res.references)
      })
    )

    incertitudes.push({
      titreEtapeId,
      date: '',
      dateDebut: '',
      dateFin: '',
      duree: '',
      surface: '',
      volume: '',
      engagement: '',
      points: true
    })

    return { points, references, incertitudes }
  },
  { points: [], references: [], incertitudes: [] }
)

// const prefix = 'perdues-'
// const prefix = 'incoherents-'
// const prefix = 'epis-'
const prefix = '3-perim'

toCsv(r.points, 'points', prefix)
toCsv(r.references, 'references', prefix)
toCsv(r.incertitudes, 'incertitudes', prefix)

console.log('ok')
