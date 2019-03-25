const fs = require('fs')
const filespath = `${process.cwd()}/files/`
const domainesIds = ['w', 'c', 'g', 'h', 'm']

const coordEpsgBuild = (dataCoordEpsg, lines, filepath) => [
  ...dataCoordEpsg,
  ...lines[0].split('\t').reduce((acc, epsgId, i) => {
    // on sélectionne les coordonnées d'un epsg qui se trouvent
    // dans les colonnes numero 5+i, 6+i
    if (i < 5 || i % 2 === 0) return acc

    const epsgInt = parseInt(epsgId)
    if (isNaN(epsgInt)) {
      //console.log(`le fichier ${filepath} possede un epsg non numérique`)
      return acc
    }
    if (epsgInt < 1000 || epsgInt > 100000) {
      //console.log(`Le fichier: ${filepath} a une valeur d'epsg non valide`)
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

const dataBuild = filepath => {
  const lines = fs.readFileSync(`${filespath}${filepath}`, 'utf8').split('\r\n')
  const data = {
    file: filepath,
    coordEpsg: [],
    lines: []
  }
  if (lines.length <= 2) {
    //console.log(`Le fichier: ${filepath} est vide`)
    return data
  }

  data.coordEpsg = coordEpsgBuild(data.coordEpsg, lines, filepath)

  data.lines = lines.slice(1).map(line => {
    const [groupe, contour, point, jorfId, description] = line
      .split('\t')
      .splice(0, 5)
    return { groupe, contour, point, jorfId, description }
  })
  return data
}

const epsgFolderCreate = folder => {
  const files = fs.readdirSync(`${filespath}${folder}/`)
  return files.map(listMap => dataBuild(`${folder}/${listMap}`))
}

const epsgModify = mat => {
  const newMat = {}
  mat.map(row =>
    row.map(elem => {
      const [epsgData, filename, otherData] = [
        elem.coordEpsg,
        elem.file,
        elem.lines
      ]
      newMat[filename.substring(2)] = { epsgData, otherData }
    })
  )
  return newMat
}

const epsgMatrix = epsgModify(domainesIds.map(epsgFolderCreate))
fs.writeFileSync(`${filespath}data-tsv.json`, JSON.stringify(epsgMatrix))
process.exit()
