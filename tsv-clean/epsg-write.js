/*
Fichier qui ecrit les titres miniers modifiés par epsg-modif
Il utilise 5 dossiers: OK, Inutilisable, A Completer, A verifier, Inversion degre XY
Il range aussi les titres dans chaque dossier dependant du log des erreurs

titres-h-points.csv
id    coordonnees    groupe    contour    point    titre_etape_id    nom
g-prx-lauterbourg-2011-pr101-dpu01-g01-c01-p001	8.020837797484726,49.01942826038932	1	1	1	g-prx-lauterbourg-2011-pr101-dpu01	1

titres-h-points-references.csv
id    titre_point_id    geo_systeme_id    coordonnee
g-cxx-rittershoffen-2017-oct01-mfr01-g01-c01-p001-4275	g-cxx-rittershoffen-2017-oct01-mfr01-g01-c01-p001	4275	7.908055555555556,48.87416666666667

acutellement, j'ai: 
g-cxx-rittershoffen-2017-oct01-mfr01
groupe 1, point 1, contour 1, epsg 4275
coordonnées pour le point 1 en 4275

Il faut juste que je mette ca en forme pour le titres-h-points-references.csv --> faire des csv et pas des tsv, creer un gros fichier qui contient tout les points, pas en points par points (ca se fait ez)

En revanche, il me faut des coordonnées en wgs84 (ou lambert93 jsplus...) pour titre-h-points
Donc un transformer d'epsg, aka gdal (à integrer aussi sur epsg-modif dans le futur pour faire des checks)
*/

const fs = require('fs')
const path = require('path')
const json2csv = require('json2csv').parse
const filespath = path.join(process.cwd(), 'files/')
const domainesIds = ['w', 'c', 'g', 'h', 'm']
const dataInitial = JSON.parse(
  fs.readFileSync(path.join(filespath, 'data-final.json'), 'utf8')
)

const epsgWrite = async (data, filesPath, domainesIds) => {
  //return dataWrite(data, filesPath)
  return dataDomaineRefWrite(data, filesPath, domainesIds)
}

module.exports = epsgWrite

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

const fileDomaineRefCreate = (pointDomaine, filesPath, domainesIds) => {
  domainesIds.map(domaineId => {
    const domaineObjet = pointDomaine[domaineId]
    const csvDomaineRef = json2csv(domaineObjet)
    const pathDataRef = path.join(
      filesPath,
      `titres-${domaineId}-points-references.csv`
    )
    fs.writeFileSync(pathDataRef, csvDomaineRef, {
      flag: 'w+',
      encoding: 'UTF-8'
    })
  })
}

const objectDomaineRefWrite = ({ epsgData, otherData, correct }) => {
  //id    titre_point_id    geo_systeme_id    coordonnee    domaine
  //g-cxx-rittershoffen-2017-oct01-mfr01-g01-c01-p001-4275
  return epsgData.reduce((acc, epsgValue, i) => {
    const geo_systeme_id = epsgValue.epsg
    epsgValue.coord.forEach((coordXY, j) => {
      const { groupe, contour, point } = otherData[j]
      const titre_point_id = `${epsgValue.file}-g${groupe.padStart(
        2,
        '0'
      )}-c${contour.padStart(2, '0')}-p${point.padStart(3, '0')}`
      const id = `${titre_point_id}-${geo_systeme_id}`
      const coordonnee = `${coordXY.x},${coordXY.y}`
      const probleme = correct[i * epsgData.length + j][1]
      acc[id] = {
        id,
        titre_point_id,
        geo_systeme_id,
        coordonnee,
        probleme
      }
    })
    return acc
  }, {})
}

const dataDomaineRefWrite = (data, filesPath, domainesIds) => {
  const fileNames = Object.keys(data)
  //console.log(fileNames)
  const dataFiles = fileNames.reduce((acc, fileName) => {
    const error = errorCheck(fileName, data)
    //Besoin de la prio? Me permet de savoir si le fichier est correct ou non (donc a ecrire ou non)
    //--> Creation d'un log qui me dit pour chaque fichier si il est mis dans le csv ou non (id, rempli, probleme)
    const prio = errorPriorityFind(error)
    // J'ai besoin de faire une selection de l'epsg de preference? ou je les importe tous?
    //--> j'importe tout dans references, et un seul avec epsg 4326 dans points
    // Je crée un fichier avec plein de points! genre tous! si y'a pas epsg 4326 dedands pour un fichier, je le rajoute (ulterieurement)
    if (prio <= 1) {
      acc[fileName] = objectDomaineRefWrite(data[fileName])
    }

    return acc
  }, {})

  const pointDomaine = pointDomaineCreate(dataFiles)
  fileDomaineRefCreate(pointDomaine, filesPath, domainesIds)
  return pointDomaine
}

const pointDomaineCreate = dataFiles => {
  return Object.keys(dataFiles).reduce((acc, key) => {
    const domaineId = key[0]
    acc[domaineId] = acc[domaineId] || []
    Object.keys(dataFiles[key]).forEach(dataPoint => {
      acc[domaineId].push(dataFiles[key][dataPoint])
    })
    return acc
  }, {})
}

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
