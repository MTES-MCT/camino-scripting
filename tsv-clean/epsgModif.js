const pb = {
  PAS_DE_PROBLEME: 'pas de probleme',
  A_CORRIGER: 'aCorriger',
  INVERSION_COLONNES: 'inversion des colonnes',
  INUTILE: 'Inutilisable',
  OK: 'OK',
  A_VERIFIER: 'aVerifier',
  MAUVAIS_EPSG: 'pas le bon epsg',
  INCOMPLET: 'donnee incomplete',
  INVERSION_EPSG: 'Inversion',
  NO_DATA_WITH_DESC: 'description sans donnee',
  NO_DATA: 'pas de donnee',
  LATLON_INSTEAD_XY: 'X/Y au lieu de lat/lon',
  UNITE_DEGRE_RADIAN: "probleme d'unite grad/degre",
  XY_INSTEAD_LATLON: 'lat/lon au lieu de X/Y'
}

const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const block = JSON.parse(fs.readFileSync(`${filespath}epsgBlock.json`, 'utf8'))
const data = JSON.parse(fs.readFileSync(`${filespath}dataTsv.json`, 'utf8'))
const log = []

const XYChange = coord => {
  return coord.replace(/ /g, '').replace(/,/g, '.')
}

const DmsToDec = angle => {
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

const DecToDMS = angle => {
  let deg = Math.floor(angle)
  if (isNaN(deg)) return ''

  const minFloat = (angle - deg) * 60
  let min = Math.floor(minFloat)
  const secFloat = (minFloat - min) * 60
  let sec = Math.round(secFloat)
  if (sec == 60) {
    min++
    s = 0
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

const XYInverseCheck = (coordXY, bounds) => {
  // A est un entier qui peut retourner 4 valeurs différentes: 0, 0.5, 1, 1.5
  // chacune de Ses valeurs a un sens différens.
  let A = 0
  const [X1, X2, Y1, Y2, coordX, coordY] = [
    bounds.X1,
    bounds.X2,
    bounds.Y1,
    bounds.Y2,
    coordXY.X,
    coordXY.Y
  ]
  //Ici, on check si le point n'est pas dans les bordures de l'epsg
  if (
    parseFloat(X1) >= parseFloat(coordX) ||
    parseFloat(X2) <= parseFloat(coordX) ||
    parseFloat(Y1) >= parseFloat(coordY) ||
    parseFloat(Y2) <= parseFloat(coordY)
  ) {
    A += 1
  }
  //Ici, on check si le point en YX n'est pas dans les bordures de l'epsg
  if (
    parseFloat(X1) >= parseFloat(coordY) ||
    parseFloat(X2) <= parseFloat(coordY) ||
    parseFloat(Y1) >= parseFloat(coordX) ||
    parseFloat(Y2) <= parseFloat(coordX)
  ) {
    A += 0.5
  }
  return A
}

const LatLonInverseCheck = (coordLatLon, bounds) => {
  // A est un entier qui peut retourner 4 valeurs différentes: 0, 0.5, 1, 1.5
  // chacune de ses valeurs a un sens différent.
  let A = 0
  const [X1, X2, Y1, Y2, coordLat, coordLon] = [
    bounds.X1,
    bounds.X2,
    bounds.Y1,
    bounds.Y2,
    coordLatLon.X,
    coordLatLon.Y
  ]
  //Ici, on check si le point n'est pas dans les bordures de l'epsg
  if (
    DmsToDec(X1) >= parseFloat(coordLat) ||
    DmsToDec(X2) <= parseFloat(coordLat) ||
    DmsToDec(Y1) >= parseFloat(coordLon) ||
    DmsToDec(Y2) <= parseFloat(coordLon)
  ) {
    A += 1
  }
  //Ici, on check si le point en YX n'est pas dans les bordures de l'epsg
  if (
    DmsToDec(X1) >= parseFloat(coordLon) ||
    DmsToDec(X2) <= parseFloat(coordLon) ||
    DmsToDec(Y1) >= parseFloat(coordLat) ||
    DmsToDec(Y2) <= parseFloat(coordLat)
  ) {
    A += 0.5
  }
  return A
}

const FromXYLatLonCheck = coordXY => {
  const X = parseFloat(coordXY.X)
  const Y = parseFloat(coordXY.Y)
  if (typeof X == 'undefined' || typeof Y == 'undefined') return true

  //On regarde si il manque au moins une des deux valeurs
  if (isNaN(X)) return -180 < Y && Y < 180

  if (isNaN(Y)) return -180 < X && X < 180

  //Les valeurs planes sont suffisament élevés pour qu'une valeur inférieure à 10000 soit fausse
  return !(-180 < X && X < 180 && -180 < Y && Y < 180)
}

const FromLatLonXYCheck = coordLatLon => {
  const [coordLat, coordLon] = [coordLatLon.X, coordLatLon.Y]
  if (typeof coordLat == 'undefined' || typeof coordLon == 'undefined')
    return true

  let [lat, lon] = [0, 0]
  //Formate les angles pour enlever les espaces
  coordLat.indexOf(' ') == -1
    ? (lat = parseFloat(coordLat))
    : (lat = parseFloat(coordLat.replace(/ /g, '')))

  coordLon.indexOf(' ') == -1
    ? (lon = parseFloat(coordLon))
    : (lon = parseFloat(coordLon.replace(/ /g, '')))

  if (isNaN(lat)) return 200 < lon || lon < -200

  if (isNaN(lon)) return 200 < lat || lat < -200

  return !(200 < lat || 200 < lon || lat < -200 || lon < -200)
}

const XYModif = (coord, epsgBound, file, epsg, description) => {
  if (typeof coord.Y == 'undefined') coord.Y = ''
  if (typeof coord.X == 'undefined') coord.X = ''

  if (coord.X == '' || coord.Y == '') {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.A_CORRIGER])
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.INCOMPLET])
      data[file].correct.push([pb.INCOMPLET, pb.INUTILE])
    }
    return
  }

  coord.X = XYChange(coord.X)
  coord.Y = XYChange(coord.Y)
  const A = XYInverseCheck(coord, epsgBound)
  if (A == 0) {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.A_CORRIGER])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.INUTILE])
    }
  } else if (A == 1) {
    log.push([file, epsg, coord.X, coord.Y, pb.INVERSION_COLONNES])
    data[file].correct.push([pb.INVERSION_COLONNES, pb.OK])
  } else if (A == 0.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.PAS_DE_PROBLEME])
    data[file].correct.push([pb.PAS_DE_PROBLEME, pb.OK])
  } else if (A == 1.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.MAUVAIS_EPSG])
    data[file].correct.push([pb.MAUVAIS_EPSG, pb.A_VERIFIER])
  }
}

const LatLonModif = (coord, epsgBound, file, epsg, description) => {
  if (typeof coord.Y == 'undefined') coord.Y = ''
  if (typeof coord.X == 'undefined') coord.X = ''
  coord.X = DmsToDec(coord.X)
  coord.Y = DmsToDec(coord.Y)
  if (isNaN(coord.X)) coord.X = ''
  if (isNaN(coord.Y)) coord.Y = ''

  if (coord.X == '' || coord.Y == '') {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.A_CORRIGER])
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.INCOMPLET])
      data[file].correct.push([pb.INCOMPLET, pb.INUTILE])
    }
    return
  }

  const A = LatLonInverseCheck(coord, epsgBound)
  if (A == 0) {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.A_CORRIGER])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.INUTILE])
    }
  } else if (A == 1) {
    log.push([file, epsg, coord.X, coord.Y, pb.INVERSION_COLONNES])
    data[file].correct.push([pb.INVERSION_COLONNES, pb.OK])
  } else if (A == 0.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.PAS_DE_PROBLEME])
    data[file].correct.push([pb.PAS_DE_PROBLEME, pb.OK])
  } else if (A == 1.5) {
    //Probleme d'angle en degre / radian avec l'epsg 4807 que l'on verifie ici
    if (epsg == '4807') {
      const B = LatLonInverseCheck(coord, {
        X1: '-8°0\'25"',
        Y1: '45°53\'20"',
        X2: '8°6\'13"',
        Y2: '56°49\'20"'
      })
      if (B == 0.5) {
        log.push([file, epsg, coord.X, coord.Y, pb.UNITE_DEGRE_RADIAN])
        data[file].correct.push([pb.UNITE_DEGRE_RADIAN, pb.A_VERIFIER])
      } else {
        log.push([file, epsg, coord.X, coord.Y, pb.MAUVAIS_EPSG])
        data[file].correct.push([pb.MAUVAIS_EPSG, pb.A_VERIFIER])
      }
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.MAUVAIS_EPSG])
      data[file].correct.push([pb.MAUVAIS_EPSG, pb.A_VERIFIER])
    }
  }
  coord.X = DecToDMS(coord.X)
  coord.Y = DecToDMS(coord.Y)
}

const check = file => {
  const { epsgData, otherData } = data[file]
  data[file].correct = []
  description = otherData.description
  if (epsgData.length == 0 && description.length != 0) {
    //Check si la description de tout les points est disponible
    const count = description.filter(A => A).length
    if (count >= description.length - 1) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.A_CORRIGER])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.INUTILE])
    }
    return
  }
  epsgData.map(epsgElem => {
    const epsg = epsgElem.epsg
    const coord = epsgElem.coord
    const epsgBound = block[epsg].coord
    if (block[epsg].projected == 'Y') {
      coord.reduce((acc, coordXY, j) => {
        if (FromXYLatLonCheck(coordXY)) {
          XYModif(coordXY, epsgBound, file, epsg, description[j])
        } else {
          log.push([file, epsg, coordXY.X, coordXY.Y, pb.XY_INSTEAD_LATLON])
          data[file].correct.push([pb.XY_INSTEAD_LATLON, pb.INVERSION_EPSG])
        }
      })
    } else {
      coord.reduce((acc, coordLatLon, j) => {
        if (FromLatLonXYCheck(coordLatLon)) {
          LatLonModif(coordLatLon, epsgBound, file, epsg, description[j])
        } else {
          log.push([
            file,
            epsg,
            coordLatLon.X,
            coordLatLon.Y,
            pb.LATLON_INSTEAD_XY
          ])
          data[file].correct.push([pb.LATLON_INSTEAD_XY, pb.INVERSION_EPSG])
        }
      })
    }
  })
}

const folderRead = folder => {
  const files = fs.readdirSync(`${filespath}${folder}/`)
  files.map(list_map => check(`${folder}/${list_map}`))
}

const filesRead = () => {
  const li = ['w', 'c', 'g', 'h', 'm']
  li.map(folderRead)
}

const arrayToCsv = (entree, sortie) => {
  const arr = JSON.parse(fs.readFileSync(`${filespath}${entree}`, 'utf8'))
  const header = 'nom du fichier,epsg,probleme\n'
  fs.writeFileSync(`${filespath}${sortie}`, header, 'UTF-8', {
    flags: 'a+'
  })
  arr.map(mat => {
    let mess = ''
    mat.length == 2
      ? (mess += `${mat[0]},,${mat[1]}\n`)
      : (mess += `${mat[0]},${mat[1]},${mat[mat.length - 1]}\n`)

    fs.appendFileSync(`${filespath}${sortie}`, mess, 'UTF-8', {
      flags: 'a+'
    })
  })
}

//check('w/w-cxx-astrolabe-2009-oct01-mfr01.tsv')

filesRead()
fs.writeFileSync(`${filespath}logError.json`, JSON.stringify(log))
fs.writeFileSync(`${filespath}dataFinal.json`, JSON.stringify(data))
arrayToCsv('logError.json', 'prob.csv')
console.log(log.length)
