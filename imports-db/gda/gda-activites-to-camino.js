const csv = require('csvtojson')
const json2csv = require('json2csv').parse

async function buildActivites() {
  const titresGda = await csv().fromFile('../sources/csv/gda_titres.csv')
  const indexGNum = titresGda.reduce(
    (r, t) => (t.num_titre && (r[t.num_titre] = t), r),
    {}
  )
  const indexGId = titresGda.reduce(
    (r, t) => (t.idd_titres && (r[t.idd_titres] = t), r),
    {}
  )

  const activitesGda = (await csv().fromFile(
    '../sources/csv/gda_activite_2017.csv'
  )).filter(a => a.annee.match(/[0-9]{4}/))

  const activitesCamino = require('../sources/json/titres-activites')

  const indexActivitesC = activitesCamino.reduce(
    (r, a) => ((r[a.id] = a), r),
    {}
  )

  const titresCamino = require('../sources/json/titres-m973-titres')
  const indexC = titresCamino.reduce(
    (r, t) => (t.references.DEAL && (r[t.references.DEAL] = t), r),
    {}
  )

  const titresC = titresCamino.filter(t => t.references.DEAL)

  const titresGC = titresGda.filter(t => indexC[t.num_titre])
  const indexGCId = titresGC.reduce(
    (r, t) => (t.idd_titres && (r[t.idd_titres] = t), r),
    {}
  )
  const indexGCTitreCamino = titresGC.reduce(
    (r, t) => (t.idd_titres && (r[t.idd_titres] = indexC[t.num_titre]), r),
    {}
  )

  const activitesG = activitesGda
    .filter(a => indexGCId[a.idd_titres] || indexC[a.num_titre])
    .map(a => ({
      titre: indexGCTitreCamino[a.idd_titres] || indexC[a.num_titre],
      ...a
    }))

  const { activites, dups } = activitesG.reduce(
    (res, a) => {
      if (a.annee === '2018' || a.declaration === '0') return res

      const activiteTypeId = a.titre.type_id === 'prx' ? 'grr' : 'grp'

      const id = `${a.titre.id}-${activiteTypeId}-${
        a.annee
      }-${a.trimestre.toString().padStart(2, '0')}`

      if (res.index[id]) {
        // les activités dans GDA peuvent être en double pour un même couple titre/période
        // si l'activité précédente est une déclaration (différent de 0), on ignore celle-ci
        if (res.index[id].declaration !== '0') return res

        // suppression de l'ancienne activité, basée sur une non-déclaration (= 0)
        const i = res.activites.findIndex(a => a.id === id)
        res.activites.splice(i, 1)
      }

      let annee = a.annee
      let trimestre = a.trimestre

      if (a.trimestre === '4') {
        annee = +a.annee + 1
        trimestre = 0
      }

      const date = new Date(Date.UTC(annee, trimestre * 3, 1))
        .toISOString()
        .slice(0, 10)

      let contenu

      if (a.declaration !== '0') {
        contenu = {
          renseignements: {
            orBrut:
              a.production_au &&
              Math.round(a.production_au.replace(/,/g, '') * 100) / 100,
            mercure:
              a.perte_hg &&
              Math.round(a.perte_hg.replace(/,/g, '') * 100) / 100,
            volumeMinerai:
              a.volume_minerai &&
              Math.round(a.volume_minerai.replace(/,/g, '') * 100) / 100,
            depensesTotales:
              a.montant_depense &&
              Math.round(a.montant_depense.replace(/,/g, '') * 100) / 100,
            carburantConventionnel:
              a.carburant_conso &&
              Math.round(a.carburant_conso.replace(/,/g, '') * 100) / 100,
            effectifs: a.effectif_fin
          }
        }

        if (indexActivitesC[id]) {
          return res

          const dup = Object.keys(contenu.renseignements).reduce(
            (r, k) => {
              if (contenu.renseignements[k] === undefined) return r

              const valNew = contenu.renseignements[k]
              const valOld = indexActivitesC[id].contenu.renseignements[k]

              if (valOld !== valNew) {
                r[k] = [valOld, valNew]
              }

              return r
            },
            { id }
          )

          res.dups.push(dup)

          // return res
        }

        if (a.declaration === '1') {
          contenu.travaux = [...new Array(3)].reduce(
            (r, e, i) => (
              (r[i + 1 + (a.trimestre - 1) * 3] = 'exploitationEnCours'), r
            ),
            {}
          )
        }

        contenu = JSON.stringify(contenu)
      }

      res.activites.push({
        id,
        titre_id: a.titre.id,
        utilisateur_id: null,
        date,
        date_saisie: null,
        contenu,
        activite_type_id: activiteTypeId,
        activite_statut_id: a.declaration === '0' ? 'abs' : 'dep',
        frequence_periode_id: a.trimestre,
        annee: a.annee
      })

      res.index[id] = a

      return res
    },
    { index: {}, activites: [], dups: [] }
  )

  if (dups.length) {
    dups.sort((a, b) => Object.keys(a).length - Object.keys(b).length)

    dups.forEach(({ id, ...dup }) => {
      console.log(id)
      if (Object.keys(dup).length) console.log(dup)
    })
  }

  return activites
}

async function main() {
  const result = await buildActivites()

  if (!result || !result.length) {
    console.log('empty result')
    return
  }

  const opts = { fields: Object.keys(result[0]) }

  const res = json2csv(result, opts)

  console.log(res)
}

main()
