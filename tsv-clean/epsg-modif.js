/*

Ce fichier prend en entrée les données créés par 'epsg-obtain.js'
Suite à cela, il modifie la donnée, et crée un log des erreurs
*/

const fs = require('fs')
const path = require('path')
const proj4 = require('proj4')

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

const LETTRES_DEGRE = ['E', 'N', 'e', 'n', 'W', 'S', 'O', 'w', 's', 'o']

const proj4EpsgDefine = () => {
  proj4.defs([
    ['EPSG:4624', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs'],
    [
      'EPSG:4326',
      '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
    ],
    [
      'EPSG:7421',
      '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +vunits=m +no_defs'
    ],
    [
      'EPSG:27571',
      '+proj=lcc +lat_1=49.50000000000001 +lat_0=49.50000000000001 +lon_0=0 +k_0=0.999877341 +x_0=600000 +y_0=1200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs'
    ],
    [
      'EPSG:2975',
      '+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
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
    ['EPSG:32621', '+proj=utm +zone=21 +datum=WGS84 +units=m +no_defs'],
    ['EPSG:32620', '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs'],
    ['EPSG:2970', '+proj=utm +zone=20 +units=m +no_defs'],
    [
      'EPSG:5490',
      '+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ],
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
        const fileName = dataDomaine.datas.wgs84Data.file
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

const deg2rad = deg => {
  return deg * (Math.PI / 180)
}

const epsgPointCheck = (coord1, coord2) => {
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
  // On parcoure tout les points de chaque epsg en meme temps
  let wgs84Data = []
  for (let i = 0; i < nbPoints; i++) {
    const wgs84Points = epsgData.reduce((acc, epsgElem) => {
      const [epsg, coord] = [epsgElem.epsg, epsgElem.coord[i]]

      if (typeof epsg === 'undefined' || isNaN(coord.x) || isNaN(coord.y)) {
        acc.push({ x: '', y: '' })

        return acc
      }

      try {
        const wgs84Point =
          epsg === '4807'
            ? proj4(
                `EPSG:${epsg}`,
                'EPSG:4326',
                gradCoordChange(Object.assign({}, coord))
              )
            : proj4(`EPSG:${epsg}`, 'EPSG:4326', Object.assign({}, coord))

        acc.push(wgs84Point)

        return acc
      } catch (e) {
        throw new Error(`Erreur proj4 : ${e}`)
      }
    }, [])

    // On verifie pour chaque ensemble de points
    // s'ils sont cohérents les uns avec les autres (distance < 20m)
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
  // tableauLogs = [pour chaque epsg: [[[liste des log à implémenter dans les logs], [liste des corrections à implémenter dans la donnée]], datas à remettre]]
  let logs = []
  let datas = {
    epsgData: [],
    otherData: dataInitial[fileName].otherData,
    correct: []
  }

  if (tableauLogs[0].data !== undefined) {
    tableauLogs.forEach(tableauLog => {
      // On va chercher l'epsg du fichier, qui est donné dans les logs du fichier
      const epsgCoord = tableauLog.data[0].log.epsg

      datas.epsgData.push({
        file: fileName,
        epsg: epsgCoord,
        coord: [],
        coordRef: [],
        opposable: tableauLog.opposable
      })

      tableauLog.data.forEach(tableau => {
        logs.push(tableau.log)

        datas.correct.push(tableau.correct)

        const coord = {
          x: parseFloat(tableau.coord.x),
          y: parseFloat(tableau.coord.y)
        }

        const epsgData = datas.epsgData[datas.epsgData.length - 1]

        epsgData.coord.push(coord)
        console.log(tableau.coordRef)

        let { x, y } = tableau.coordRef
        x = dmsToDec(x)
        y = dmsToDec(y)
        epsgData.coordRef.push({ x, y })
      })

      if (!tableauLog.opposable) return

      datas['wgs84Data'] = {
        file: fileName,
        coord: epsgDifferenceVerif(fileName, datas.epsgData, datas.correct)
      }
    })
  }

  if (datas.wgs84Data === undefined) {
    datas['wgs84Data'] = {
      file: fileName,
      coord: epsgDifferenceVerif(fileName, datas.epsgData, datas.correct)
    }
  }

  return { logs, datas }
}

const inverseCheck = ({ x, y }, { x1, x2, y1, y2 }) => {
  // A est un entier qui peut retourner 4 valeurs différentes: 0, 0.5, 1, 1.5
  // chacune de ses valeurs a un sens différent.
  // 0: la donnée semble correcte, possibilité d'interversion de colonnes
  // 0.5: donnée semble correcte
  // 1: inversion colonnes
  // 1.5: mauvais epsg
  let inverseValue = 0

  // Ici, on check si le point n'est pas dans les bordures de l'epsg
  if (
    parseFloat(x1) >= parseFloat(x) ||
    parseFloat(x2) <= parseFloat(x) ||
    parseFloat(y1) >= parseFloat(y) ||
    parseFloat(y2) <= parseFloat(y)
  ) {
    inverseValue += 1
  }

  // Ici, on check si le point en YX n'est pas dans les bordures de l'epsg
  if (
    parseFloat(x1) >= parseFloat(y) ||
    parseFloat(x2) <= parseFloat(y) ||
    parseFloat(y1) >= parseFloat(x) ||
    parseFloat(y2) <= parseFloat(x)
  ) {
    inverseValue += 0.5
  }
  return inverseValue
}

const choiceDataToAdd = (file, epsg, { x, y }, epsgBound, { xRef, yRef }) => {
  // On ecrit dans les logs
  let tableauLog = {}
  const inverseValue = inverseCheck({ x, y }, epsgBound)
  let probleme, resolution

  switch (inverseValue) {
    case 0:
      probleme = pb.PAS_DE_PROBLEME
      resolution = pb.OK
      break
    case 1:
      probleme = pb.INVERSION_COLONNES
      resolution = pb.OK
      break
    case 0.5:
      probleme = pb.PAS_DE_PROBLEME
      resolution = pb.OK
      break
    case 1.5:
      probleme = pb.MAUVAIS_EPSG
      resolution = pb.A_VERIFIER
      break
  }

  tableauLog = dataAdd(
    file,
    epsg,
    probleme,
    resolution,
    { x, y },
    { x: xRef, y: yRef }
  )
  return tableauLog
}

const XYChange = coord => coord.replace(/ /g, '').replace(/,/g, '.')

const dmsToDec = angle => {
  if (typeof angle === 'number') return angle

  // Check si il s'agit d'un angle en decimal ou en degre
  if (angle.indexOf('°') === -1) {
    return [parseFloat(angle.replace(/,/g, '.').replace(/ /g, ''))]
  }

  let negativite = false
  let lettreDegre = ''
  if (LETTRES_DEGRE.includes(angle.slice(-1))) {
    lettreDegre = angle.slice(-1)
  }
  if (LETTRES_DEGRE.includes(angle.slice(0, 1))) {
    lettreDegre = angle.slice(0, 1)
  }

  const latSep = angle.split('°')
  if (latSep[0].slice(0, 1) === '-') {
    negativite = !negativite
  }

  let deg = parseFloat(latSep[0])
  let min = parseFloat(latSep[1].split("'")[0])

  // differentes possibilités d'ecrire un angle seconde, donc on les teste
  let sec = parseFloat(
    angle
      .split('°')[1]
      .replace(',', "'")
      .split("'")[1]
  )

  // au cas ou le fichier n'a pas d'angle seconde
  if (isNaN(sec)) {
    sec = 0
  }

  // On applique une addition différente en fonction de la positivité de l'angle
  const dec = negativite
    ? deg - min / 60 - sec / 3600
    : deg + min / 60 + sec / 3600
  return [dec, lettreDegre]
}

const precision = 9

const tenPow = Math.pow(10, precision)

const round = dec => Math.round(dec * tenPow) / tenPow

const decToDms = (angle, lettreDegre = '') => {
  let deg = Math.floor(angle)
  if (isNaN(deg)) return ''

  const minFloat = (angle - deg) * 60
  let min = Math.floor(minFloat)

  const secFloat = (minFloat - min) * 60
  let sec = Math.round(secFloat)
  if (sec === 60) {
    min++
    sec = 0
  }

  if (min >= 60) {
    deg < 0 ? deg-- : deg++
    min = min - 60
  }

  let minus = ''
  if (deg < 0) {
    minus = '-'
    deg++
    min = 59 - min
    sec = 60 - sec
  }

  const dms = `${minus}${Math.abs(deg)}°${min}'${sec}"`
  return `${dms.replace(/ /g, '')}${lettreDegre}`
}

const coordModif = (
  coordRef,
  epsgBound,
  file,
  epsg,
  description,
  isEpsgProjectionCorrect
) => {
  let x, y
  let [xRef, yRef] = [coordRef.x, coordRef.y]
  if (!xRef) xRef = ''
  if (!yRef) yRef = ''

  if (!isEpsgProjectionCorrect) {
    x = dmsToDec(xRef)[0]
    y = dmsToDec(yRef)[0]

    if (isNaN(x)) x = ''
    if (isNaN(y)) y = ''

    xRef = round(...dmsToDec(xRef))
    yRef = round(...dmsToDec(yRef))
  } else {
    x = XYChange(xRef)
    y = XYChange(yRef)
    xRef = XYChange(xRef)
    yRef = XYChange(yRef)
  }

  // Si il y a une donnee manquante
  if (x === '' || y === '') {
    return description !== null && description.length !== 0
      ? dataAdd(
          file,
          epsg,
          pb.NO_DATA_WITH_DESC,
          pb.A_COMPLETER,
          { x, y },
          { x: xRef, y: yRef }
        )
      : dataAdd(
          file,
          epsg,
          pb.INCOMPLET,
          pb.INUTILE,
          { x, y },
          { x: xRef, y: yRef }
        )
  }

  const tableauLog = choiceDataToAdd(file, epsg, { x, y }, epsgBound, {
    xRef,
    yRef
  })
  return tableauLog
}

const XYLatLonCheck = ({ x, y }, isEpsgProjectionCorrect) => {
  if (typeof x === 'undefined' || typeof y === 'undefined') return true

  // Si le XY suppose est un angle, alors isEpsgProjectionCorrect vaut false. Coord planes, isEpsgProjectionCorrect vaut true
  if (isEpsgProjectionCorrect) {
    const [coordX, coordY] = [parseFloat(x), parseFloat(y)]
    // On regarde si il manque au moins une des deux valeurs
    if (isNaN(coordX)) return coordY > -180 && coordY < 180

    if (isNaN(coordY)) return coordX > -180 && coordX < 180

    // Les valeurs planes sont suffisament élevés pour qu'une valeur inférieure à 10000 soit fausse
    return !(coordX > -180 && x < 180 && coordY > -180 && coordY < 180)
  }

  let [lat, lon] = [0, 0]
  // Formate les angles pour enlever les espaces si il y en a
  x.indexOf(' ') === -1
    ? (lat = parseFloat(x))
    : (lat = parseFloat(x.replace(/ /g, '')))

  y.indexOf(' ') === -1
    ? (lon = parseFloat(y))
    : (lon = parseFloat(y.replace(/ /g, '')))

  if (isNaN(lat)) return lon > 200 || lon < -200

  if (isNaN(lon)) return lat > 200 || lat < -200

  return !(lat > 200 || lon > 200 || lat < -200 || lon < -200)
}

const logCreate = (epsgData, descriptionListe, filePath, epsgContours) =>
  epsgData.reduce((acc, { epsg, coord }) => {
    let tableauLog = { opposable: false, data: [] }
    if (epsg.slice(-1) === '*') {
      epsg = epsg.slice(0, -1)
      tableauLog.opposable = true
    }

    const epsgContour = epsgContours[epsg]
    if (!epsgContour) {
      throw new Error(
        `epsg contour manquant dans files/epsg-block.json : ${epsg}`
      )
    }

    const { coord: epsgBound, projected: isEpsgProjected } = epsgContour

    coord.forEach(({ x, y }, j) => {
      XYLatLonCheck({ x, y }, isEpsgProjected)
        ? tableauLog.data.push(
            coordModif(
              { x, y },
              epsgBound,
              filePath,
              epsg,
              descriptionListe[j],
              isEpsgProjected
            )
          )
        : tableauLog.data.push(
            dataAdd(
              filePath,
              epsg,
              isEpsgProjected ? pb.XY_INSTEAD_LATLON : pb.LATLON_INSTEAD_XY,
              pb.INVERSION_EPSG,
              { x, y },
              { x, y }
            )
          )
    })
    return [...acc, tableauLog]
  }, [])

const dataAdd = (fileName, epsg, probleme, correction, coord, coordRef) => ({
  log: { fileName, epsg, probleme },
  correct: { probleme, correction },
  coord,
  coordRef
})

const obtainLogs = (epsgContours, dataInitial, filePath) => {
  const { epsgData, otherData } = dataInitial[filePath]
  const descriptionListe = otherData.map(otherElem => otherElem.description)
  const { epsg } = epsgData
  let tableauLog = []

  const lignesLength = descriptionListe.length
  if (lignesLength === 0) {
    tableauLog.push([dataAdd(filePath, epsg, pb.NO_DATA, pb.INUTILE, {}, {})])
  }

  if (lignesLength === 1 || lignesLength === 2) {
    tableauLog.push([
      dataAdd(filePath, epsg, pb.PAS_DE_CONTOUR, pb.INUTILE, {}, {})
    ])

    return tableauLog
  }

  // Check si la description de tout les points est disponible
  const descriptionsLength = descriptionListe.filter(A => A).length

  if (epsgData.length === 0) {
    tableauLog.push([
      descriptionsLength !== 0 && descriptionsLength >= lignesLength - 1
        ? dataAdd(filePath, epsg, pb.NO_DATA_WITH_DESC, pb.A_COMPLETER, {}, {})
        : dataAdd(filePath, epsg, pb.MISSING_DESC, pb.INUTILE, {}, {})
    ])

    return tableauLog
  }

  return logCreate(epsgData, descriptionListe, filePath, epsgContours)
}

const folderRead = (filesFolderPath, epsgContours, dataInitial, domaineId) => {
  const filePath = path.join(filesFolderPath, domaineId)
  const filesNameList = fs.readdirSync(filePath)

  return filesNameList.reduce((acc, fileName) => {
    if (fileName === '.keep') return acc

    acc.push(
      logToData(
        dataInitial,
        fileName,
        obtainLogs(epsgContours, dataInitial, fileName)
      )
    )

    return acc
  }, [])
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
