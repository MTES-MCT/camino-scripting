const fs = require('fs').promises
const path = require('path')

const epsgObtain = require('./epsg-obtain')
const epsgModif = require('./epsg-modif')
const epsgWrite = require('./epsg-write')

const filesPath = path.join(process.cwd(), 'files/')
const epsgContours = require(path.join(filesPath, 'epsg-block.json'))
const titresCamino = require(path.join(
  filesPath,
  'graphiql-point-etape-demarche.json'
))

const run = async () => {
  try {
    const domainesIds = ['m', 'c', 'g', 'h', 'w']

    const tsvDatas = await epsgObtain(domainesIds, filesPath)

    // On modifie les données
    // objet à retouner
    const { tsvDatasCleaned } = await epsgModif(
      domainesIds,
      filesPath,
      epsgContours,
      tsvDatas
    )

    // On ecrit
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

    console.log(`Transformé ${Object.keys(tsvDatasCleaned).length} tsv(s).`)
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}
run()
