const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const data = JSON.parse(fs.readFileSync(`${filespath}data-final.json`, 'utf8'))

const errorCheck = fileName => {
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

const errorPriorityFind = errorArr => {
  //Si pas d'élément, on retourne le plus haut niveau de priorité
  if (errorArr.length == 0) return 5

  const priorityError = {
    inutilisable: 5,
    inversion: 4,
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

const fileWrite = (path, fileData, prio) => {
  const epsgData = fileData.epsgData
  let epsgListe = ''
  epsgData.map(epsgElem => {
    epsgListe += `\t${epsgElem.epsg}\t${epsgElem.epsg}`
  })
  const header = `groupe\tcontour\tpoint\tjorf_id\tdescription${epsgListe}`
  fs.writeFileSync(path, header, { flag: 'a+', encoding: 'UTF-8' })
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
      fs.appendFileSync(path, mess, { flag: 'a+', encoding: 'UTF-8' })
    }
  )
}

const dataWrite = data => {
  const fileNames = Object.keys(data)
  fileNames.map(fileName => {
    const error = errorCheck(fileName)
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
    const path = `${filespath}clean_data/${folder}/${fileName}`
    fileWrite(path, data[fileName], prio)
  })
}

dataWrite(data)
process.exit()
