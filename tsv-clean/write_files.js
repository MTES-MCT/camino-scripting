const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const data = JSON.parse(fs.readFileSync(`${filespath}data_final.json`, 'utf8'))

const check_error = fileName => {
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

const find_error_priority = errorArr => {
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

const write_file = (path, fileData, prio) => {
  const { groupe, contour, point, jorfId, description } = fileData.otherData
  const epsgData = fileData.epsgData
  let epsgListe = ''
  epsgData.map(epsgElem => {
    epsgListe += `\t${epsgElem.epsg}\t${epsgElem.epsg}`
  })
  header = `groupe\tcontour\tpoint\tjorf_id\tdescription${epsgListe}`
  fs.writeFileSync(path, header, 'UTF-8')
  if (groupe.indexOf(1) == -1) return

  const n = groupe.length
  for (j = 0; j < n; j++) {
    let mess = `\n${groupe[j]}\t${contour[j]}\t${point[j]}\t${jorf_id[j]}\t${
      description[j]
    }`
    epsgData.map(epsgElem => {
      if (prio == 1) {
        mess += `\t${epsgElem.coord[j].Y} +\t${epsgElem.coord[j].X}`
      } else {
        mess += `\t${epsgElem.coord[j].X} +\t${epsgElem.coord[j].Y}`
      }
    })
    fs.appendFileSync(path, mess, 'UTF-8', { flags: 'a+' })
  }
}

const write_data = () => {
  const fileNames = Object.keys(data)
  fileNames.map(fileName => {
    const error = check_error(fileName)
    const prio = find_error_priority(error)
    //console.log(k, fileName, error, prio)
    if (prio == 0) path = `${filespath}clean_data/OK/${fileName.substring(2)}`
    else if (prio == 1)
      path = `${filespath}clean_data/Corrige/${fileName.substring(2)}`
    else if (prio == 2)
      path = `${filespath}clean_data/A completer/${fileName.substring(2)}`
    else if (prio == 3)
      path = `${filespath}clean_data/A verifier/${fileName.substring(2)}`
    else if (prio == 4)
      path = `${filespath}clean_data/Inversion_degre_XY/${fileName.substring(
        2
      )}`
    else if (prio == 5)
      path = `${filespath}clean_data/Inutilisable/${fileName.substring(2)}`
    write_file(path, data[fileName], prio)
  })
}

write_data()
process.exit()
