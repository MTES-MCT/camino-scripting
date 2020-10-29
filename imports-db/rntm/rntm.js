const { readFileSync, writeFileSync } = require('fs')
const cryptoRandomString = require('crypto-random-string')

const slugify = require('@sindresorhus/slugify')
const { toLowerCase, padStart } = require("./_utils");
const titresReferencesRntmCamino = require('../sources/json/titres-references-rntm-camino.json')
const titresIdsCamino = require('../sources/json/titres-ids-camino.json')
const rntmDebReferences = require('../sources/json/rntm_deb_references.json')
const domaineGet = require("./domaine");
const {nomGet} = require("./nom");
const {substancesAllGet} = require("./substances");
const {substancesPrincipalesGet} = require("./substances");
const json2csv = require('json2csv').parse

let nbErrors = 0
let nbTitresIgnores = 0

const titreIdGet = (domaineId, typeId, titreNom, dateId, titreIds) => {
  let titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)
  if (titreIds.includes(titreId)) {
    const hash = cryptoRandomString({ length: 8 })
    titreId = slugify(`${titreId}-${hash}`)
    console.log(titreId)
  }

  return titreId;
}

const dateReverse = (date) => date ? `${date.substr(6, 4)}-${date.substr(3, 2)}-${date.substr(0, 2)}` : ''

const pointsContourCreate = (titreEtapeId, rntmId, contour, contourId, groupeId) => {
  //Corrections manuelles de la dimension de certains titres
  if (rntmId === '67TM0513') {
    return contour.reduce((acc, c, cId) => [...acc, ...pointsCreate(titreEtapeId, c, cId, groupeId)], [])
  }else if(["09TM0215", "57TM0053", "57TM0138", "57TM0139", "74TM0033", "76TM0003"].includes(rntmId)){
    return pointsCreate(titreEtapeId, contour[0], contourId, groupeId)
  }else if(["57TM0030", "67TM0459", "67TM0511", "68TM0174", "88TM0013"].includes(rntmId)){
    return []
  }
  return pointsCreate(titreEtapeId, contour, contourId, groupeId)
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
  reportRow['Résultat type'] = `${typeId}${domaineId}`

  const titreNom = nomGet(props.Nom, reportRow);

  let demarcheEtapeDate = dateReverse(props.Date_octroi)
  if (demarcheEtapeDate === '') {
    //On essaie de chercher la date dans le nom
    const year = nom.match(/ *\d\d\d\d*/)
    if (year) {
      reportRow['Remarque date'] = `On prend l’année qui est dans le nom du titre`
      demarcheEtapeDate = `${year[0]}-01-01`
    }else {
      demarcheEtapeDate = '1810-04-21';
      reportRow['Remarque date'] = `Pas de date d’octroi de définie`
    }
  }
  reportRow['Résultat date'] = demarcheEtapeDate

  let demarcheEtapeDateFin = dateReverse(props.Date_peremption)

  const dateId = demarcheEtapeDate.substr(0,4);

  const titreId = titreIdGet(domaineId, typeId, titreNom, dateId, titreIds)
  reportRow['Résultat titreId'] = titreId

  const demarcheId = 'oct';

  const titreDemarcheId = `${titreId}-${demarcheId}01`

  const etapeId = 'dpu'

  const titreEtapeId = `${titreDemarcheId}-${etapeId}01`

  const titulaire = props.titulaire
  const entreprises = [
    {
      id: props.entreprise_id,
      nom: toLowerCase(titulaire)
    }
  ]

  const references = [{
        titreId,
        typeId: 'rnt',
        nom: props.Code
      }]

  if(rntmDebReferences.hasOwnProperty(props.Code)){
    references.push({
      titreId,
      typeId: 'deb',
      nom: rntmDebReferences[props.Code]
    })
  }

  return {
      id: titreId,
      nom: titreNom,
      typeId: `${typeId}${domaineId}`,
      domaineId,
      statutId: 'ind',
      substancesTitreEtapeId: titreDemarcheId,
      pointsTitreEtapeId: titreDemarcheId,
      references,
      demarches: [{
        id: titreDemarcheId,
        typeId: demarcheId,
        titreId,
        statutId: 'ind',
        ordre: 1,
        etapes: [
          {
            id: titreEtapeId,
            titreDemarcheId: titreDemarcheId,
            typeId: etapeId,
            statutId: 'acc',
            ordre: 1,
            date: demarcheEtapeDate,
            dateFin: demarcheEtapeDateFin,
            surface: props.surf_off || undefined,
            substances: substances.map(s => ({
              id: s.id
            })),
            points: geojsonFeature.geometry.coordinates.reduce(
                (res, points, contourId) => [
                  ...res,
                  ...pointsContourCreate(titreEtapeId, props.Code, points, contourId, 0)
                ],
                []
            )
          }
        ]
      }]
    // entreprises,
    // titresTitulaires: entreprises.map(t => ({
    //   entrepriseId: t.id,
    //   titreEtapeId
    // }))
  };
}

// Mettre les sources (https://drive.google.com/drive/u/1/folders/1hQ15aTvcmRQa4z5jVJta-FaoibWE_wbv)
// dans imports-db/sources/json

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

    const titresIds = titres.map(t => t.id)
    const titre = featureFormat(f, titresIds, reportRow);

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  const titresIds = titres.map(t => t.id)
  const duplicateIds = [...new Set(titresIds.filter((item, index) => titresIds.indexOf(item) !== index))]
  if( duplicateIds.length){
    duplicateIds.forEach(id => console.log(id))
    throw new Error("Il y a des ids de titres en double")
  }

  //vérifie que ces ids ne sont pas déjà présents dans Camino
  const existingIds = titresIdsCamino.map(t => t.id).filter(value => titresIds.includes(value))
  if (existingIds.length) {
    existingIds.forEach(id => console.log(id))
    // throw new Error("Il y a des ids de titres déjà existants dans Camino")
  }

  try {
    const csv = json2csv(report)
    writeFileSync('./results/rapport.csv', csv, )

    writeFileSync(
        './results/rntm-titres.json',
        JSON.stringify(titres , null, 2)
    )
  } catch (err) {
    console.error(err)
  }

  console.log(`${titres.length} titres ont été traités`)
  console.log(`${nbTitresIgnores} titres non traités car déjà existant dans Camino`)
  console.log(`dont ${nbErrors} titres avec au moins une erreur`)
  console.log(`dont ${titres.length - nbErrors} avec aucune erreur`)
}

main()
