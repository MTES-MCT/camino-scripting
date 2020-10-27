const { readFileSync, writeFileSync } = require('fs')

const slugify = require('@sindresorhus/slugify')
const {substancesCreate, substancesGet} = require("./substances");
const { toLowerCase, padStart } = require("./_utils");
const titresReferencesRntmCamino = require('../sources/json/titres-references-rntm-camino.json')
const domaineGet = require("./domaine");
const {nomGet} = require("./nom");
const {substancesAllGet} = require("./substances");
const {substancesPrincipalesGet} = require("./substances");
const json2csv = require('json2csv').parse



let nbErrors = 0
let nbTitresIgnores = 0

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

const featureFormat = (geojsonFeature, reportRow) => {

  const errors = []
  const messages = []

  const props = geojsonFeature.properties

  const substancesPrincipales = substancesPrincipalesGet(props, reportRow);
  const domaineId = domaineGet(substancesPrincipales, props.Code, reportRow)
  const substances = substancesAllGet(props, domaineId, reportRow)

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

  const titreNom = nomGet(props.Nom, reportRow)

  let demarcheEtapeDate = (props.Date_octroi || '').replace(/\//g, '-')
  if (demarcheEtapeDate === '') {
    demarcheEtapeDate = '21-04-1810'
    // reportRow['Remarque date'] = `Pas de date d’octroi de définie`
  }
  // reportRow['Résultat date'] = demarcheEtapeDate

  const demarcheEtapeDateFin = (props.Date_peremption || '').replace(/\//g, '-')

  const dateId = demarcheEtapeDate.slice(0, 4)

  const titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)
  // reportRow['Résultat titreId'] = titreId

  const demarcheId = 'oct'

  const titreDemarcheId = `${titreId}-${demarcheId}01`

  const etapeId = 'dpu'

  const titreEtapeId = `${titreDemarcheId}-${etapeId}01`

  const titresSubstances = substancesCreate(substances, titreEtapeId)

  const titulaire = props.titulaire
  const entreprises = [
    {
      id: props.entreprise_id,
      nom: toLowerCase(titulaire)
    }
  ]



  if (messages.length) {
    console.log(props.Code, "-", props.Nom, "-", props.Substances_principales_concessibles, "-", props.Substances_produites ,"-", props.Autres_substances)

    messages.forEach(e => console.log('\t-', e))
  }

  if (errors.length) {
    errors.forEach(e => console.error('\t-', e))
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
            "rnt": props.idtm
          }
        : undefined
    },
    titresSubstances,
    titresDemarches: [
      {
        id: titreDemarcheId,
        typeId: demarcheId,
        titreId,
        statutId: 'ind',
        ordre: 1
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
        duree: undefined,
        dateFin: demarcheEtapeDateFin,
        surface: props.surf_off || undefined
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

  const reportColumns =
      ["Code", "Nom", "Substances_principales_concessibles", "Substances_produites", "Autres_substances"]

  const report = []
  const titres = geos.features.reduce((titres, f) => {

    const reportRow = reportColumns.reduce((acc, c) => ({...acc, [c]: f.properties[c]}), {})
    report.push(reportRow)

    const code = f.properties.Code;

    // console.log(code, "-", f.properties.Nom)

    const titreCamino = titresReferencesRntmCamino.find( tf => tf.type_id === 'rnt' && tf.nom === code)
    reportRow['Camino'] = ''
    if (titreCamino) {
      // console.log(`\t- Titre ignoré car existant dans la base Camino ${titreCamino.titre_id}`)
      nbTitresIgnores++
      reportRow['Camino'] = `https://camino.beta.gouv.fr/titres/${titreCamino.titre_id}`
      return titres
    }

    const titre = featureFormat(f, reportRow);

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  try {
    const csv = json2csv(report)
    writeFileSync('./results/rapport.csv', csv, )
  } catch (err) {
    console.error(err)
  }

  console.log(`${titres.length} titres ont été traités`)
  console.log(`${nbTitresIgnores} titres non traités car déjà existant dans Camino`)
  console.log(`dont ${nbErrors} titres avec au moins une erreur`)
  console.log(`dont ${titres.length - nbErrors} avec aucune erreur`)
}

main()
