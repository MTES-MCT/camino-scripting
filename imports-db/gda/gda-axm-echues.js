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

  const titresGdas = result[0].data

  const geos = await csv().fromFile('../sources/csv/cartog-aex-full.csv')

  // const filePath = '../sources/csv/axm-echues-carto-pdf.csv'
  // const filePath = '../sources/csv/axm-echues-carto-lot-2.csv'
  // const filePath = '../sources/csv/axm-echues-carto-lot-3-nocartog.csv'
  const filePath = '../sources/csv/axm-echues-carto-lot-2_3.csv'

  let lines = await csv().fromFile(filePath)

  lines = lines.filter(l => l.nomtitre)

  titresGdas.forEach(titre => {
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
        orExtrait:
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

  const titresActivitesCreate = (lines, titresGdas) =>
    lines.reduce((titresActivites, l) => {
      const titre = titresGdas.find(t => t.num_titre === l.num_titre)
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
        let date

        if (l.idtm.match(/\d{4}$/)) {
          date = l.idtm.slice(-4)
        } else {
          const dateKey = Object.keys(l).find(k => k.match('date') && l[k])
          if (dateKey) {
            date = l[dateKey].slice(0, 4)
          } else {
            const annee = l.num_dossier.slice(1, 3)

            date = `${annee[0] === '9' ? '19' : '20'}${annee}`
          }
        }

        l.id = `m-axm-${slugify(l.nomtitre)}-${date}`

        // l'id est déjà pris
        if (titresIds[l.id]) {
          const id = l.id

          const n = titresIds[l.id] + 1

          titresIds[l.id] = n

          l.id = `${l.id}-${n}`
          l.nomtitre = `${l.nomtitre} (${n})`

          console.error('old:', id, '=> new:', l.id)
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
              nom: l.idtm || l.num_dossier
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
      etapes: [],
      ...props
    }

    return titreDemarche
  }

  const titresDemarchesCreate = (lines, typeId, build = () => ({})) =>
    lines.reduce((titresDemarches, { titre, ...l }) => {
      const titreDemarche = titreDemarcheCreate(l, titre, typeId, build)
      if (!titreDemarche) return titresDemarches

      titre.demarches.push(titreDemarche)

      titresDemarches.push(titreDemarche)

      return titresDemarches
    }, [])

  const titreEtapeCreate = (l, demarche, typeId, build = () => ({})) => {
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

  const titresEtapesCreate = (lines, typeId, build = () => ({})) =>
    lines.reduce((titresEtapes, l) => {
      const [demarche] = l.titre.demarches

      const titreEtape = titreEtapeCreate(l, demarche, typeId, build)
      if (!titreEtape) return titresEtapes

      demarche.etapes.push(titreEtape)

      titresEtapes.push(titreEtape)

      return titresEtapes
    }, [])

  const entreprises = entreprisesCreate(lines)

  const titres = titresCreate(lines, 'axm')

  const titresDemarchesOct = titresDemarchesCreate(lines, 'oct')

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
    incertitudes: l.coordinates ? { points: true } : null
  })

  const titresEtapesMdp = titresEtapesCreate(
    lines,
    'mdp',
    ({ date_ar_prefecture: date, date_ar_drire: date2, ...l }, titreEtapeId) =>
      (date || date2) && titreEtapePropsCreate(date || date2, l, titreEtapeId)
  )

  const titresEtapesMco = titresEtapesCreate(
    lines,
    'mco',
    ({ date_demande_plus: date }) => date && { date }
  )

  const titresEtapesRco = titresEtapesCreate(
    lines,
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
    lines,
    'apo',
    ({ date_commission: date, ...l }) =>
      date && {
        date,
        statutId: avisCommission[l.avis_commission] || 'fai'
      }
  )

  const titresEtapesDex = titresEtapesCreate(
    lines,
    'dex',
    ({ date_octroi: date, date_oct: date2, rejet, ...l }, titreEtapeId) =>
      (date || date2) && {
        ...titreEtapePropsCreate(date || date2, l, titreEtapeId),
        duree: +l.Durée * 12,
        statutId: rejet === '1' ? 'rej' : 'acc'
      }
  )

  const titresEtapesMcr = titresEtapesCreate(
    lines,
    'mcr',
    ({ date_classement: date, classement_ss: classement }) => {
      if (!date && classement !== '1') return null

      return {
        date,
        statutId: 'def'
      }
    }
  )

  const titresEtapesRet = titresEtapesCreate(
    lines,
    'ret',
    ({ date_retrait_demande: date }) => date && { date, statutId: 'fai' }
  )

  if (false) {
    const titresDemarchesPro = titresDemarchesCreate(
      lines,
      'pro',
      l => l.prolongation === '1'
    )
  }

  // `titresDemarchesCreate` n'est pas utilisable
  // car il faut pouvoir créer plusieurs démarches de prolongation par ligne
  const titresDemarchesPro = lines.reduce((titresDemarchesPro, l) => {
    const titre = titresGdas.find(t => t.num_titre === l.num_titre)
    if (!titre || !titre.prolongations.length) return titresDemarchesPro

    const titreDemarchesPro = titre.prolongations.map(p => {
      const titreDemarchePro = titreDemarcheCreate(l, l.titre, 'pro')

      l.titre.demarches.push(titreDemarchePro)

      const titreEtapeProMdp = titreEtapeCreate(
        l,
        titreDemarchePro,
        'mdp',
        () => p.date_p && { date: p.date_p }
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

  const titresDemarchesRen = titresDemarchesCreate(lines, 'ren', (l, id) => {
    if (!l.date_renonciation) return null

    const titreDemarcheRen = {
      id,
      etapes: []
    }

    const titreEtapeRenDex = titreEtapeCreate(
      l,
      titreDemarcheRen,
      'dex',
      ({ date_renonciation: date }) => ({ date, statutId: 'acc' })
    )
    if (titreEtapeRenDex) titreDemarcheRen.etapes.push(titreEtapeRenDex)

    return titreDemarcheRen
  })

  const titresDemarchesRet = titresDemarchesCreate(lines, 'ret', (l, id) => {
    if (!l.date_retrait_sanction) return null

    const titreDemarcheRet = {
      id,
      etapes: []
    }

    const titreEtapeRetDex = titreEtapeCreate(
      l,
      titreDemarcheRet,
      'dex',
      ({ date_retrait_sanction: date }) => ({ date, statutId: 'acc' })
    )
    if (titreEtapeRetDex) titreDemarcheRet.etapes.push(titreEtapeRetDex)

    return titreDemarcheRet
  })

  if (false)
    console.log(
      titres
        .flatMap(t => t.demarches.flatMap(d => d.etapes.map(e => e.id)))
        .join('\n')
    )

  const titresActivites = titresActivitesCreate(lines, titresGdas)

  console.log(JSON.stringify({ titres, entreprises }, null, 2))
}

main()
