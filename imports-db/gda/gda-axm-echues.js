const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const slugify = require('@sindresorhus/slugify')

const padStart = (n, i, c) => n.toString().padStart(i, c)

const monthDiff = (dateFrom, dateTo) => {
  return (
    dateTo.getMonth() -
    dateFrom.getMonth() +
    12 * (dateTo.getFullYear() - dateFrom.getFullYear())
  )
}

const pointsCreate = (titreEtapeId, contour, contourId, groupeId) =>
  contour.reduce((r, [x, y], pointId) => {
    if (pointId === contour.length - 1) return r

    r.push({
      id: `${titreEtapeId}-g${padStart(groupeId + 1, 2, 0)}-c${padStart(
        contourId + 1,
        2,
        0
      )}-p${padStart(pointId + 1, 4, 0)}`,
      titreEtapeId,
      coordonnees: { x, y },
      groupe: groupeId + 1,
      contour: contourId + 1,
      point: pointId + 1,
      nom: String(pointId + 1),
      description: null,
      securite: null
    })

    return r
  }, [])

async function main() {
  const names = [
    'titres',
    'typetr',
    'demandeurs',
    'prolongation',
    'activite',
    'avis'
  ]

  const tables = await Promise.all(
    names.map(async table => {
      const csvFilePath = `../sources/csv/gda_${table}.csv`

      const data = await csv().fromFile(csvFilePath)

      return { table, data }
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

  const gdas = result[0].data

  const geos = await csv().fromFile('../sources/csv/cartog-aex-full.csv')

  // const lot = await csv().fromFile('../sources/csv/axm-echues-carto-pdf.csv')
  const lot = await csv().fromFile('../sources/csv/axm-echues-carto-lot-2.csv')
  // const lot = await csv().fromFile('../sources/csv/axm-echues-no-carto-lot-3-gda.csv')

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

  const entreprisesNoSiren = []

  const entreprisesCreate = lines =>
    lines.reduce((entreprises, l) => {
      let siren = l.demandeur

      if (!siren) {
        if (entreprisesNoSiren.includes(l.titulaire.toLowerCase())) {
          return entreprises
        }

        siren = `973${padStart(entreprisesNoSiren.length + 1 + 9, 9 - 3, '0')}`

        entreprisesNoSiren.push(l.titulaire.toLowerCase())
      } else if (!l.demandeur.match(/^xx-/)) {
        siren = l.demandeur.replace(/[^0-9]/g, '').slice(0, 9)
      }

      const id = siren.match(/^xx-/) ? siren : `fr-${siren}`

      const entreprise = {
        id,
        nom: l.titulaire,
        legalSiren: siren.match(/^xx-/) ? '' : siren
      }

      l.demandeur = entreprise

      if (entreprises.find(e => e.siren === siren)) {
        return entreprises
      }

      entreprises.push(entreprise)

      return entreprises
    }, [])

  const activiteDateCreate = ({ annee, trimestre }) => {
    if (trimestre === '4') {
      annee = +annee + 1
      trimestre = 0
    }

    const date = new Date(Date.UTC(annee, trimestre * 3, 1))
    const dateStr = date.toISOString().slice(0, 10)

    return dateStr
  }

  const activiteContenuCreate = a => {
    const contenu = {
      renseignements: {
        orBrut:
          a.production_au &&
          Math.round(a.production_au.replace(/,/g, '') * 100) / 100,
        mercure:
          a.perte_hg && Math.round(a.perte_hg.replace(/,/g, '') * 100) / 100,
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

    if (a.declaration === '1') {
      contenu.travaux = [...new Array(3)].reduce(
        (r, e, i) => (
          (r[i + 1 + (a.trimestre - 1) * 3] = 'exploitationEnCours'), r
        ),
        {}
      )
    }

    return JSON.stringify(contenu)
  }

  const titreActiviteCreate = (l, a, build = () => true) => {
    if (a.annee === '2018' || a.declaration === '0') return null

    const { titre } = l

    // si le titre est un permis de recherche
    // alors le type d'activité est GRR (rapport de recherches)
    // sinon le type d'activité est GRP (rapport de production)
    const activiteTypeId = l.type.match('PER') ? 'grr' : 'grp'

    const id = `${l.id}-${activiteTypeId}-${a.annee}-${padStart(
      a.trimestre,
      2,
      '0'
    )}`

    const props = build(a, id)
    if (!props) return null

    const titreActivite = {
      id,
      titreId: titre.id,
      utilisateurId: null,
      date: activiteDateCreate(a),
      dateSaisie: '',
      contenu: a.declaration !== '0' ? activiteContenuCreate(a) : null,
      activiteTypeId: activiteTypeId,
      activiteStatutId: a.declaration === '0' ? 'abs' : 'dep',
      frequencePeriodeId: +a.trimestre,
      annee: +a.annee,
      ...props
    }

    return titreActivite
  }

  const titresActivitesCreate = (lot, joined) =>
    lot.reduce((titresActivites, l) => {
      const titre = joined.find(t => t.num_titre === l.num_titre)
      if (!titre || !titre.activites.length) return titresActivites

      const { titreActivites } = titre.activites.reduce(
        ({ index, titreActivites }, a) => {
          const titreActivite = titreActiviteCreate(l, a, (a, id) => {
            if (!index[id]) return true

            // les activités dans GDA peuvent être en double pour un même couple titre/période
            // si l'activité précédente est une déclaration (différent de 0), on ignore celle-ci
            if (index[id].declaration !== '0') return null

            // suppression de l'ancienne activité, basée sur une non-déclaration (= 0)
            const i = titreActivites.findIndex(a => a.id === id)
            titreActivites.splice(i, 1)

            return true
          })

          if (!titreActivite) return { index, titreActivites }

          titreActivites.push(titreActivite)

          index[titreActivite.id] = a

          return { index, titreActivites }
        },
        { index: {}, titreActivites: [] }
      )

      l.titre.activites = titreActivites

      return titresActivites.concat(titreActivites)
    }, [])

  const titresCreate = (lines, typeId) =>
    lines.reduce(
      ({ titresIds, titres }, l) => {
        // l'id est déjà pris
        if (titresIds[l.id]) {
          console.error('old:', l.id)

          const n = titresIds[l.id] + 1

          titresIds[l.id] = n

          l.id = l.id.replace(/-(\d{4})$/, `-${n}-$1`)
          l.nomtitre = `${l.nomtitre} (${n})`

          console.error('new:', l.id)
        }

        l.titre = {
          id: l.id,
          nom: l.nomtitre,
          typeId,
          domaineId: 'm',
          statutId: 'ind',
          references: [
            {
              typeId: 'dea',
              nom: l.idtm
            }
          ],
          demarches: []
        }

        titresIds[l.id] = (titresIds[l.id] | 0) + 1

        titres.push(l.titre)

        return { titresIds, titres }
      },
      { titresIds: {}, titres: [] }
    ).titres

  const titreDemarcheCreate = (l, titre, typeId, build = () => true) => {
    const ordre = titre.demarches.length + 1

    const ordreTypeId =
      titre.demarches.filter(e => e.typeId === typeId).length + 1
    const id = `${titre.id}-${typeId}${padStart(ordreTypeId, 2, 0)}`

    const props = build(l, id)
    if (!props) return null

    const titreDemarche = {
      id,
      typeId,
      titreId: titre.id,
      statutId: 'ind',
      ordre,
      annulationTitreDemarcheId: null,
      etapes: []
    }

    return titreDemarche
  }

  const titresDemarchesCreate = (lines, typeId, build = () => true) =>
    lines.reduce((titresDemarches, { titre, ...l }) => {
      const titreDemarche = titreDemarcheCreate(l, titre, typeId, build)
      if (!titreDemarche) return titresDemarches

      titre.demarches.push(titreDemarche)

      titresDemarches.push(titreDemarche)

      return titresDemarches
    }, [])

  const titreEtapeCreate = (l, demarche, typeId, build = () => true) => {
    const ordre = demarche.etapes.length + 1

    const ordreTypeId =
      demarche.etapes.filter(e => e.typeId === typeId).length + 1

    const id = `${demarche.id}-${typeId}${padStart(ordreTypeId, 2, 0)}`

    const props = build(l, id)
    if (!props) return null

    const titreEtape = {
      id,
      typeId,
      titreDemarcheId: demarche.id,
      statutId: 'fai',
      ordre,
      date: '',
      duree: null,
      surface: null,
      points: [],
      substances: [],
      titulaires: [],
      ...props
    }

    return titreEtape
  }

  const titresEtapesCreate = (lines, typeId, build = () => true) =>
    lines.reduce((titresEtapes, l) => {
      const [demarche] = l.titre.demarches

      const titreEtape = titreEtapeCreate(l, demarche, typeId, build)
      if (!titreEtape) return titresEtapes

      demarche.etapes.push(titreEtape)

      titresEtapes.push(titreEtape)

      return titresEtapes
    }, [])

  const entreprises = entreprisesCreate(lot)

  const titres = titresCreate(lot, 'axm')

  const titresDemarchesOct = titresDemarchesCreate(lot, 'oct')

  const titreEtapePropsCreate = (date, l, titreEtapeId) => ({
    date,
    surface: +l.surf_off,
    points: l.coordinates
      ? JSON.parse(l.coordinates).reduce(
          (res, points, contourId) =>
            res.concat(pointsCreate(titreEtapeId, points, contourId, 0)),
          []
        )
      : [],
    titulaires: [l.demandeur],
    substances: [{ id: 'auru' }],
    // lot-2 : carto incertaine
    incertitudes: { points: true }
  })

  const titresEtapesMdp = titresEtapesCreate(
    lot,
    'mdp',
    ({ date_ar_prefecture: date, ...l }, titreEtapeId) =>
      date && titreEtapePropsCreate(date, l, titreEtapeId)
  )

  const titresEtapesMco = titresEtapesCreate(
    lot,
    'mco',
    ({ date_demande_plus: date }) => date && { date }
  )

  const titresEtapesRco = titresEtapesCreate(
    lot,
    'rco',
    ({ date_reception_plus: date }) => date && { date }
  )

  const avisCommission = {
    //    1: 'reserve',
    2: 'fav',
    3: 'def',
    4: 'fai',
    //    5: 'pas_dobservation',
    6: 'ajo'
    //    7: 'afr (?)'
  }

  const titresEtapesApo = titresEtapesCreate(
    lot,
    'apo',
    ({ date_commission: date, ...l }) =>
      date && {
        date,
        statutId: avisCommission[l.avis_commission] || 'fai'
      }
  )

  const titresEtapesRet = titresEtapesCreate(
    lot,
    'ret',
    ({ date_renonciation: date }) => date && { date }
  )

  const titresEtapesDex = titresEtapesCreate(
    lot,
    'dex',
    ({ date_octroi: date, date_oct: date2, ...l }, titreEtapeId) =>
      (date || date2) && {
        ...titreEtapePropsCreate(date || date2, l, titreEtapeId),
        duree: +l.Durée * 12,
        statutId: 'acc'
      }
  )

  if (false) {
    const titresDemarchesPro = titresDemarchesCreate(
      lot,
      'pro',
      l => l.prolongation === '1'
    )
  }

  const titresDemarchesPro = lot.reduce((titresDemarchesPro, l) => {
    const titre = joined.find(t => t.num_titre === l.num_titre)
    if (!titre || !titre.prolongations.length) return titresDemarchesPro

    const titreDemarchesPro = titre.prolongations.map(p => {
      const titreDemarchePro = titreDemarcheCreate(l, l.titre, 'pro')

      l.titre.demarches.push(titreDemarchePro)

      const titreEtapeProMdp = titreEtapeCreate(
        l,
        titreDemarchePro,
        'mdp',
        () =>
          p.date_p && {
            date: p.date_p
          }
      )
      if (titreEtapeProMdp) titreDemarchePro.etapes.push(titreEtapeProMdp)

      const titreEtapeProDex = titreEtapeCreate(
        l,
        titreDemarchePro,
        'dex',
        () => {
          if (!p.date_octroi) return null

          const duree = monthDiff(
            new Date(p.date_octroi),
            new Date(p.date_echeance)
          )

          return {
            date: p.date_octroi,
            dateFin: p.date_echeance,
            duree,
            statutId: 'acc'
          }
        }
      )
      if (titreEtapeProDex) titreDemarchePro.etapes.push(titreEtapeProDex)

      return titreDemarchePro
    })

    return titresDemarchesPro.concat(titreDemarchesPro)
  }, [])

  if (false)
    console.log(
      titres
        .flatMap(t => t.demarches.flatMap(d => d.etapes.map(e => e.id)))
        .join('\n')
    )

  const titresActivites = titresActivitesCreate(lot, joined)

  //  console.log(titres.find(t => t.demarches.length > 1).demarches)

  console.log(JSON.stringify({ titres, entreprises }, null, 2))

  if (false) {
    try {
      const csv = json2csv(consol, opts)
      console.log(csv)
    } catch (err) {
      console.error(err)
    }
  }
}

main()
