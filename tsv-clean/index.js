const fs = require('fs').promises
const path = require('path')

const epsgObtain = require('./epsg-obtain')
const epsgModif = require('./epsg-modif')
const epsgWrite = require('./epsg-write')

const run = async () => {
  try {
    const filesPath = path.join(process.cwd(), 'files/')
    const domainesIds = ['m', 'w']//, 'c', 'g', 'h', 'w']

    const tsvDatas = await epsgObtain(domainesIds, filesPath)
    // On modifie les données
    const epsgContours = require(path.join(filesPath, 'epsg-block.json'))
    //objet à retouner
    const { tsvDatasCleaned } = await epsgModif(
      domainesIds,
      filesPath,
      epsgContours,
      tsvDatas
    )
    //On ecrit
    const titresCamino = require(path.join(
      filesPath,
      'graphiql-point-etape-demarche.json'
    ))
    const logCorrespondance = await epsgWrite(
      domainesIds,
      filesPath,
      titresCamino,
      tsvDatasCleaned
    )
    await fs.writeFile(
      path.join(path.join(filesPath, 'results'), 'csv-correspondance.csv'),
      logCorrespondance
    )
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}
run()
