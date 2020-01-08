const csv = require('csvtojson')
const json2csv = require('json2csv').parse

const names = [
  'titres',
  'typetr',
  'demandeurs',
  'prolongation',
  'activite',
  'avis'
]

async function main() {
  const geos = await csv().fromFile('../sources/csv/cartog-aex-full.csv')

  const lot1 = await csv().fromFile('../sources/csv/axm-echues-carto-pdf.csv')

  const tables = await Promise.all(
    names.map(async table => {
      const csvFilePath = `../sources/csv/gda_${table}.csv`

      return {
        table,
        data: await csv().fromFile(csvFilePath)
      }
    })
  )

  const result = tables.map(({ table, data }) => {
    const { 0: first, length } = data

    const cols = Object.keys(first)

    const index = data.reduce((r, line) => {
      r[line[`idd_${table}`]] = line
      return r
    }, {})

    return {
      table,
      length,
      cols,
      data,
      index,
      display: `${table} (${length}):\n- ${cols.join('\n- ')}`
    }
  })

  const l = result[0].index
  const keys = Object.keys(l)

  const gdas = result[0].data

  const joined = gdas.filter(titre => {
    titre.type = result[1].index[titre.idd_typetr].intitule
    titre.demandeur = result[2].index[titre.idd_demandeurs]
    titre.prolongations = result[3].data.filter(
      p => p.idd_titres === titre.idd_titres
    )
    titre.activites = result[4].data.filter(
      p => p.idd_titres === titre.idd_titres
    )

    const geo = geos.find(
      f => f.idtm.toLowerCase() === titre.num_titre.toLowerCase()
    )
    if (geo) {
      titre.geos = geo
    }

    return true
  })

  // const titres = joined.filter(titre => titre.geos.statut === 'valide')
  const titres = joined.filter(t => lot1.find(l => l.num_titre === t.num_titre))

  if ('titres') {
    const res = titres.map(({ geos, ...gda }) => ({ ...geos, gda }))

    const fields = Object.keys(res[0])

    const opts = { fields }

    try {
      const csv = json2csv(res, opts)
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }

  if ('type' === false) {
    const fields = Object.keys(titres[0].type)

    const opts = { fields }

    try {
      const csv = json2csv(titres.map(v => v.type), opts)
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }

  if ('demandeurs' === false) {
    const fields = Object.keys(titres.find(e => e.demandeur).demandeur)

    const opts = { fields }

    const demandeurs = Object.values(
      titres
        .map(v => v.demandeur)
        .reduce((r, d) => {
          if (!d) return r

          d.siret = d.siret.replace(/[.\s]/g, '')
          r[d.idd_demandeurs] = d
          return r
        }, {})
    )

    try {
      const csv = json2csv(demandeurs, opts)
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }

  if ('prolongations' === false) {
    const prolongs = titres.filter(v => v.prolongations.length)

    const fields = Object.keys(prolongs[0].prolongations[0])

    const opts = { fields }

    try {
      const csv = json2csv(
        titres.reduce((r, v) => r.concat(v.prolongations), []),
        opts
      )
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }

  if ('activites' === false) {
    const activites = titres.filter(v => v.activites.length)

    const fields = Object.keys(activites[0].activites[0])

    const opts = { fields }

    try {
      const csv = json2csv(
        titres.reduce((r, v) => r.concat(v.activites), []),
        opts
      )
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }

  if ('consolidation' === false) {
    const consol = geos.map(titre => {
      const gda = gdas.find(
        f => titre.idtm.toLowerCase() === f.num_titre.toLowerCase()
      )
      if (gda) {
        return { ...titre, gda }
      }
      return titre
    })

    const fields = [
      'gda.idd_titres',
      'idtm',
      'gda.num_titre',
      'nomtitre',
      'gda.localisation',
      'titulaire',
      'gda.idd_demandeurs',
      'gda.demandeur.societe',
      'gda.demandeur.siret',
      'date_oct',
      'gda.date_octroi',
      'dateperemp',
      'gda.date_echeance',
      'gda.date_renonciation',
      'subst_1',
      'subst_2',
      'surf_off',
      'gda.surface',
      'surf_sig',
      'gda.prolongations',
      'gda.activites',
      'prol',
      'coordinates'
    ]

    const opts = { fields }

    try {
      const csv = json2csv(consol, opts)
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }
}

main()
