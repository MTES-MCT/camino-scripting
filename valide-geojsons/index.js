const turf = require('@turf/turf')
const fs = require('fs')
const path = require('path')

const coordinatesValideGet = coordinates => {
  // Enlever les [] contenant coord si l'on rajoute des polygones au lieu de rajouter des trous
  const polygon = turf.polygon([coordinates])

  if (coordinates.length !== 5) return null

  // On crée l'enveloppe convexe des coordonnées (le rectangle le plus petit contenant tout les points)
  const convex = turf.convex(polygon)

  // L'enveloppe n'ayant pas exactement les mêmes coordonées que le polygone, on calcule l'aire des 2
  // L'aire d'un papillon est bien plus petite que l'aire d'un polygone fermé.
  // On néglige les erreurs d'approximation des coordonnées (approx < 1 mm)
  const ratio = turf.area(convex) / turf.area(polygon)

  return ratio >= 1.01 ? turf.getCoords(convex) : null
}

const featureValidate = feature =>
  turf
    // On construit des trous au lieu de rajouter des polygones.
    // Note : enlever le '[0]' si l'on modifie la source.
    // Ne fonctionnera pas si l'on rajoute des polygones et des trous
    .getCoords(feature)[0]
    .reduce((arr, coord) => {
      const coordinatesValide = coordinatesValideGet(coord)

      return coordinatesValide ? [...arr, coordinatesValide] : arr
    }, [])

const run = () => {
  const fileName = process.argv[2] || 'sources/geojsons.geojson'

  const filePath = path.join(process.cwd(), fileName)

  console.log({ fileName, filePath })

  let geojsons

  try {
    geojsons = fs.readFileSync(filePath)
  } catch (e) {
    console.error(`Impossible de lire le fichier : ${fileName}`)
    process.exit(1)
  }

  const features = turf.featureReduce(
    geojsons,
    (geoArr, feature) => {
      const coordsEnveloppe = featureValidate(feature)
      if (coordsEnveloppe.length === 0) return geoArr

      const geometry = {
        type: turf.getType(feature),
        coordinates: coordsEnveloppe
      }

      const geom = {
        ...turf.feature(geometry),
        properties: feature.properties
      }

      return [...geoArr, geom]
    },
    []
  )

  if (!features.length) {
    console.info('Aucun périmètre invalide détecté')
    process.exit(0)
  }

  console.log(features.length)

  const geojsonsModified = turf.featureCollection(features)

  const resultPath = path.join(
    process.cwd(),
    `${path.basename(fileName, '.geojson')}-modified.geojson`
  )
  console.log({ resultPath })

  fs.writeFileSync(resultPath, JSON.stringify(geojsonsModified))

  process.exit(0)
}

run()
