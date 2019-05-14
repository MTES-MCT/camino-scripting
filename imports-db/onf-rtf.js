const { writeFileSync: write } = require('fs')
const csv = require('csvtojson')

async function main() {
  const [dossier] = await csv().fromFile('./exports/onf-dossiers-single.csv')

  Object.keys(dossier).forEach(k => {
    console.log(k)

    if (dossier[k] && dossier[k].match(/^{\\rtf1/)) {
      write(`./exports/onf-${k}.rtf`, dossier[k])
    }
  })
}

main()
