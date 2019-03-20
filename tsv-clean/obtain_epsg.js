const fs = require('fs')
const filespath = process.cwd() + '/files/'

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
      // ${lines.length < 2 ? 'est vide' : "n'est pas valide"}
      //console.log(`Le fichier: ${filepath} a une valeur d'epsg non valide`)
      return acc
    }

    const coordData = lines.slice(1).map(line => {
      const [X, Y] = line.split('\t').slice(i, i + 2)
      return {
        X,
        Y
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

const createEpsgFolder = folder => {
  const files = fs.readdirSync(`${filespath}${folder}/`)
  return files.map(listMap => dataBuild(`${folder}/${listMap}`))
}

const createEpsg = () => {
  const li = ['w', 'c', 'g', 'h', 'm']
  return li.map(createEpsgFolder)
}

const recreateEpsg = mat => {
  const newMat = {}
  mat.map(row =>
    row.map(elem => {
      const [epsgData, filename] = [elem.coordEpsg, elem.file]
      const otherData = {
        groupe: [],
        contour: [],
        point: [],
        jorfId: [],
        description: []
      }
      elem.lines.map(elemData => {
        otherData.groupe.push(elemData.groupe)
        otherData.contour.push(elemData.contour)
        otherData.point.push(elemData.point)
        otherData.jorfId.push(elemData.jorfId)
        otherData.description.push(elemData.description)
      })
      newMat[filename] = { epsgData, otherData }
    })
  )
  return newMat
}

const matEpsg = createEpsg()
const newMatEpsg = recreateEpsg(matEpsg)

fs.writeFileSync(`${filespath}data_tsv.json`, JSON.stringify(newMatEpsg))
process.exit()
