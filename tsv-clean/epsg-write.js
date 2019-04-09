/*
Fichier qui ecrit les titres miniers modifiés par epsg-modif
Il utilise 5 dossiers: OK, Inutilisable, A Completer, A verifier, Inversion degre XY
Il range aussi les titres dans chaque dossier dependant du log des erreurs
Il peut aussi créer un fichier csv contenant les erreurs
*/

const fs = require('fs')
const path = require('path')
const json2csv = require('json2csv').parse

const fileDomaineCreate = (pointDomaine, filesPath, domainesIds) => {
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
      ...Object.keys(dataFiles.ref[key]).reduce(
        (acc, dataPoint) => [...acc, dataFiles.ref[key][dataPoint]],
        []
      )
    ]
    acc[domaineId].wgs84 = [
      ...acc[domaineId].wgs84,
      ...Object.keys(dataFiles.wgs84[key]).reduce(
        (acc, dataPoint) => [...acc, dataFiles.wgs84[key][dataPoint]],
        []
      )
    ]
    return acc
  }, {})

const objectDomaineWgs84Write = ({ wgs84Data, otherData, correct }) =>
  wgs84Data.coord.reduce((acc, coordXY, j) => {
    if (otherData.length == 0) return acc

    const { groupe, contour, point, jorfId } = otherData[j]
    const titreEtapeId = wgs84Data.file.substring(0, wgs84Data.file.length - 4)
    const id = `${titreEtapeId}-g${groupe.padStart(2, '0')}-c${contour.padStart(
      2,
      '0'
    )}-p${point.padStart(3, '0')}`
    const coordonnee = `${coordXY.x},${coordXY.y}`
    const probleme = correct[j].correction
    acc[id] = {
      id,
      coordonnee,
      groupe,
      contour,
      point,
      titreEtapeId,
      nom: jorfId,
      probleme
    }
    return acc
  }, {})

const objectDomaineRefWrite = ({ epsgData, otherData, correct }) => {
  const n = epsgData.length
  return epsgData.reduce((acc, epsgValue, i) => {
    const geoSystemeId = epsgValue.epsg
    if (!geoSystemeId) return acc

    epsgValue.coord.forEach((coordXY, j) => {
      const { groupe, contour, point } = otherData[j]
      const titrePointId = `${epsgValue.file.substring(
        0,
        epsgValue.file.length - 4
      )}-g${groupe.padStart(2, '0')}-c${contour.padStart(
        2,
        '0'
      )}-p${point.padStart(3, '0')}`
      const id = `${titrePointId}-${geoSystemeId}`
      const coordonnee = `${coordXY.x},${coordXY.y}`
      const probleme = correct[i * n + j].correction
      acc[id] = {
        id,
        titrePointId,
        geoSystemeId,
        coordonnee,
        probleme
      }
    })
    return acc
  }, {})
}

const errorPriorityFind = errorArr => {
  //Si pas d'élément, on retourne le plus haut niveau de priorité
  if (errorArr.length == 0) return 5

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
  const { epsgData, correct: logError } = data[fileName]
  if (epsgData.length == 0) {
    return logError.map(elem => elem.slice(0, 2))
  }

  const n = epsgData[0].coord.length
  return logError.reduce((acc, elem, i) => {
    let checkArr = []
    if (i % n == 0) checkArr = []
    const value = elem[1]
    if (!checkArr.includes(value)) {
      checkArr.push(value)
      return [...acc, [[elem[0], value]]]
    }
    return acc
  }, [])
}

const dataDomaineWrite = (data, filesPath, domainesIds) => {
  const fileNames = Object.keys(data)
  const dataFiles = fileNames.reduce(
    (acc, fileName) => {
      const file = fileName.slice(0, -4)
      const error = errorCheck(fileName, data)
      const prio = errorPriorityFind(error)
      //On choisit la priorité maximale que l'on veut intégrer dans le csv
      if (prio <= 1) {
        acc.ref[file] = objectDomaineRefWrite(data[fileName])
        acc.wgs84[file] = objectDomaineWgs84Write(data[fileName])
      }
      return acc
    },
    { ref: {}, wgs84: {} }
  )
  const pointDomaine = pointDomaineCreate(dataFiles)
  if (Object.keys(pointDomaine).length != 0) {
    fileDomaineCreate(pointDomaine, filesPath, domainesIds)
  }
  return dataFiles.wgs84
}

const epsgWrite = async (domainesIds, filesPath, dataInitial) =>
  dataDomaineWrite(dataInitial, filesPath, domainesIds)

module.exports = epsgWrite
