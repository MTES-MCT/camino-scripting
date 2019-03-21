const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const data = JSON.parse(fs.readFileSync(`${filespath}dataFinal.json`, 'utf8'))

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
    Inutilisable: 5,
    Inversion: 4,
    aVerifier: 3,
    aCorriger: 2,
    Corrige: 1,
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
  const { groupe, contour, point, jorfId, description } = fileData.otherData
  const epsgData = fileData.epsgData
  let epsgListe = ''
  epsgData.map(epsgElem => {
    epsgListe += `\t${epsgElem.epsg}\t${epsgElem.epsg}`
  })
  header = `groupe\tcontour\tpoint\tjorf_id\tdescription${epsgListe}`
  fs.writeFileSync(path, header, 'UTF-8')
  //on regarde si il y a des données dans le fichier.
  if (groupe.indexOf(1) == -1) return

  const n = groupe.length
  for (j = 0; j < n; j++) {
    let mess = `\n${groupe[j]}\t${contour[j]}\t${point[j]}\t${jorfId[j]}\t${
      description[j]
    }`
    epsgData.map(epsgElem => {
      prio == 1
        ? (mess += `\t${epsgElem.coord[j].Y} +\t${epsgElem.coord[j].X}`)
        : (mess += `\t${epsgElem.coord[j].X} +\t${epsgElem.coord[j].Y}`)
    })
    fs.appendFileSync(path, mess, 'UTF-8', { flags: 'a+' })
  }
}

const dataWrite = () => {
  const fileNames = Object.keys(data)
  fileNames.map(fileName => {
    const error = errorCheck(fileName)
    const prio = errorPriorityFind(error)
    //console.log(k, fileName, error, prio)
    let folder = ''
    //On assigne un dossier différent ou stocker les données en fonction de leur ordre de priorité
    prio == 0
      ? (folder = 'OK')
      : prio == 1
      ? (folder = 'Corrige')
      : prio == 2
      ? (folder = 'aCompleter')
      : prio == 3
      ? (folder = 'aVerifier')
      : prio == 4
      ? (folder = 'InversionDegreXY')
      : (folder = 'Inutilisable')
    const path = `${filespath}clean_data/${folder}/${fileName.substring(2)}`
    fileWrite(path, data[fileName], prio)
  })
}

dataWrite()
process.exit()
