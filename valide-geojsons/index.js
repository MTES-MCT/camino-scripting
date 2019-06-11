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
        const coordsEnveloppe = turf
          // On construit des trous au lieu de rajouter des polygones, enlever le '[0]' si l'on modifie la source. Ne fonctionnera pas si l'on rajoute des polygone et des trous
          .getCoords(feature)[0]
          .reduce((arr, coord) => {
            // Enlever les [] contenant coord si l'on rajoute des polygones au lieu de rajouter des trous
            const polygon = turf.polygon([coord])

            // Pour avoir toutes les features
            // if (coord.length !== 5) return [...arr, turf.getCoords(polygon)]

            // Pour ne garder que les features erronées
            if (coord.length !== 5) return arr

            // On crée l'enveloppe convexe des coordonnées (le rectangle le plus petit contenant tout les points)
            const convex = turf.convex(polygon)

            // L'enveloppe n'ayant pas exactement les mêmes coordonées que le polygone, on calcule l'aire des 2
            // L'aire d'un papillon est bien plus petite que l'aire d'un polygone fermé. On néglige les erreurs d'approximation des coordonnées (approx < 1 mm)
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

        if (coordsEnveloppe.length === 0) return geoArr

        const geometry = {
          type: turf.getType(feature),
          coordinates: coordsEnveloppe
        }
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
