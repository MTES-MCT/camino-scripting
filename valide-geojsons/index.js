const turf = require('@turf/turf')
const fs = require('fs')
const path = require('path')

const run = () => {
  let nombrePolygonePapillon = 0
  const geojsons = require(path.join(process.cwd(), 'sources/geojsons.json'))
  geojsonsModified = turf.featureCollection(
    turf.featureReduce(
      geojsons,
      (geoArr, feature) => {
        const geometry = {
          type: turf.getType(feature),
          coordinates: turf.getCoords(feature)[0].reduce((arr, coord) => {
            const polygon = turf.polygon([coord])
            if (coord.length !== 5) return arr

            const convex = turf.convex(polygon)
            const ratio = turf.area(convex) / turf.area(polygon)
            if (ratio >= 1.01) {
              nombrePolygonePapillon += 1
              return [...arr, turf.getCoords(convex)]
            }

            // Pour avoir toutes les features
            // return [...arr, turf.getCoords(polygon)]

            // Pour ne garder que les features erronées
            return arr
          }, [])
        }
        if (geometry.coordinates.length === 0) return geoArr

        const geom = turf.feature(geometry)
        geom.properties = feature.properties
        return [...geoArr, geom]
      },
      []
    )
  )
  console.log(nombrePolygonePapillon)

  fs.writeFileSync(
    path.join(process.cwd(), 'geojsons-modified.json'),
    JSON.stringify(geojsonsModified)
  )
  process.exit()
}

run()
