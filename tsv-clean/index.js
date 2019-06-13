const fs = require('fs').promises
const path = require('path')

const epsgObtain = require('./epsg-obtain')
const epsgModif = require('./epsg-modif')
const epsgWrite = require('./epsg-write')

const run = async () => {
  try {
    const filesPath = path.join(process.cwd(), 'files_true_data/')
    const domainesIds = ['m', 'c', 'g', 'h', 'w']

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
      'graphiql_point_etape_demarche.json'
    ))
    const logCorrespondance = await epsgWrite(
      domainesIds,
      filesPath,
      titresCamino,
      tsvDatasCleaned
    )
    await fs.writeFile(
      path.join(filesPath, 'csv-correspondance.csv'),
      logCorrespondance
    )
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}
run()
