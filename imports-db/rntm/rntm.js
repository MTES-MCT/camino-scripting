const { readFileSync } = require('fs')

const slugify = require('@sindresorhus/slugify')
const substancesLookup = require("./substances");
const { toLowerCase, padStart } = require("./_utils");

let nbErrors = 0

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
  "Permis d'exploitation": 'px',
  'Non défini': 'in'
}

const featureFormat = geojsonFeature => {

  const errors = []

  const substancesCreate = (substances, titreEtapeId) =>
    substances.map(s => ({
      titreEtapeId,
      substanceId: s.id
    }))


  const props = geojsonFeature.properties

  const substancesPrincipales = substancesLookup(
    props.Substances_principales_concessibles
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

  const domaineIds = [...new Set(substancesToutes.map(s => s.domaine))];
  let domaineId
  if (domaineIds.length === 0) {
    // Si pas de substance, on met de domaine "inconnu"
    domaineId = 'i'
  }else if( domaineIds.length === 1){
    domaineId = domaineIds[0]
  }else {
    // errors.push(`Plusieurs domaines possibles : ${substancesToutes.map(s => s.alias + `(${s.domaine})`).join(", ")}` )
    domaineId = 'i'
  }

  const typeId = (({ Nature: type }) => {
    let typeId;
    if (!type) {
      typeId = 'in'
    }else {
      typeId = typesCamino[type];
    }

    if (!typeId) {
      errors.push(`Type inconnu (${type})`)
      return null
    }

    return typeId
  })(props)

  const titreNom = toLowerCase(props.Nom)

  const demarcheEtapeDate = (props.Date_octroi || '').replace(/\//g, '-')
  if (demarcheEtapeDate === '') {
    //TODO
    // errors.push('Date manquante')
  }

  const demarcheEtapeDateFin = (props.Date_peremption || '').replace(/\//g, '-')

  const duree =
    +demarcheEtapeDateFin.slice(4, 9) - +demarcheEtapeDate.slice(4, 9)


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

  if (errors.length) {
    console.log(props.Code, '-', titreNom)
    errors.forEach(e =>
    console.log('\t-', e))
    nbErrors++
  }

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
  };
}

const main = () => {
  const geos = JSON.parse(
    readFileSync('../sources/json/rntm.geojson').toString()
  )

  const titres = geos.features.reduce((titres, f) => {

    //Corrections manuelles
    if (f.properties.Code === '19TM0143') {
      // Substances_principales_concessibles: 'Or, argent antimoine, tungstène',
      f.properties.Substances_principales_concessibles = 'Or, argent, antimoine, tungstène'
    }

    const titre = featureFormat(f);

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  console.log(`${titres.length} titres ont été traités`)
  console.log(`dont ${nbErrors} titres avec au moins une erreur`)
  console.log(`dont ${titres.length - nbErrors} avec aucune erreur`)
}

main()
