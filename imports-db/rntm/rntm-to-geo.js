const { readFileSync } = require('fs')
const json2csv = require('json2csv').parse

const geos = JSON.parse(readFileSync('../sources/json/rntm.geojson').toString())

const fields = [
  'idtm',
  'nomtitre',
  'titulaire',
  'dateperemp',
  'date_oct',
  'subst_1',
  'subst_1_prod',
  'subst_2',
  'statut',
  'coordinates'
]

function formatDate(str) {
  if (!str) return ''
  const [d, m, y] = str.split('/')
  return `${y}-${m}-${d}`
}

async function main() {
  const valid = geos.features
    //    .filter(a => a.properties.Statut === 'Valide')
    .map(a => ({
      ...a.properties,
      coordinates: JSON.stringify(a.geometry.coordinates)
    }))
    .map(a => {
      let {
        Code: idtm,
        Nom: nomtitre,
        Date_octroi: date_oct = '',
        Date_peremption: dateperemp = '',
        Dernier_titulaire: titulaire = '',
        Substances_principales_concessibles: subst_1,
        Substances_produites: subst_1_prod,
        Autres_substances: subst_2,
        Statut: statut,
        coordinates
      } = a

      if (titulaire && titulaire.match(/^(SAS|SASU|SARL|EURL)/)) {
        const [raison, ...rest] = titulaire.split(' ')
        titulaire = [...rest, `(${raison})`].join(' ')
      }

      dateperemp = formatDate(dateperemp)
      date_oct = formatDate(date_oct)

      return {
        idtm,
        nomtitre,
        titulaire,
        dateperemp,
        date_oct,
        subst_1,
        subst_1_prod,
        subst_2,
        statut,
        coordinates
      }
    })

  const opts = { fields }

  try {
    const csv = json2csv(valid, opts)
    console.log(csv)
  } catch (err) {
    console.error(err)
  }
}

main()
