/*
Trouve les tsvs, les lit, et stocke leurs données dans une matrice

Les tsvs doivent etre mis dans un grand dossier nommé 'files'
A l'intérieur de ce dossier, les tsvs devront etre séparés en différents dosiers dépendant de leur domaine

*/

const fs = require('fs').promises
const path = require('path')
const filesPath = path.join(process.cwd(), 'files/')

const epsgObtain = async (domainesIds, filesPath) => {
  const domainesMatrix = await Promise.all(
    domainesIds.map(domaineId => epsgFolderCreate(domaineId, filesPath))
  )
  const epsgMatrix = epsgModify(domainesMatrix)
  return epsgMatrix
}

module.exports = epsgObtain

const coordEpsgBuild = (dataCoordEpsg, lines, filePath) => [
  ...dataCoordEpsg,
  ...lines[0].split('\t').reduce((acc, epsgId, i) => {
    // on sélectionne les coordonnées d'un epsg qui se trouvent
    // dans les colonnes numero 5+i, 6+i
    if (i < 5 || i % 2 === 0) return acc

    const epsgInt = parseInt(epsgId)
    if (isNaN(epsgInt)) {
      //console.log(`le fichier ${filePath} possede un epsg non numérique`)
      return acc
    }
    if (epsgInt < 1000 || epsgInt > 100000) {
      //console.log(`Le fichier: ${filePath} a une valeur d'epsg non valide`)
      return acc
    }

    const coordData = lines.slice(1).map(line => {
      const [x, y] = line.split('\t').slice(i, i + 2)
      return {
        x,
        y
      }
    })

    return [...acc, { epsg: epsgId, coord: coordData }]
  }, [])
]

const dataBuild = async filePath => {
  const lines = (await fs.readFile(
    path.join(filesPath, filePath),
    'utf8'
  )).split('\r\n')
  const data = {
    filename: filePath,
    epsgData: [],
    otherData: []
  }
  if (lines.length <= 2) {
    //console.log(`Le fichier: ${filePath} est vide`)
    return data
  }

  data.epsgData = coordEpsgBuild(data.epsgData, lines, filePath)

  data.otherData = lines.slice(1).map(line => {
    const [groupe, contour, point, jorfId, description] = line
      .split('\t')
      .splice(0, 5)
    return { groupe, contour, point, jorfId, description }
  })
  return data
}

const epsgFolderCreate = async (folder, filesPath) => {
  const files = await fs.readdir(path.join(filesPath, folder))
  return Promise.all(
    files.map(listMap => dataBuild(path.join(folder, listMap)))
  )
}

const epsgModify = listFilesData => {
  return listFilesData.reduce((acc, row) => {
    row.forEach(({ filename, epsgData, otherData }) => {
      acc[filename.substring(2)] = { epsgData, otherData }
    })
    return acc
  }, {})
}
