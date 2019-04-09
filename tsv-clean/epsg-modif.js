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
  PAS_DE_CONTOUR: 'pas de contour possible',
  PAS_DE_COHERENCE: "pas de coherences d'epsg",
  MISSING_DESC: 'manque de description'
}

const fs = require('fs')
const path = require('path')
const proj4 = require('proj4')

const proj4EpsgDefine = () => {
  proj4.defs([
    [
      'EPSG:4326',
      '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
    ],
    [
      'EPSG:27571',
      '+proj=lcc +lat_1=49.50000000000001 +lat_0=49.50000000000001 +lon_0=0 +k_0=0.999877341 +x_0=600000 +y_0=1200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    [
      'EPSG:2971',
      '+proj=utm + zone=22 + ellps=intl + towgs84=-186, 230, 110, 0, 0, 0, 0 + units=m + no_defs'
    ],
    [
      'EPSG:27561',
      '+proj=lcc +lat_1=49.50000000000001 +lat_0=49.50000000000001 +lon_0=0 +k_0=0.999877341 +x_0=600000 +y_0=200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    ['EPSG:4171', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs'],
    [
      'EPSG:2154',
      '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ],
    ['EPSG:32630', '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs'],
    ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs'],
    ['EPSG:32622', '+proj=utm +zone=22 +datum=WGS84 +units=m +no_defs'],
    [
      'EPSG:3949',
      '+proj=lcc +lat_1=48.25 +lat_2=49.75 +lat_0=49 +lon_0=3 +x_0=1700000 +y_0=8200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ],
    [
      'EPSG:27573',
      '+proj=lcc +lat_1=44.10000000000001 +lat_0=44.10000000000001 +lon_0=0 +k_0=0.999877499 +x_0=600000 +y_0=3200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    [
      'EPSG:2972',
      '+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ],
    [
      'EPSG:4275',
      '+proj=longlat +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +no_defs'
    ],
    [
      'EPSG:27572',
      '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    [
      'EPSG:4230',
      '+proj=longlat +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +no_defs'
    ],
    [
      'EPSG:4807',
      '+proj=longlat +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +no_defs'
    ],
    [
      'EPSG:27562',
      '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    [
      'EPSG:27563',
      '+proj=lcc +lat_1=44.10000000000001 +lat_0=44.10000000000001 +lon_0=0 +k_0=0.999877499 +x_0=600000 +y_0=200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ]
  ])
}

const logDataSeparate = results =>
  results.reduce(
    (acc, domaine) => {
      domaine.forEach(dataDomaine => {
        const fileName = dataDomaine.logs[0].fileName
        acc.tsvDatasCleaned[fileName] = dataDomaine.datas
        acc.logsCleaning = [
          ...acc.logsCleaning,
          ...dataDomaine.logs.map(log => log)
        ]
      })
      return acc
    },
    { logsCleaning: [], tsvDatasCleaned: {} }
  )

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

function epsgPointCheck(coord1, coord2) {
  var R = 6371 // Radius of the earth in km
  var dLat = deg2rad(coord2.x - coord2.x) // deg2rad below
  var dLon = deg2rad(coord2.y - coord2.y)
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.x)) *
      Math.cos(deg2rad(coord2.x)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c // Distance in km
  return d < 20
}

const gradtodeg = rad => {
  return rad * 0.9
}

const gradCoordChange = ({ x, y }) => {
  return { x: gradtodeg(x), y: gradtodeg(y) }
}

const epsgDifferenceVerif = (fileName, epsgData, correct) => {
  const nbPoints = correct.length / epsgData.length
  //On parcoure tout les points de chaque epsg en meme temps
  let wgs84Data = []
  for (let i = 0; i < nbPoints; i++) {
    const wgs84Points = epsgData.reduce((acc, epsgElem) => {
      const [epsg, coord] = [epsgElem.epsg, epsgElem.coord[i]]
      if (typeof epsg == 'undefined' || isNaN(coord.x) || isNaN(coord.y))
        return [...acc, { x: '', y: '' }]

      const wgs84Point =
        epsg == 4807
          ? proj4(
              `EPSG:${epsg}`,
              'EPSG:4326',
              gradCoordChange(Object.assign({}, coord))
            )
          : proj4(`EPSG:${epsg}`, 'EPSG:4326', Object.assign({}, coord))
      return [...acc, wgs84Point]
    }, [])
    //On verifie pour chaque ensemble de points si ils sont cohérents les uns avec les autres, aka distance de moins de 20m
    wgs84Points.forEach(coord1 => {
      wgs84Points.forEach(coord2 => {
        if (
          !epsgPointCheck(coord1, coord2) &&
          !(isNaN(coord1.x) || isNaN(coord1.y))
        ) {
          correct[i] = [pb.PAS_DE_COHERENCE, pb.A_VERIFIER]
        }
      })
    })
    wgs84Data.push(wgs84Points[wgs84Points.length - 1])
  }
  return wgs84Data
}

const logToData = (dataInitial, fileName, tableauLogs) => {
  //tableauLogs = [pour chaque epsg: [[[liste des log à implémenter dans les logs], [liste des corrections à implémenter dans la donnée]], datas à remettre]]
  let logs = []
  let datas = {
    epsgData: [],
    otherData: dataInitial[fileName].otherData,
    correct: []
  }
  tableauLogs.map(tableauLog => {
    //On va chercher l'epsg du fichier, qui est donné dans les logs du fichier
    const epsgCoord = tableauLog[0].log.epsg
    datas.epsgData.push({
      file: fileName,
      epsg: epsgCoord,
      coord: []
    })
    tableauLog.map(tableau => {
      logs.push(tableau.log)
      datas.correct.push(tableau.correct)
      const coord = {
        x: parseFloat(tableau.coord.x),
        y: parseFloat(tableau.coord.y)
      }
      datas.epsgData[datas.epsgData.length - 1].coord.push(coord)
    })
    datas['wgs84Data'] = {
      file: fileName,
      coord: epsgDifferenceVerif(fileName, datas.epsgData, datas.correct)
    }
  })
  return { logs, datas }
}

const inverseCheck = ({ x, y }, { x1, x2, y1, y2 }, fonction) => {
  // A est un entier qui peut retourner 4 valeurs différentes: 0, 0.5, 1, 1.5
  // chacune de ses valeurs a un sens différent.
  //0: la donnée semble correcte, possibilité d'interversion de colonnes
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

const choiceDataToAdd = (file, epsg, { x, y }, epsgBound, description) => {
  // On ecrit dans les logs
  let tableauLog = {}
  const inverseValue = inverseCheck({ x, y }, epsgBound, parseFloat)
  switch (inverseValue) {
    case 0:
      tableauLog = dataAdd(file, epsg, pb.PAS_DE_PROBLEME, pb.OK, { x, y })
      break
    case 1:
      tableauLog = dataAdd(file, epsg, pb.INVERSION_COLONNES, pb.OK, { x, y })
      break
    case 0.5:
      tableauLog = dataAdd(file, epsg, pb.PAS_DE_PROBLEME, pb.OK, { x, y })
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
              pb.A_VERIFIER,
              {
                x,
                y
              }
            ))
          : (tableauLog = dataAdd(file, epsg, pb.MAUVAIS_EPSG, pb.A_VERIFIER, {
              x,
              y
            }))
        : (tableauLog = dataAdd(file, epsg, pb.MAUVAIS_EPSG, pb.A_VERIFIER, {
            x,
            y
          }))
      break
  }
  return tableauLog
}

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

const coordModif = (
  { x, y },
  epsgBound,
  file,
  epsg,
  description,
  isEpsgProjectionCorrect
) => {
  if (typeof x == 'undefined') x = ''
  if (typeof y == 'undefined') y = ''

  if (!isEpsgProjectionCorrect) {
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
    return description != null && description.length != 0
      ? dataAdd(file, epsg, pb.NO_DATA_WITH_DESC, pb.A_COMPLETER, { x, y })
      : dataAdd(file, epsg, pb.INCOMPLET, pb.INUTILE, { x, y })
  }

  const tableauLog = choiceDataToAdd(
    file,
    epsg,
    { x, y },
    epsgBound,
    description
  )
  return tableauLog
}

const XYLatLonCheck = ({ x, y }, isEpsgProjectionCorrect) => {
  if (typeof x == 'undefined' || typeof y == 'undefined') return true

  //Si le XY suppose est un angle, alors isEpsgProjectionCorrect vaut false. Coord planes, isEpsgProjectionCorrect vaut true
  if (isEpsgProjectionCorrect) {
    const [coordX, coordY] = [parseFloat(x), parseFloat(y)]
    //On regarde si il manque au moins une des deux valeurs
    if (isNaN(coordX)) return -180 < coordY && coordY < 180

    if (isNaN(coordY)) return -180 < coordX && coordX < 180

    //Les valeurs planes sont suffisament élevés pour qu'une valeur inférieure à 10000 soit fausse
    return !(-180 < coordX && x < 180 && -180 < coordY && coordY < 180)
  }
  let [lat, lon] = [0, 0]
  //Formate les angles pour enlever les espaces si il y en a
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

const logCreate = (epsgData, descriptionListe, filePath, epsgContours) => {
  return epsgData.reduce((acc, { epsg, coord }) => {
    let tableauLog = []
    const epsgBound = epsgContours[epsg].coord
    const isEpsgProjected = epsgContours[epsg].projected
    coord.map(({ x, y }, j) => {
      XYLatLonCheck({ x, y }, isEpsgProjected)
        ? tableauLog.push(
            coordModif(
              { x, y },
              epsgBound,
              filePath,
              epsg,
              descriptionListe[j],
              isEpsgProjected
            )
          )
        : tableauLog.push(
            dataAdd(
              filePath,
              epsg,
              isEpsgProjected ? pb.XY_INSTEAD_LATLON : pb.LATLON_INSTEAD_XY,
              pb.INVERSION_EPSG,
              { x, y }
            )
          )
    })
    return [...acc, tableauLog]
  }, [])
}

const dataAdd = (fileName, epsg, probleme, correction, coordonnees) => {
  return {
    log: { fileName, epsg, probleme },
    correct: { probleme, correction },
    coord: coordonnees
  }
}

const obtainLogs = (epsgContours, dataInitial, filePath) => {
  const { epsgData, otherData } = dataInitial[filePath]
  const descriptionListe = otherData.map(otherElem => otherElem.description)
  const epsg = epsgData.epsg
  let tableauLog = []

  const lignesLength = descriptionListe.length
  if (lignesLength === 0)
    tableauLog.push([dataAdd(filePath, epsg, pb.NO_DATA, pb.INUTILE, {})])

  if (lignesLength === 1 || lignesLength === 2) {
    tableauLog.push([
      dataAdd(filePath, epsg, pb.PAS_DE_CONTOUR, pb.INUTILE, {})
    ])
    return tableauLog
  }

  //Check si la description de tout les points est disponible
  const descriptionsLength = descriptionListe.filter(A => A).length
  if (epsgData.length == 0) {
    descriptionsLength != 0 && descriptionsLength >= lignesLength - 1
      ? tableauLog.push([
          dataAdd(filePath, epsg, pb.NO_DATA_WITH_DESC, pb.A_COMPLETER, {})
        ])
      : tableauLog.push([
          dataAdd(filePath, epsg, pb.MISSING_DESC, pb.INUTILE, {})
        ])
    return tableauLog
  }
  return logCreate(epsgData, descriptionListe, filePath, epsgContours)
}

const folderRead = (filesFolderPath, epsgContours, dataInitial, domaineId) => {
  const filePath = path.join(filesFolderPath, domaineId)
  const filesNameList = fs.readdirSync(filePath)
  return filesNameList.map(fileName =>
    logToData(
      dataInitial,
      fileName,
      obtainLogs(epsgContours, dataInitial, fileName)
    )
  )
}

const epsgModif = async (
  domainesIds,
  filesFolderPath,
  epsgContours,
  dataInitial
) => {
  proj4EpsgDefine()

  const domainesResults = await Promise.all(
    domainesIds.map(domaineId =>
      folderRead(filesFolderPath, epsgContours, dataInitial, domaineId)
    )
  )
  return logDataSeparate(domainesResults)
}

module.exports = epsgModif
