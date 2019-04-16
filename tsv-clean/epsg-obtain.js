/*
Trouve les tsvs, les lit, et stocke leurs données dans une matrice

Les tsvs doivent etre mis dans un grand dossier nommé 'files'
A l'intérieur de ce dossier, les tsvs devront etre séparés en différents dosiers dépendant de leur domaine

*/

const fs = require('fs').promises
const path = require('path')

const epsgModify = listFilesData =>
  listFilesData.reduce(
    (acc, row) =>
      row.reduce(
        (acc, { filename, epsgData, otherData }) => ({
          ...acc,
          [filename.substring(2)]: { epsgData, otherData }
        }),
        acc
      ),
    {}
  )

const coordEpsgBuild = (dataCoordEpsg, lines) => [
  ...dataCoordEpsg,
  ...lines[0].split('\t').reduce((acc, epsgId, i) => {
    // on sélectionne les coordonnées d'un epsg qui se trouvent
    // dans les colonnes numero 5+i, 6+i
    if (i < 5 || i % 2 === 0) return acc

    const epsgInt = parseInt(epsgId)
    if (isNaN(epsgInt)) {
      return acc
    }
    if (epsgInt < 1000 || epsgInt > 100000) {
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

const dataBuild = async (filesFolderPath, filePath) => {
  const lines = (await fs.readFile(
    path.join(filesFolderPath, filePath),
    'utf8'
  ))
    .trim()
    .split('\n')
  const data = {
    filename: filePath,
    epsgData: [],
    otherData: []
  }
  //le fichier est vide ou contient un header sans donnée
  if (lines.length < 2) {
    return data
  }

  data.epsgData = coordEpsgBuild(data.epsgData, lines)
  data.otherData = lines.slice(1).map(line => {
    const [groupe, contour, point, jorfId, description] = line.split('\t')
    return { groupe, contour, point, jorfId, description }
  })
  return data
}

const epsgFolderCreate = async (filesFolderPath, folder) => {
  const files = await fs.readdir(path.join(filesFolderPath, folder))
  return Promise.all(
    files.map(file => dataBuild(filesFolderPath, path.join(folder, file)))
  )
}

const epsgObtain = async (domainesIds, filesFolderPath) => {
  const domainesMatrix = await Promise.all(
    domainesIds.map(domaineId => epsgFolderCreate(filesFolderPath, domaineId))
  )
  const epsgMatrix = epsgModify(domainesMatrix)
  return epsgMatrix
}

module.exports = epsgObtain
