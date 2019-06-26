const json2csv = require('json2csv').parse
const fs = require('fs')

const files = fs.readdirSync('./dreals')

const result = files.map(f => {
  const json = require(`./dreals/${f}`)

  const { properties: p } = json.features[0]

  const [a1 = {}, a2 = {}] = p.adresses

  a1.commune = a1.commune.split(' ')[0]

  return {
    id: '',
    administration_type_id: '',

    nom: p.nom,
    service: '',
    url: p.url || '',
    email: p.email || '',
    telephone: p.telephone.replace(/^0/, '+33 (0)'),
    adresse1: [...a1.lignes, `${a1.codePostal} ${a1.commune}`].join('\n'),
    adresse2:
      (a2 &&
        [...(a2.lignes || []), `${a2.codePostal} ${a2.commune}`].join('\n')) ||
      '',
    code_postal: a1.codePostal,
    commune: a1.commune,
    cedex: a1.commune.match('Cedex') ? 'Cedex' : ''
  }
})

const opts = { fields: Object.keys(result[0]) }

const res = json2csv(result, opts)

console.log(res)
