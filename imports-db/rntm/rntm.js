const { readFileSync, writeFileSync } = require('fs')

const slugify = require('@sindresorhus/slugify')
const {substancesCreate, substancesGet} = require("./substances");
const { toLowerCase, padStart } = require("./_utils");
const titresReferencesRntmCamino = require('../sources/json/titres-references-rntm-camino.json')
const titresIdsCamino = require('../sources/json/titres-ids-camino.json')
const domaineGet = require("./domaine");
const {nomGet} = require("./nom");
const {substancesAllGet} = require("./substances");
const {substancesPrincipalesGet} = require("./substances");
const json2csv = require('json2csv').parse

let nbErrors = 0
let nbTitresIgnores = 0

const titreIdGet = (domaineId, typeId, titreNom, index, dateId, titreIds) => {
  let titreId
  if (index === 1) {
    titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)
  }else {
    titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${index}-${dateId}`)
  }
  if (titreIds.includes(titreId)) {
    return titreIdGet(domaineId, typeId, titreNom, index+1, dateId, titreIds)
  }

  return titreId;
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

const typesCamino = {
  PEC: 'pc',
  Concession: 'cx',
  'Permis de recherche': 'pr',
  "Permis d'exploitation": 'px',
  'Non défini': 'in'
}

const featureFormat = (geojsonFeature, titreIds, reportRow) => {

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
      throw new Error(`Type inconnu (${type})`)
    }

    return typeId
  })(props)

  const titreNom = nomGet(props.Nom, reportRow)

  let demarcheEtapeDate = (props.Date_octroi || '').replace(/\//g, '-')
  if (demarcheEtapeDate === '') {
    //On essaie de chercher la date dans le nom
    const year = nom.match(/ *\d\d\d\d*/)
    if (year) {
      reportRow['Remarque date'] = `On prend l’année qui est dans le nom du titre`
      demarcheEtapeDate = `01-01-${year[0]}`
    }

    if (demarcheEtapeDate === '') {
      demarcheEtapeDate = '21-04-1810';
      reportRow['Remarque date'] = `Pas de date d’octroi de définie`
    }
  }
  reportRow['Résultat date'] = demarcheEtapeDate

  const demarcheEtapeDateFin = (props.Date_peremption || '').replace(/\//g, '-')

  const dateId = demarcheEtapeDate.slice(6)

  const titreId = titreIdGet(domaineId, typeId, titreNom, 1, dateId, titreIds)
  reportRow['Résultat titreId'] = titreId

  const demarcheId = 'oct';

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

    const titreCamino = titresReferencesRntmCamino.find( tf => tf.type_id === 'rnt' && tf.nom === code)
    reportRow['Camino'] = ''
    if (titreCamino) {
      nbTitresIgnores++
      reportRow['Camino'] = `https://camino.beta.gouv.fr/titres/${titreCamino.titre_id}`
      return titres
    }

    const titresIds = titres.map(t => t.titres.id)
    const titre = featureFormat(f, titresIds, reportRow);

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  const titresIds = titres.map(t => t.titres.id)
  const duplicateIds = [...new Set(titresIds.filter((item, index) => titresIds.indexOf(item) !== index))]
  if( duplicateIds.length){
    duplicateIds.forEach(id => console.log(id))
    throw new Error("Il y a des ids de titres en double")
  }

  //vérifie que ces ids ne sont pas déjà présents dans Camino
  const existingIds = titresIdsCamino.map(t => t.id).filter(value => titresIds.includes(value))
  if (existingIds.length) {
    existingIds.forEach(id => console.log(id))
    throw new Error("Il y a des ids de titres déjà existants dans Camino")
  }

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
