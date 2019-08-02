const toGeojson = coords => {
  // si le nombre de sommets n'est pas un multiple de 4
  // alors ne former qu'un seul polygone
  if (coords.length % 4 !== 0) {
    coords = coords.map(c => [+c.W_DD, +c.N_DD])
    return {
      type: 'Polygon',
      coordinates: [[...coords, coords[0]]]
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

// const points = require('./sources/json/onf-points-polygones-8-12.json')
const points = require('./sources/json/onf-points-irreguliers.json')

if (true) {
  console.log(
    JSON.stringify({
      type: 'FeatureCollection',
      features: points.reduce(
        (r, p) => (
          p.points.length == 4 &&
            r.push({
              type: 'Feature',
              properties: {
                reference_ONF: p.ReferenceONF
              },
              geometry: toGeojson(p.points)
            }),
          r
        ),
        []
      )
    })
  )
} else {
  console.log(points.length)
}
