/*
Fichier qui ecrit les titres miniers modifiés par epsg-modif
Il utilise 5 dossiers: OK, Inutilisable, A Completer, A verifier, Inversion degre XY
Il range aussi les titres dans chaque dossier dependant du log des erreurs
Il peut aussi créer un fichier csv contenant les erreurs
*/

const fs = require('fs')
const path = require('path')
const json2csv = require('json2csv').parse

const fileWrite = (pathData, fileData, prio) => {
  const epsgData = fileData.epsgData
  let epsgListe = ''
  epsgData.map(epsgElem => {
    epsgListe += `\t${epsgElem.epsg}\t${epsgElem.epsg}`
  })
  const header = `groupe\tcontour\tpoint\tjorf_id\tdescription${epsgListe}`
  fs.writeFileSync(pathData, header, { flag: 'a+', encoding: 'UTF-8' })
  //on regarde si il y a des données dans le fichier.
  if (fileData.otherData.length == 0) return

  fileData.otherData.forEach(
    ({ groupe, contour, point, jorfId, description }, j) => {
      let mess = `\n${groupe}\t${contour}\t${point}\t${jorfId}\t${description}`

      epsgData.map(epsgElem => {
        typeof epsgElem.coord[j] == 'undefined'
          ? (mess += '')
          : prio == 1
          ? (mess += `\t${epsgElem.coord[j].y}\t${epsgElem.coord[j].x}`)
          : (mess += `\t${epsgElem.coord[j].x}\t${epsgElem.coord[j].y}`)
      })
      fs.appendFileSync(pathData, mess, { flag: 'a+', encoding: 'UTF-8' })
    }
  )
}

const dataWrite = (data, filesPath) => {
  const fileNames = Object.keys(data)
  const prioListe = fileNames.map(fileName => {
    const error = errorCheck(fileName, data)
    const prio = errorPriorityFind(error)
    let folder = ''
    //On assigne un dossier différent ou stocker les données en fonction de leur ordre de priorité
    prio == 0
      ? (folder = 'OK')
      : prio == 1
      ? (folder = 'corrige')
      : prio == 2
      ? (folder = 'a_completer')
      : prio == 3
      ? (folder = 'a_verifier')
      : prio == 4
      ? (folder = 'inversion_degre_XY')
      : (folder = 'inutilisable')
    const writePath = path.join(filesPath, 'clean_data/', folder, fileName)
    fileWrite(writePath, data[fileName], prio)
    return prio
  })
  return prioListe
}

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

const pointDomaineCreate = dataFiles => {
  return Object.keys(dataFiles.ref).reduce((acc, key) => {
    const domaineId = key[0]
    acc[domaineId] = acc[domaineId] || { ref: [], wgs84: [] }
    Object.keys(dataFiles.ref[key]).forEach(dataPoint => {
      acc[domaineId].ref.push(dataFiles.ref[key][dataPoint])
    })
    Object.keys(dataFiles.wgs84[key]).forEach(dataPoint => {
      acc[domaineId].wgs84.push(dataFiles.wgs84[key][dataPoint])
    })
    return acc
  }, {})
}

const objectDomaineWgs84Write = ({ wgs84Data, otherData, correct }) => {
  return wgs84Data.coord.reduce((acc, coordXY, j) => {
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
}

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
  const [epsgData, logError] = [data[fileName].epsgData, data[fileName].correct]
  if (epsgData.length == 0) {
    const errorArr = logError.map(elem => {
      return [elem[0], elem[1]]
    })
    return errorArr
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
    return [...acc]
  }, [])
}

const dataDomaineWrite = (data, filesPath, domainesIds) => {
  const fileNames = Object.keys(data)
  const dataFiles = fileNames.reduce(
    (acc, fileName) => {
      const file = fileName.substring(0, fileName.length - 4)
      const error = errorCheck(fileName, data)
      const prio = errorPriorityFind(error)
      //On choisit la priorité maximale que l'on veut intégrer dans le csv
      if (prio <= 5) {
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

const epsgWrite = async (domainesIds, filesPath, dataInitial) => {
  return dataDomaineWrite(dataInitial, filesPath, domainesIds)
}

module.exports = epsgWrite
