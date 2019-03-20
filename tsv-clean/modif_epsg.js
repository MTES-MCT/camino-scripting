const pb = {
  pasDeProbleme: 'pas de probleme',
  toCorrect: 'aCorriger',
  colInverse: 'inversion des colonnes',
  inutile: 'Inutilisable',
  ok: 'OK',
  toVerify: 'aVerifier',
  wrongEpsg: 'pas le bon epsg',
  incomplet: 'donnee incomplete',
  epsgInv: 'Inversion',
  noDataWithDesc: 'description sans donnee',
  noData: 'pas de donnee',
  LatLonInsteadXY: 'X/Y au lieu de lat/lon',
  uniteDegre: "probleme d'unite grad/degre",
  XYInsteadLatLon: 'lat/lon au lieu de X/Y'
}

const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const block = JSON.parse(fs.readFileSync(`${filespath}epsg_block.json`, 'utf8'))
const data = JSON.parse(fs.readFileSync(`${filespath}data_tsv.json`, 'utf8'))
const log = []

const changeXY = coord => {
  return coord.replace(/ /g, '').replace(/,/g, '.')
}

const DmsToDec = angle => {
  let dec = 0
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
  if (deg <= 0) {
    dec = deg - min / 60 - sec / 3600
  } else {
    dec = deg + min / 60 + sec / 3600
  }
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
    s = 0
  }
  if (min == 60) {
    if (deg < 0) deg--
    else deg++
    min = 0
  }
  if (deg < 0) {
    deg++
    min = 59 - min
    sec = 60 - sec
  }
  const dms = `${deg}°${min}'${sec}"'`
  return dms.replace(/ /g, '')
}

const check_inverseXY = (coordXY, bounds) => {
  let A = 0
  const [X1, X2, Y1, Y2, coordX, coordY] = [
    bounds.X1,
    bounds.X2,
    bounds.Y1,
    bounds.Y2,
    coordXY.X,
    coordXY.Y
  ]
  if (
    parseFloat(X1) >= parseFloat(coordX) ||
    parseFloat(X2) <= parseFloat(coordX) ||
    parseFloat(Y1) >= parseFloat(coordY) ||
    parseFloat(Y2) <= parseFloat(coordY)
  ) {
    A += 1
  }
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

const check_inverselatlon = (coordLatLon, bounds) => {
  let A = 0
  const [X1, X2, Y1, Y2, coordLat, coordLon] = [
    bounds.X1,
    bounds.X2,
    bounds.Y1,
    bounds.Y2,
    coordLatLon.X,
    coordLatLon.Y
  ]
  if (
    DmsToDec(X1) >= parseFloat(coordLat) ||
    DmsToDec(X2) <= parseFloat(coordLat) ||
    DmsToDec(Y1) >= parseFloat(coordLon) ||
    DmsToDec(Y2) <= parseFloat(coordLon)
  ) {
    A += 1
  }
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

const checkLatLonFromXY = coordXY => {
  const X = parseFloat(coordXY.X)
  const Y = parseFloat(coordXY.Y)
  if (typeof X == 'undefined' || typeof Y == 'undefined') return true

  if (isNaN(X)) return -180 < Y && Y < 180

  if (isNaN(Y)) return -180 < X && X < 180

  return !(-180 < X && X < 180 && -180 < Y && Y < 180)
}

const checkXYFromLatLon = coordLatLon => {
  const [coordLat, coordLon] = [coordLatLon.X, coordLatLon.Y]
  if (typeof coordLat == 'undefined' || typeof coordLon == 'undefined')
    return true

  let [lat, lon] = [0, 0]
  if (coordLat.indexOf(' ') == -1) {
    lat = parseFloat(coordLat)
  } else {
    lat = parseFloat(coordLat.replace(/ /g, ''))
  }
  if (coordLon.indexOf(' ') == -1) {
    lon = parseFloat(coordLon)
  } else {
    lon = parseFloat(coordLon.replace(/ /g, ''))
  }
  if (isNaN(lat)) return 200 < lon || lon < -200

  if (isNaN(lon)) return 200 < lat || lat < -200

  return !(200 < lat || 200 < lon || lat < -200 || lon < -200)
}

const modifXY = (coord, epsgBound, file, epsg, description) => {
  if (typeof coord.Y == 'undefined') coord.Y = ''
  if (typeof coord.X == 'undefined') coord.X = ''

  if (coord.X == '' || coord.Y == '') {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.toCorrect])
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.incomplet])
      data[file].correct.push([pb.incomplet, pb.inutile])
    }
    return
  }

  coord.X = changeXY(coord.X)
  coord.Y = changeXY(coord.Y)
  const A = check_inverseXY(coord, epsgBound)
  if (A == 0) {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.toCorrect])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.inutile])
    }
  } else if (A == 1) {
    log.push([file, epsg, coord.X, coord.Y, pb.colInverse])
    data[file].correct.push([pb.colInverse, pb.ok])
  } else if (A == 0.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.pasDeProbleme])
    data[file].correct.push([pb.pasDeProbleme, pb.ok])
  } else if (A == 1.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.wrongEpsg])
    data[file].correct.push([pb.wrongEpsg, pb.toVerify])
  }
}

const modifLatLon = (coord, epsgBound, file, epsg, description) => {
  if (typeof coord.Y == 'undefined') coord.Y = ''
  if (typeof coord.X == 'undefined') coord.X = ''
  coord.X = DmsToDec(coord.X)
  coord.Y = DmsToDec(coord.Y)
  if (isNaN(coord.X)) coord.X = ''
  if (isNaN(coord.Y)) coord.Y = ''

  if (coord.X == '' || coord.Y == '') {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.toCorrect])
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.incomplet])
      data[file].correct.push([pb.incomplet, pb.inutile])
    }
    return
  }

  const A = check_inverselatlon(coord, epsgBound)
  if (A == 0) {
    if (description != null && description.length != 0) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.toCorrect])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.inutile])
    }
  } else if (A == 1) {
    log.push([file, epsg, coord.X, coord.Y, pb.colInverse])
    data[file].correct.push([pb.colInverse, pb.ok])
  } else if (A == 0.5) {
    log.push([file, epsg, coord.X, coord.Y, pb.pasDeProbleme])
    data[file].correct.push([pb.pasDeProbleme, pb.ok])
  } else if (A == 1.5) {
    if (epsg == '4807') {
      const B = check_inverselatlon(coord, {
        X1: '-8°0\'25"',
        Y1: '45°53\'20"',
        X2: '8°6\'13"',
        Y2: '56°49\'20"'
      })
      if (B == 0.5) {
        log.push([file, epsg, coord.X, coord.Y, pb.uniteDegre])
        data[file].correct.push([pb.uniteDegre, pb.toVerify])
      } else {
        log.push([file, epsg, coord.X, coord.Y, pb.wrongEpsg])
        data[file].correct.push([pb.wrongEpsg, pb.toVerify])
      }
    } else {
      log.push([file, epsg, coord.X, coord.Y, pb.wrongEpsg])
      data[file].correct.push([pb.wrongEpsg, pb.toVerify])
    }
  }
  coord.X = decToDms(coord.X)
  coord.Y = decToDms(coord.Y)
}

const check = file => {
  const { epsgData, otherData } = data[file]
  data[file].correct = []
  description = otherData.description
  if (epsgData.length == 0 && description.length != 0) {
    const count = description.filter(A => A).length
    if (count >= description.length - 1) {
      log.push([file, pb.noDataWithDesc])
      data[file].correct.push([pb.noDataWithDesc, pb.toCorrect])
    } else {
      log.push([file, pb.noData])
      data[file].correct.push([pb.noData, pb.inutile])
    }
    return
  }
  epsgData.map(epsgElem => {
    const epsg = epsgElem.epsg
    const coord = epsgElem.coord
    const epsgBound = block[epsg].coord
    if (block[epsg].projected == 'Y') {
      coord.reduce((acc, coordXY, j) => {
        if (checkLatLonFromXY(coordXY)) {
          modifXY(coordXY, epsgBound, file, epsg, description[j])
        } else {
          log.push([file, epsg, coordXY.X, coordXY.Y, pb.XYInsteadLatLon])
          data[file].correct.push([pb.XYInsteadLatLon, pb.epsgInv])
        }
      })
    } else {
      coord.reduce((acc, coordLatLon, j) => {
        if (checkXYFromLatLon(coordLatLon)) {
          modifLatLon(coordLatLon, epsgBound, file, epsg, description[j])
        } else {
          log.push([
            file,
            epsg,
            coordLatLon.X,
            coordLatLon.Y,
            pb.LatLonInsteadXY
          ])
          data[file].correct.push([pb.LatLonInsteadXY, pb.epsgInv])
        }
      })
    }
  })
}

const read_folder = folder => {
  const files = fs.readdirSync(`${filespath}${folder}/`)
  files.map(list_map => check(`${folder}/${list_map}`))
}

const read_files = () => {
  const li = ['w', 'c', 'g', 'h', 'm']
  li.map(read_folder)
}

const array_to_csv = (entree, sortie) => {
  const arr = JSON.parse(fs.readFileSync(`${filespath}${entree}`, 'utf8'))
  const header = 'nom du fichier,epsg,probleme\n'
  fs.writeFileSync(`${filespath}${sortie}`, header, 'UTF-8', {
    flags: 'a+'
  })
  arr.map(mat => {
    let mess = ''
    if (mat.length == 2) {
      mess += `${mat[0]},,${mat[1]}\n`
    } else {
      mess += `${mat[0]},${mat[1]},${mat[mat.length - 1]}\n`
    }
    fs.appendFileSync(`${filespath}${sortie}`, mess, 'UTF-8', {
      flags: 'a+'
    })
  })
}

//check('w/w-cxx-astrolabe-2009-oct01-mfr01.tsv')

read_files()
fs.writeFileSync(`${filespath}log_error.json`, JSON.stringify(log))
fs.writeFileSync(`${filespath}data_final.json`, JSON.stringify(data))
array_to_csv('log_error.json', 'prob.csv')
console.log(log.length)
