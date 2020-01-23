const titresM = require('../sources/json/titres-m-titres.json')

console.log('ptmg\ntitre_id')

titresM.forEach(t => {
  if (t.references && t.references.PTMG && t.references.PTMG.match('PTMG')) {
    console.log(`${t.references.PTMG}\t${t.id}`)
  }
})
