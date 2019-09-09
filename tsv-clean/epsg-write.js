/*
Fichier qui ecrit les titres miniers modifiés par epsg-modif
Il range aussi les titres dans chaque dossier dependant du log des erreurs
Il peut aussi créer un fichier csv contenant les erreurs
*/

const fs = require('fs')
const path = require('path')
const json2csv = require('json2csv').parse
const titreCorrespondance = require('./titres-correspondance')
const geojsonFeatureMultiPolygon = require('./geojson')

const APPEND_UTF8 = {
  flag: 'w+',
  encoding: 'UTF-8'
}

const geojsonFromDataCreate = data => {
  const geojsonData = data.reduce((acc, wgs84Point) => {
    const [x, y] = wgs84Point.coordonnees.split(',')
    return [
      ...acc,
      {
        ...wgs84Point,
        coordonnees: {
          x: parseFloat(x),
          y: parseFloat(y)
        }
      }
    ]
  }, [])
  return geojsonFeatureMultiPolygon(geojsonData)
}

const hasDesc = wgs84Data => {
  let desc = false
  wgs84Data.forEach(data => {
    if (data.description.length !== 0) {
      desc = true
    }
  })

  return desc
}

const geojsonCsvTsvCreate = (resultsPath, dataFiles) => {
  const filesStore = path.join(resultsPath, 'export')
  if (!fs.existsSync(filesStore)) {
    fs.mkdirSync(filesStore)
  }
  Object.keys(dataFiles.wgs84).forEach(titreEtapeId => {
    const refData = dataFiles.ref[titreEtapeId].reduce(
      (arr, red) => [...red, ...arr],
      []
    )

    const wgs84Data = dataFiles.wgs84[titreEtapeId]
    const dataPath = path.join(filesStore, titreEtapeId)
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath)
    }

    const csvDomaineRef = json2csv(refData)
    const pathDataRef = path.join(
      dataPath,
      `${titreEtapeId}-points-references.csv`
    )
    fs.writeFileSync(pathDataRef, csvDomaineRef, APPEND_UTF8)

    const csvDomaineWgs84 = json2csv(wgs84Data)
    const pathDataWgs84 = path.join(
      dataPath,
      `${titreEtapeId}${hasDesc(wgs84Data) ? '-desc' : ''}-points.csv`
    )
    fs.writeFileSync(pathDataWgs84, csvDomaineWgs84, APPEND_UTF8)

    const geojson = geojsonFromDataCreate(wgs84Data)
    const pathGeojson = path.join(dataPath, `${titreEtapeId}.geojson`)
    fs.writeFileSync(pathGeojson, JSON.stringify(geojson), APPEND_UTF8)
  })
}

const geojsonGlobalCreate = (resultsPath, wgs84DataFiles) => {
  const wgs84Data = Object.keys(wgs84DataFiles).reduce((acc, key) => {
    const domaineId = key[0]

    acc[domaineId] = [
      ...(acc[domaineId] || []),
      wgs84DataFiles[key].reduce((acc, dataPoint) => [...acc, dataPoint], [])
    ]
    return acc
  }, {})

  Object.keys(wgs84Data).forEach(domaineId => {
    const geojson = {
      type: 'FeatureCollection',
      properties: { domaine: domaineId },
      features: wgs84Data[domaineId].map(wgs84Polygon =>
        geojsonFromDataCreate(wgs84Polygon)
      )
    }

    const pathDataGeo = path.join(
      resultsPath,
      `titres-${domaineId}-geojsons.geojson`
    )
    fs.writeFileSync(pathDataGeo, JSON.stringify(geojson), APPEND_UTF8)
  })
}

const fileDomaineCreate = (domainesIds, resultsPath, pointDomaine) => {
  domainesIds.forEach(domaineId => {
    const domaineObjet = pointDomaine[domaineId]
    if (domaineObjet === undefined || domaineObjet.ref.length === 0) return

    const csvDomaineRef = json2csv(domaineObjet.ref)
    const csvDomaineWgs84 = json2csv(domaineObjet.wgs84)
    const pathDataRef = path.join(
      resultsPath,
      `titres-${domaineId}-points-references.csv`
    )
    fs.writeFileSync(pathDataRef, csvDomaineRef, APPEND_UTF8)

    const pathDataWgs84 = path.join(
      resultsPath,
      `titres-${domaineId}-points.csv`
    )
    fs.writeFileSync(pathDataWgs84, csvDomaineWgs84, APPEND_UTF8)
  })
}

const pointDomaineCreate = dataFiles =>
  Object.keys(dataFiles.ref).reduce((acc, key) => {
    const domaineId = key[0]
    acc[domaineId] = acc[domaineId] || { ref: [], wgs84: [] }

    acc[domaineId].ref = [
      ...acc[domaineId].ref,
      ...dataFiles.ref[key].reduce(
        (acc, dataPoint) => [...acc, ...dataPoint],
        []
      )
    ]
    if (dataFiles.wgs84[key] === undefined) return acc

    acc[domaineId].wgs84 = [
      ...acc[domaineId].wgs84,
      ...dataFiles.wgs84[key].reduce(
        (acc, dataPoint) => [...acc, dataPoint],
        []
      )
    ]
    return acc
  }, {})

const refPointsSelection = (refPoints, tsvCaminoExistence) => {
  // Regarde si il existe un point auquel est lié notre référence dans Camino. Si oui, on ne l'ajoute pas dans la liste
  const pointsRefCamino = tsvCaminoExistence.pointsReference
  const pointsCaminoNombre = pointsRefCamino.length
  // Si il n'y a pas de points dans Camino, on renvoit les références
  if (pointsCaminoNombre === 0) return refPoints

  // Si il y n'y a que des descriptions, renvoie les points de référence
  if (pointsRefCamino.filter(A => A.length !== 0).length === 0) return refPoints

  const refPointsFiltered = refPoints.map(epsgPoints =>
    epsgPoints.filter(epsgPoint => {
      epsgPoint.id = `${tsvCaminoExistence.etape}-${epsgPoint.id
        .split('-')
        .slice(-4)
        .join('-')}`
      epsgPoint.titrePointId = epsgPoint.id
        .split('-')
        .slice(0, -1)
        .join('-')
      pointsRefCamino.forEach(pointsNomCamino => {
        const pointExiste = pointsNomCamino.some((pointNomCamino, i) => {
          if (
            pointNomCamino
              .split('-')
              .slice(-4)
              .join('-') !==
            epsgPoint.id
              .split('-')
              .slice(-4)
              .join('-')
          )
            return false

          return true
        })
        return !pointExiste
      })
    })
  )
  return refPointsFiltered
}

const wgs84PointsSelection = (wgs84Points, tsvCaminoExistence) => {
  const pointsNomCamino = tsvCaminoExistence.pointsWgs84

  const wgs84PointsFiltered = wgs84Points.filter(wgs84Point => {
    if (tsvCaminoExistence.etape.length !== 0)
      wgs84Point.titre_etape_id = tsvCaminoExistence.etape
    wgs84Point.id = `${wgs84Point.titre_etape_id}-${wgs84Point.id
      .split('-')
      .slice(-3)
      .join('-')}`

    const pointExiste = pointsNomCamino.some((pointNomCamino, i) => {
      if (pointNomCamino !== wgs84Point.id) return false
    })
    return !pointExiste
  })
  return wgs84PointsFiltered
}

const objectDomaineWgs84Write = ({ wgs84Data, otherData, correct }) =>
  wgs84Data.coord.reduce((acc, coordXY, j) => {
    if (otherData.length === 0) return acc

    const {
      groupe,
      contour,
      point,
      jorfId,
      description,
      subsidiaire
    } = otherData[j]
    const titreEtapeId = wgs84Data.file.slice(0, -4)
    const id = `${titreEtapeId}-g${groupe.padStart(2, '0')}-c${contour.padStart(
      2,
      '0'
    )}-p${point.padStart(3, '0')}`
    const coordonnees = `${coordXY.x}|${coordXY.y}`
      .replace(',', '.')
      .replace('|', ',')
    if (coordonnees === 'NaN,NaN' && correct[j].correction === 'inversionEpsg')
      correct[j].correction = 'aCompleter'
    // const probleme = correct[j].correction
    const wgs84Point = {
      id,
      titre_etape_id: titreEtapeId,
      coordonnees,
      groupe,
      contour,
      point,
      nom: jorfId,
      description,
      subsidiaire
      // probleme
    }
    return [...acc, wgs84Point]
  }, [])

const objectDomaineRefWrite = ({ epsgData, otherData, correct }) =>
  epsgData.reduce((acc, epsgValue) => {
    const geoSystemeId = epsgValue.epsg
    if (!geoSystemeId) return acc

    const refPoints = epsgValue.coordRef.reduce((acc2, coordXY, j) => {
      const { groupe, contour, point } = otherData[j]
      const titrePointId = `${epsgValue.file.slice(0, -4)}-g${groupe.padStart(
        2,
        '0'
      )}-c${contour.padStart(2, '0')}-p${point.padStart(3, '0')}`
      const id = `${titrePointId}-${geoSystemeId}`
      const coordonnees = `${coordXY.x}|${coordXY.y}`
        .replace(',', '.')
        .replace('|', ',')
      if (
        coordonnees === 'NaN,NaN' &&
        correct[j].correction === 'inversionEpsg'
      )
        correct[j].correction = 'aCompleter'

      // const probleme = correct[j].correction
      const opposable = epsgValue.opposable
      const refPoint = {
        id,
        titre_point_id: titrePointId,
        geo_systeme_id: geoSystemeId,
        coordonnees,
        // probleme,
        opposable
      }
      return [...acc2, refPoint]
    }, [])
    return [...acc, refPoints]
  }, [])

const errorPriorityFind = errorArr => {
  // Si pas d'élément, on retourne le plus haut niveau de priorité
  if (errorArr[0] === undefined) return 5

  const priorityError = {
    inutilisable: 5,
    inversionEpsg: 4,
    aVerifier: 3,
    aCompleter: 2,
    inversionColonnes: 1,
    OK: 0
  }
  let prio = 0
  errorArr.map(row =>
    row.map(elem => {
      if (priorityError[elem[1]] > prio) {
        prio = priorityError[elem[1]]
      }
    })
  )
  return prio
}

const errorCheck = (fileName, data) => {
  const { epsgData, correct } = data[fileName]
  if (epsgData.length === 0) {
    return [correct.probleme, correct.correction]
  }

  const n = epsgData[0].coord.length
  return correct.reduce((acc, elem, i) => {
    let checkArr = []
    if (i % n === 0) checkArr = []

    const value = elem.correction
    if (!checkArr.includes(value)) {
      checkArr.push(value)
      return [...acc, [[elem.probleme, value]]]
    }
    return acc
  }, [])
}

const dataDomaineWrite = (data, resultsPath, titresCamino, domainesIds) => {
  const fileNames = Object.keys(data)
  const dataFiles = fileNames.reduce(
    (acc, fileName) => {
      const file = fileName.slice(0, -4)
      const error = errorCheck(fileName, data)
      const prio = errorPriorityFind(error)
      // On choisit la priorité maximale que l'on veut intégrer dans le csv
      // prio > 0 ne conserve que les tsv assurés d'etre correct
      // prio > 3 enleve les tsv que l'alogithme reconnait comme faux et ne crée pas leur geojson
      // prio > 5 garde tout
      if (prio > 3) return acc

      // On regarde si une étape existe pour ce tsv dans Camino
      const refPoints = objectDomaineRefWrite(data[fileName])
      const wgs84Points = objectDomaineWgs84Write(data[fileName])
      const tsvCaminoExistence = titreCorrespondance(
        file,
        titresCamino,
        wgs84Points,
        refPoints
      )
      acc.logCorrespondance.push(tsvCaminoExistence)
      // <!> A modifier si l'on ne veut ajouter que des tsv dont l'étape a été trouvé et ne contenant aucun point.
      // if (tsvCaminoExistence.etape.length === 0) return acc

      // Rajouter un check pour savoir si le point existe et si oui si il est identique
      const pointsRefSelect = refPointsSelection(refPoints, tsvCaminoExistence)
      const pointsWgs84Select = wgs84PointsSelection(
        wgs84Points,
        tsvCaminoExistence
      )
      if (pointsWgs84Select.length !== 0) acc.wgs84[file] = pointsWgs84Select
      if (pointsRefSelect.length !== 0) acc.ref[file] = pointsRefSelect

      return acc
    },
    { ref: {}, wgs84: {}, logCorrespondance: [] }
  )

  geojsonCsvTsvCreate(resultsPath, dataFiles)
  geojsonGlobalCreate(resultsPath, dataFiles.wgs84)
  const pointDomaine = pointDomaineCreate(dataFiles)
  if (Object.keys(pointDomaine).length !== 0) {
    fileDomaineCreate(domainesIds, resultsPath, pointDomaine)
  }
  return json2csv(dataFiles.logCorrespondance)
}

const epsgWrite = async (domainesIds, filesPath, titresCamino, dataInitial) =>
  dataDomaineWrite(
    dataInitial,
    path.join(filesPath, 'results'),
    titresCamino,
    domainesIds
  )

module.exports = epsgWrite
