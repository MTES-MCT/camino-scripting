const fs = require('fs')

const Parser = require('node-dbf').default

if (!process.argv[2]) {
  console.error('usage: node parse /path-to-file.dbf')

  process.exit(1)
}

console.log('parsing:', process.argv[2])

const parser = new Parser(process.argv[2], { encoding: 'latin1' })

parser.on('start', function(p) {
  console.log('dBase file parsing has started')
})

parser.on('header', function(h) {
  console.log('dBase file header has been parsed')
  console.log(h.fields.map(f => f.name).join(', '))
})

let records = []

parser.on('record', function(record) {
  console.log(
    Object.keys(record)
      .map(k => `${k}: ${record[k]}`)
      .join(', ')
  )

  records.push(record)
})

parser.on('end', function(p) {
  console.log('Finished parsing the dBase file')

  console.log('records:', records.length)

  fs.writeFileSync('aura-parsed.json', JSON.stringify(records, null, 2), {
    encoding: 'latin1'
  })
})

parser.parse()
