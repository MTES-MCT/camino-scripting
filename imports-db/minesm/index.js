const fs = require('fs')
const mdb = require('mdb')

const filePath = process.argv[2]
if (!filePath) {
  console.error('usage: node . path/to/file.mdb')
  process.exit(1)
}

const base = mdb(filePath)

base.tables((err, tables) => {
  if (err) {
    console.error(err)
    return
  }

  tables.forEach(table => {
    base.toCSV(table, (err, csv) => {
      if (err) {
        console.error(table, err)
        return
      }

      console.log(table, csv.split('\n').length - 1 + ' lines')

      fs.writeFileSync(`./exports/minesm-${table.toLowerCase()}.csv`, csv)
    })
  })
})
