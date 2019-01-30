const csv = require('csvtojson')
const json2csv = require('json2csv').parse

function explode(obj, prefix) {
  return obj && Object.keys(obj).reduce((r, k) => (r[`${prefix}_${k}`] = obj[k], r), {})
}

async function main() {
  const gda = await csv().fromFile('./sources/csv/gda_activite.csv')
  const titres = await csv().fromFile('./sources/csv/gda_titres.csv')
  const camino = require('./sources/json/titres-m973-titres.json')

  const res = gda
          .sort((a, b) => {
            return +a.idd_titres - +b.idd_titres
          }, [])
          .map((e) => {
            const titreGda = titres.find(t => t.idd_titres === e.idd_titres) || {}
            const { num_titre: ref_deal973 } = titreGda

            const titreCamino = camino.find(t => t.references.DEAL === ref_deal973) || {}
            const { id } = titreCamino

            return {
              id,
              ref_deal973,
              ref_gda: e.idd_titres,
              annee: e.annee,
              trimestre: e.trimestre,
              or: e.production_au,
              mercure: e.perte_hg,
              volumeMinerai: e.volume_minerai,
              depensesTotales: e.montant_depense,
              carburantConventionnel: e.carburant_conso,
              effectifs: e.effectif_fin,
              deforestation: e.surface_deforet,
              declaration: e.declaration,
              camino: !!id,
            }
          })

  const fields = Object.keys(res[0])
  const opts = fields

  try {
    const csv = json2csv(res, opts)
    console.log(csv)
  } catch (err) {
    console.error(err)
  }
}

main()
