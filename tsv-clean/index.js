const fs = require('fs').promises
const path = require('path')

const epsgObtain = require('./epsg-obtain')
const epsgModif = require('./epsg-modif')
const epsgWrite = require('./epsg-write')
const epsgImport = require('./epsg-import')

const run = async () => {
  try {
    const filesPath = path.join(process.cwd(), 'files/')
    const domainesIds = ['w', 'c', 'g', 'h', 'm']

    const tsvDatas = await epsgObtain(domainesIds, filesPath)

    // On modifie les données
    const epsgContours = require(path.join(
      process.cwd(),
      '/files/epsg-block.json'
    ))
    //objet à retounre
    const { logsCleaning, tsvDatasCleaned } = await epsgModif(
      domainesIds,
      filesPath,
      epsgContours,
      tsvDatas
    )
    //On ecrit
    const dataWgs84 = await epsgWrite(domainesIds, filesPath, tsvDatasCleaned)
    //On verifie
    const titresCamino = require(path.join(
      filesPath,
      'graphiql_point_etape_demarche.json'
    ))
    //rename epsgImport
    const logCorrespondance = await epsgImport(dataWgs84, titresCamino)
    await fs.writeFile(
      path.join(filesPath, 'logCorrespondance.json'),
      JSON.stringify(logCorrespondance)
    )
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}
run()
