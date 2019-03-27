const epsgObtain = require('./epsg-obtain.js')
const epsgModif = require('./epsg-modif.js')
const epsgWrite = require('./epsg-write.js')
const fs = require('fs').promises
const path = require('path')

const run = async () => {
  try {
    const filesPath = path.join(process.cwd(), 'files/')
    const domainesIds = ['w', 'c', 'g', 'h', 'm']
    //Get the data
    const jsonContent = await epsgObtain(domainesIds, filesPath)
    const filePath = path.join(process.cwd(), '/files/epsg-block.json')
    const fileString = await fs.readFile(filePath, 'utf8')
    const blockEpsg = JSON.parse(fileString.toString())

    //Modify the data
    const [logs, datas] = await epsgModif(
      blockEpsg,
      jsonContent,
      domainesIds,
      filesPath
    )
    //Write the data
    const dataRef = await epsgWrite(datas, filesPath, domainesIds)
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}
run()
