const { Readable } = require('stream')
const { createReadStream: read, createWriteStream: write } = require('fs')
const XmlStream = require('xml-stream')
const { Transform: Json2csvTransform } = require('json2csv')

const objectFileParse = (object, full = false) =>
  new Promise((resolve, reject) => {
    console.log(object)

    const file = `onf-${object.toLowerCase()}`

    const inputPath = `./sources/xml/${file}.xml`
    const outputPath = `./exports/${file}s${full ? '' : '-light'}.csv`

    const stream = read(inputPath)
    const xml = new XmlStream(stream)

    const input = new Readable({ objectMode: true })
    input._read = () => {}

    const opts = {}
    const transformOpts = {
      objectMode: true
    }

    const output = write(outputPath, { encoding: 'utf8' })

    const json2csv = new Json2csvTransform(opts, transformOpts)
    const processor = input.pipe(json2csv).pipe(output)
    output.on('close', () => {
      console.log('csv end', object)
      resolve()
    })

    let objects = []

    xml.preserve(object)

    xml.on('error', console.error)

    xml.on(`endElement: ${object}`, data => {
      const object = data.$children.reduce((r, c) => {
        try {
          if (!full && c.$text && c.$text.length > 100) return r

          r[c.$name] = c.$text
          return r
        } catch (e) {
          console.error(e, c)
        }
      }, {})

      input.push(object)
      //input.push(null)
      //xml.close()
    })

    xml.on('end', () => {
      input.push(null)
      console.log(object, 'end')
    })
  })

async function main() {
  //const objects = ['Demandeur', 'Dossier', 'Polycoordonnee']
  const objects = [
    'Cedex',
    'Collaborateur',
    'Commission',
    'Commune',
    'Communes',
    'CPostal',
    'Declaration',
    'DemandeDeclaration',
    'DocDemandeur',
    'DocDossier',
    'DocModele',
    'Document',
    'DossierEnCommission',
    'Foret',
    'Polygone',
    'Recevabilite'
  ]

  const full = true

  await objects.reduce((res, object) => {
    console.log(object)
    return res.then(() => objectFileParse(object, full))
  }, Promise.resolve())
}

main()
