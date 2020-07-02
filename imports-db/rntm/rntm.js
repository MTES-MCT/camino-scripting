const { readFileSync } = require('fs')
const json2csv = require('json2csv').parse

const slugify = require('@sindresorhus/slugify')

const padStart = (n, i, c) => n.toString().padStart(i, c)
const padEnd = (n, i, c) => n.toString().padEnd(i, c)
const toLowerCase = s => (s || '').toString().toLowerCase()
const toStartCase = s =>
  toLowerCase(s).replace(/\w+/g, s => `${s[0].toUpperCase()}${s.slice(1)}`)

const substances = require('../sources/json/substances-rntm-camino.json')
const errMsg = '--------------------------------> ERROR'

const domaineGet = subs => (subs.length ? subs[0].domaine : 'inconnu')

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

const typesCamino = {
  PEC: 'pc',
  Concession: 'cx',
  'Permis de recherche': 'pr',
  "Permis d'exploitation": 'px'
}

const featureFormat = geojsonFeature => {
  const substancesCreate = (substances, titreEtapeId) =>
    substances.map(s => ({
      titreEtapeId,
      substanceId: s.id
    }))

  const substancesLookup = val =>
    (val || '')
      .replace(/, /g, ',')
      .split(/[,;]/)
      .reduce((acc, cur) => {
        cur = toLowerCase(cur).trim()

        if (!cur) return acc

        console.log({ cur })

        const sub = substances.find(
          s =>
            (s.aliases && s.aliases.includes(cur)) ||
            (cur.includes('connexes') && s.id === 'oooo')
        )

        if (!sub) {
          console.error(`Erreur: substance ${cur} non identifée`)

          throw new Error('substance')
        }

        if (cur && sub) {
          acc.push(sub)
        }

        return acc
      }, [])

  const props = geojsonFeature.properties

  const substancesPrincipales = substancesLookup(
    props.Substances_principales_concessiblesx
  )
  const substancesProduites = substancesLookup(props.Substances_produites)
  const substancesAutres = substancesLookup(props.Autres_substances)

  const substancesToutes = [
    ...new Set([
      ...substancesPrincipales,
      ...substancesProduites,
      ...substancesAutres
    ])
  ]

  const domaineId = domaineGet(substancesToutes)

  const typeId = (({ Nature: type }) => {
    const typeId = typesCamino[type]

    if (!typeId) {
      console.error('pas de correspondance pour ce type:', type)
      // process.exit(0)
      return null
    }

    return typeId
  })(props)

  const titreNom = toLowerCase(props.nomtitre)

  const demarcheEtapeDate = (props.Date_octroi || '').replace(/\//g, '-')

  const demarcheEtapeDateFin = (props.Date_peremption || '').replace(/\//g, '-')

  const duree =
    +demarcheEtapeDateFin.slice(4, 9) - +demarcheEtapeDate.slice(4, 9)

  if (demarcheEtapeDate === '') {
    console.error(`Erreur: date manquante ${titreNom}`, geojsonFeature)
  }

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

  const demarcheId = 'oct'

  const titreDemarcheId = `${titreId}-${demarcheId}01`

  const etapeId = 'dpu'

  const titreEtapeId = `${titreDemarcheId}-${etapeId}01`

  const titresSubstances = substancesCreate(substancesToutes, titreEtapeId)

  const demarchePosition = (() => {
    return 1
  })()

  const titulaire = props.titulaire
  const entreprises = [
    {
      id: props.entreprise_id,
      nom: toLowerCase(titulaire)
    }
  ]

  return {
    titres: {
      id: titreId,
      nom: titreNom,
      typeId,
      domaineId,
      statutId: 'ind',
      references: props.idtm
        ? {
            métier: props.idtm
          }
        : null
    },
    titresSubstances,
    titresDemarches: [
      {
        id: titreDemarcheId,
        typeId: demarcheId,
        titreId,
        statutId: 'ind',
        ordre: demarchePosition
      }
    ],
    titresEtapes: [
      {
        id: titreEtapeId,
        titreDemarcheId: titreDemarcheId,
        typeId: etapeId,
        statutId: 'acc',
        ordre: 1,
        date: demarcheEtapeDate,
        duree,
        dateFin: demarcheEtapeDateFin,
        surface: props.surf_off || 0
      }
    ],
    titresEmprises: {
      titreEtapeId,
      empriseId: 'ter'
    },
    titresPoints: geojsonFeature.geometry.coordinates.reduce(
      (res, points, contourId) => [
        ...res,
        ...pointsCreate(titreEtapeId, points, contourId, 0)
      ],
      []
    ),
    entreprises,
    titresTitulaires: entreprises.map(t => ({
      entrepriseId: t.id,
      titreEtapeId
    }))
  }
}

const main = () => {
  const geos = JSON.parse(
    readFileSync('../sources/json/rntm.geojson').toString()
  )

  const titres = geos.features.reduce((titres, f) => {
    const titre = featureFormat(f)

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  console.log(titres.length)
}

main()
