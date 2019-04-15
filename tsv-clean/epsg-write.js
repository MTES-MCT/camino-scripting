/*
Fichier qui ecrit les titres miniers modifiés par epsg-modif
Il utilise 5 dossiers: OK, Inutilisable, A Completer, A verifier, Inversion degre XY
Il range aussi les titres dans chaque dossier dependant du log des erreurs
Il peut aussi créer un fichier csv contenant les erreurs
*/

const fs = require('fs')
const path = require('path')
const json2csv = require('json2csv').parse
const titreCorrespondance = require('./titres-correspondance')

const fileDomaineCreate = (domainesIds, filesPath, pointDomaine) => {
  domainesIds.forEach(domaineId => {
    const domaineObjet = pointDomaine[domaineId]
    const csvDomaineRef = json2csv(domaineObjet.ref)
    const csvDomaineWgs84 = json2csv(domaineObjet.wgs84)
    const pathDataRef = path.join(
      filesPath,
      `titres-${domaineId}-points-references.csv`
    )
    fs.writeFileSync(pathDataRef, csvDomaineRef, {
      flag: 'w+',
      encoding: 'UTF-8'
    })
    const pathDataWgs84 = path.join(filesPath, `titres-${domaineId}-points.csv`)
    fs.writeFileSync(pathDataWgs84, csvDomaineWgs84, {
      flag: 'w+',
      encoding: 'UTF-8'
    })
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
  const pointsRefCamino = tsvCaminoExistence.pointsReference
  const pointsCaminoNombre = pointsRefCamino.length
  if (pointsCaminoNombre === 0) return refPoints

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
    wgs84Point.titreEtapeId = tsvCaminoExistence.etape
    wgs84Point.id = `${wgs84Point.titreEtapeId}-${wgs84Point.id
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
    if (otherData.length == 0) return acc

    const { groupe, contour, point, jorfId } = otherData[j]
    const titreEtapeId = wgs84Data.file.slice(0, -4)
    const id = `${titreEtapeId}-g${groupe.padStart(2, '0')}-c${contour.padStart(
      2,
      '0'
    )}-p${point.padStart(3, '0')}`
    const coordonnees = `${coordXY.x}|${coordXY.y}`
      .replace(',', '.')
      .replace('|', ',')
    const probleme = correct[j].correction
    const wgs84Point = {
      id,
      coordonnees,
      groupe,
      contour,
      point,
      titreEtapeId,
      nom: jorfId
      //,probleme
    }
    return [...acc, wgs84Point]
  }, [])

const objectDomaineRefWrite = ({ epsgData, otherData, correct }) => {
  const n = epsgData.length
  return epsgData.reduce((acc, epsgValue, i) => {
    const geoSystemeId = epsgValue.epsg
    if (!geoSystemeId) return acc

    const refPoints = epsgValue.coord.reduce((acc2, coordXY, j) => {
      const { groupe, contour, point } = otherData[j]
      const titrePointId = `${epsgValue.file.slice(0, -4)}-g${groupe.padStart(
        2,
        '0'
      )}-c${contour.padStart(2, '0')}-p${point.padStart(3, '0')}`
      const id = `${titrePointId}-${geoSystemeId}`
      const coordonnees = `${coordXY.x}|${coordXY.y}`
        .replace(',', '.')
        .replace('|', ',')
      const probleme = correct[i * n + j].correction
      const refPoint = {
        id,
        titrePointId,
        geoSystemeId,
        coordonnees
        //,probleme
      }
      return [...acc2, refPoint]
    }, [])
    return [...acc, refPoints]
  }, [])
}

const errorPriorityFind = errorArr => {
  //Si pas d'élément, on retourne le plus haut niveau de priorité
  if (errorArr.length == 0) return 5

  const priorityError = {
    inutilisable: 5,
    inversionEpsg: 4,
    aCompleter: 3,
    aVerifier: 2,
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
  if (epsgData.length == 0) {
    return [correct.probleme, correct.correction]
  }

  const n = epsgData[0].coord.length
  return correct.reduce((acc, elem, i) => {
    let checkArr = []
    if (i % n == 0) checkArr = []
    const value = elem.correction
    if (!checkArr.includes(value)) {
      checkArr.push(value)
      return [...acc, [[elem.probleme, value]]]
    }
    return acc
  }, [])
}

const dataDomaineWrite = (data, filesPath, titresCamino, domainesIds) => {
  const fileNames = Object.keys(data)
  const dataFiles = fileNames.reduce(
    (acc, fileName) => {
      const file = fileName.slice(0, -4)
      const error = errorCheck(fileName, data)
      const prio = errorPriorityFind(error)
      //On choisit la priorité maximale que l'on veut intégrer dans le csv
      if (prio > 2) return acc

      //On regarde si une étape existe pour ce tsv dans Camino
      const refPoints = objectDomaineRefWrite(data[fileName])
      const wgs84Points = objectDomaineWgs84Write(data[fileName])
      const tsvCaminoExistence = titreCorrespondance(
        file,
        titresCamino,
        wgs84Points,
        refPoints
      )
      acc.logCorrespondance.push(tsvCaminoExistence)
      if (tsvCaminoExistence.etape.length === 0) return acc

      //Rajouter un check pour savoir si le point existe et si oui si il est identique
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
  const pointDomaine = pointDomaineCreate(dataFiles)
  if (Object.keys(pointDomaine).length != 0) {
    fileDomaineCreate(domainesIds, filesPath, pointDomaine)
  }
  return json2csv(dataFiles.logCorrespondance)
}

const epsgWrite = async (domainesIds, filesPath, titresCamino, dataInitial) =>
  dataDomaineWrite(dataInitial, filesPath, titresCamino, domainesIds)

module.exports = epsgWrite
