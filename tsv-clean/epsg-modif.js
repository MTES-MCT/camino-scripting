/*

Ce fichier prend en entrée les données créés par 'epsg-obtain.js'
Suite à cela, il modifie la donnée, et crée un log des erreurs
*/

const pb = {
  PAS_DE_PROBLEME: 'pas de probleme',
  A_COMPLETER: 'aCompleter',
  INVERSION_COLONNES: 'inversionColonnes',
  INUTILE: 'inutilisable',
  OK: 'OK',
  A_VERIFIER: 'aVerifier',
  MAUVAIS_EPSG: 'pas le bon epsg',
  INCOMPLET: 'donnee incomplete',
  INVERSION_EPSG: 'inversionEpsg',
  NO_DATA_WITH_DESC: 'description sans donnee',
  NO_DATA: 'pas de donnee',
  LATLON_INSTEAD_XY: 'X/Y au lieu de lat/lon',
  UNITE_DEGRE_RADIAN: "probleme d'unite grad/degre",
  XY_INSTEAD_LATLON: 'lat/lon au lieu de X/Y',
  PAS_DE_CONTOUR: 'pas de contour possible'
}

const fs = require('fs')
const path = require('path')
const filesPath = path.join(process.cwd(), 'files/')
const domainesIds = ['w', 'c', 'g', 'h', 'm']
const blockEpsg = JSON.parse(
  fs.readFileSync(path.join(filesPath, 'epsg-block2.json'), 'utf8')
)
const dataInitial = JSON.parse(
  fs.readFileSync(path.join(filesPath, 'data-tsv.json'), 'utf8')
)

const epsgModif = async (blockEpsg, dataInitial, domainesIds, filesPath) => {
  const domainesResults = await Promise.all(
    domainesIds.map(domaineId =>
      folderRead(domaineId, dataInitial, blockEpsg, filesPath)
    )
  )
  const [logs, datas] = logDataSeparate(domainesResults)
  return [logs, datas]
}

module.exports = epsgModif

const XYChange = coord => {
  return coord.replace(/ /g, '').replace(/,/g, '.')
}

const dmsToDec = angle => {
  //Check si il s'agit d'un angle en decimal ou en degre
  if (angle.indexOf('°') == -1)
    return parseFloat(angle.replace(/,/g, '.').replace(/ /g, ''))

  const latSep = angle.split('°')
  let deg = parseFloat(latSep[0])
  let min = parseFloat(latSep[1].split("'")[0])
  //differentes possibilités d'ecrire un angle seconde, donc on les teste
  let sec = parseFloat(
    angle
      .split('°')[1]
      .replace(',', "'")
      .split("'")[1]
  )
  //au cas ou le fichier n'a pas d'angle seconde
  if (isNaN(sec)) {
    sec = 0
  }
  //On applique une addition différente en fonction de la positivité de l'angle
  const dec =
    deg < 0 ? deg - min / 60 - sec / 3600 : deg + min / 60 + sec / 3600
  return dec
}

const decToDms = angle => {
  let deg = Math.floor(angle)
  if (isNaN(deg)) return ''

  const minFloat = (angle - deg) * 60
  let min = Math.floor(minFloat)
  const secFloat = (minFloat - min) * 60
  let sec = Math.round(secFloat)
  if (sec == 60) {
    min++
    sec = 0
  }
  if (min >= 60) {
    deg < 0 ? deg-- : deg++
    min = min - 60
  }
  if (deg < 0) {
    deg++
    min = 59 - min
    sec = 60 - sec
  }
  const dms = `${deg}°${min}'${sec}"'`
  return dms.replace(/ /g, '')
}

const inverseCheck = ({ x, y }, { x1, x2, y1, y2 }, fonction) => {
  // A est un entier qui peut retourner 4 valeurs différentes: 0, 0.5, 1, 1.5
  // chacune de ses valeurs a un sens différent.
  //0: pas de données
  //0.5: donnée semble correcte
  //1: inversion colonnes
  //1.5: mauvais epsg
  let inverseValue = 0
  //Ici, on check si le point n'est pas dans les bordures de l'epsg
  if (
    fonction(x1) >= parseFloat(x) ||
    fonction(x2) <= parseFloat(x) ||
    fonction(y1) >= parseFloat(y) ||
    fonction(y2) <= parseFloat(y)
  ) {
    inverseValue += 1
  }
  //Ici, on check si le point en YX n'est pas dans les bordures de l'epsg
  if (
    fonction(x1) >= parseFloat(y) ||
    fonction(x2) <= parseFloat(y) ||
    fonction(y1) >= parseFloat(x) ||
    fonction(y2) <= parseFloat(x)
  ) {
    inverseValue += 0.5
  }
  return inverseValue
}

const XYLatLonCheck = ({ x, y }, XYSuppose) => {
  if (typeof x == 'undefined' || typeof y == 'undefined') return true

  //Si le XY suppose est un angle, alors XYSuppose vaut false. Coord planes, XYSuppose vaut true
  if (XYSuppose) {
    const [coordX, coordY] = [parseFloat(x), parseFloat(y)]
    //On regarde si il manque au moins une des deux valeurs
    if (isNaN(coordX)) return -180 < coordY && coordY < 180

    if (isNaN(coordY)) return -180 < coordX && coordX < 180

    //Les valeurs planes sont suffisament élevés pour qu'une valeur inférieure à 10000 soit fausse
    return !(-180 < coordX && x < 180 && -180 < coordY && coordY < 180)
  }
  let [lat, lon] = [0, 0]
  //Formate les angles pour enlever les espaces
  x.indexOf(' ') == -1
    ? (lat = parseFloat(x))
    : (lat = parseFloat(x.replace(/ /g, '')))

  y.indexOf(' ') == -1
    ? (lon = parseFloat(y))
    : (lon = parseFloat(y.replace(/ /g, '')))

  if (isNaN(lat)) return 200 < lon || lon < -200

  if (isNaN(lon)) return 200 < lat || lat < -200

  return !(200 < lat || 200 < lon || lat < -200 || lon < -200)
}

const dataAdd = (filename, epsg, probleme, correction) => {
  return [[filename, epsg, probleme], [probleme, correction]]
}

const choiceDataToAdd = (file, epsg, { x, y }, epsgBound, description) => {
  // On ecrit dans les logs
  let tableauLog = []
  const inverseValue = inverseCheck({ x, y }, epsgBound, parseFloat)
  //Je veux determiner si j'ai un moyen de determiner que l'epsg 4807 est un point automatique ou non... Mais j'en trouve pas
  /*if (epsg == '4807') {
    console.log(file, inverseValue)
  }*/
  switch (inverseValue) {
    case 0:
      description != null && description.length != 0
        ? (tableauLog = dataAdd(
            file,
            epsg,
            pb.NO_DATA_WITH_DESC,
            pb.A_COMPLETER
          ))
        : (tableauLog = dataAdd(file, epsg, pb.NO_DATA, pb.INUTILE))
      break
    case 1:
      tableauLog = dataAdd(file, epsg, pb.INVERSION_COLONNES, pb.OK)
      break
    case 0.5:
      tableauLog = dataAdd(file, epsg, pb.PAS_DE_PROBLEME, pb.OK)
      break
    case 1.5:
      epsg == '4807'
        ? inverseCheck(
            { x, y },
            {
              x1: '-8°0\'25"',
              y1: '45°53\'20"',
              x2: '8°6\'13"',
              y2: '56°49\'20"'
            },
            dmsToDec
          ) == 0.5
          ? (tableauLog = dataAdd(
              file,
              epsg,
              pb.UNITE_DEGRE_RADIAN,
              pb.A_VERIFIER
            ))
          : (tableauLog = dataAdd(file, epsg, pb.MAUVAIS_EPSG, pb.A_VERIFIER))
        : (tableauLog = dataAdd(file, epsg, pb.MAUVAIS_EPSG, pb.A_VERIFIER))
      break
  }
  return tableauLog
}

const coordModif = (
  { x, y },
  epsgBound,
  file,
  epsg,
  description,
  XYSuppose
) => {
  if (typeof x == 'undefined') x = ''
  if (typeof y == 'undefined') y = ''

  if (!XYSuppose) {
    x = dmsToDec(x)
    y = dmsToDec(y)
    if (isNaN(x)) x = ''
    if (isNaN(y)) y = ''
  } else {
    x = XYChange(x)
    y = XYChange(y)
  }

  //Si il y a une donnee manquante
  if (x == '' || y == '') {
    let tableauLog = []
    description != null && description.length != 0
      ? (tableauLog = dataAdd(file, epsg, pb.NO_DATA_WITH_DESC, pb.A_COMPLETER))
      : (tableauLog = dataAdd(file, epsg, pb.INCOMPLET, pb.INUTILE))
    return [tableauLog, { x, y }]
  }
  const tableauLog = choiceDataToAdd(
    file,
    epsg,
    { x, y },
    epsgBound,
    description
  )
  /*
  if (!XYSuppose) {
    x = decToDms(x)
    y = decToDms(y)
  }*/
  return [tableauLog, { x, y }]
}

const obtainLogs = (filePath, dataInitial, epsgBlock) => {
  const { epsgData, otherData } = dataInitial[filePath]
  const descriptionListe = otherData.map(otherElem => otherElem.description)
  const epsg = epsgData.epsg
  let tableauLog = []
  //Check si la description de tout les points est disponible
  const count = descriptionListe.filter(A => A).length

  if (descriptionListe.length <= 2 && descriptionListe.length != 0) {
    tableauLog.push([
      dataAdd(filePath, epsg, pb.PAS_DE_CONTOUR, pb.INUTILE),
      {}
    ])
    return [tableauLog]
  }
  if (epsgData.length == 0) {
    count != 0 && count >= descriptionListe.length - 1
      ? tableauLog.push([
          dataAdd(filePath, epsg, pb.NO_DATA_WITH_DESC, pb.A_COMPLETER),
          {}
        ])
      : tableauLog.push([dataAdd(filePath, epsg, pb.NO_DATA, pb.INUTILE), {}])
    return [tableauLog]
  }
  return logCreate(epsgData, descriptionListe, filePath, epsgBlock)
}

const logCreate = (epsgData, descriptionListe, filePath, epsgBlock) => {
  return epsgData.reduce((acc, { epsg, coord }) => {
    let tableauLog = []
    const epsgBound = epsgBlock[epsg].coord
    const projectionType = epsgBlock[epsg].projected == 'Y'
    coord.map(({ x, y }, j) => {
      XYLatLonCheck({ x, y }, projectionType)
        ? tableauLog.push(
            coordModif(
              { x, y },
              epsgBound,
              filePath,
              epsg,
              descriptionListe[j],
              projectionType
            )
          )
        : tableauLog.push([
            dataAdd(
              filePath,
              epsg,
              projectionType ? pb.XY_INSTEAD_LATLON : pb.LATLON_INSTEAD_XY,
              pb.INVERSION_EPSG
            ),
            { x, y }
          ])
    })
    return [...acc, tableauLog]
  }, [])
}

const logToData = (filePath, tableauLogs, dataInitial) => {
  //tableauLogs = [pour chaque epsg: [[[liste des log à implémenter dans les logs], [liste des corrections à implémenter dans la donnée]], datas à remettre]]
  let logs = []
  let datas = {
    epsgData: [],
    otherData: dataInitial[filePath].otherData,
    correct: []
  }
  tableauLogs.map(tableauLog => {
    datas.epsgData.push({
      file: filePath,
      //On va chercher l'epsg du fichier, qui est donné dans les logs du fichier
      epsg: tableauLog[0][0][0][1],
      coord: []
    })
    tableauLog.map(tableau => {
      logs.push(tableau[0][0])
      datas.correct.push(tableau[0][1])
      datas.epsgData[datas.epsgData.length - 1].coord.push(tableau[1])
    })
  })
  return [logs, datas]
}

const folderRead = (domaineId, dataInitial, epsgBlock, filesPath) => {
  const fileName = path.join(filesPath, domaineId)
  const files = fs.readdirSync(fileName)
  return files.map(file =>
    logToData(file, obtainLogs(file, dataInitial, epsgBlock), dataInitial)
  )
}

const arrayToCsv = (entree, sortie) => {
  //cree a partir d'un fichier de log un csv pouvant etre importe dans google sheets
  const arr = JSON.parse(fs.readFileSync(path.join(filesPath, entree), 'utf8'))
  const header = 'nom du fichier,epsg,probleme\n'
  fs.writeFileSync(path.join(filesPath, sortie), header, {
    flag: 'w+',
    encoding: 'UTF-8'
  })
  arr.map(mat => {
    let mess = ''
    //Si il n'y a pas d'epsg dans le fichier
    mat[1] == null
      ? (mess += `${mat[0]},,${mat[2]}\n`)
      : (mess += `${mat[0]},${mat[1]},${mat[2]}\n`)

    fs.appendFileSync(path.join(filesPath, sortie), mess, {
      flag: 'a+',
      encoding: 'UTF-8'
    })
  })
}

const logDataSeparate = results => {
  let logs = []
  let datas = {}
  results.map(domaine => {
    domaine.map(dataDomaine => {
      const filePath = dataDomaine[0][0][0]
      logs = [...logs, ...dataDomaine[0].map(log => log)]
      datas[filePath] = dataDomaine[1]
    })
  })
  return [logs, datas]
}
/*
const domainesResults = domainesIds.map(domaineId =>
  folderRead(domaineId, dataInitial, blockEpsg)
)
const [logs, datas] = logDataSeparate(domainesResults)

fs.writeFileSync(path.join(filesPath}log-error.json`, JSON.stringify(logs))
fs.writeFileSync(path.join(filesPath}data-final.json`, JSON.stringify(datas))
console.log(logs.length)
arrayToCsv('log-error.json', 'logs-probleme.csv')
process.exit()*/
