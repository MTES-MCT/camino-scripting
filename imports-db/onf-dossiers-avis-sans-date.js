// Correspondances :
// https://docs.google.com/spreadsheets/d/1-6CmKH0_birxfIazM55R6Vr_ipZ-wzykx9boB6NRfR4/edit#gid=1227385847

const { writeFileSync: write } = require('fs')
const slugify = require('@sindresorhus/slugify')
const cryptoRandomString = require('crypto-random-string')
const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const gdal = require('gdal')
const moment = require('moment')
const parseRtf = require('rtf-parser')

const toCsv = (res, name) => {
  if (!res || !res.length) {
    console.log('empty file:', name)
    return
  }

  const opts = {
    fields: Object.keys(res[0])
  }

  try {
    const csv = json2csv(res, opts)
    write(`exports/camino-onf-${name}.csv`, csv)
  } catch (err) {
    console.error(err)
  }
}

const toGeojson = coords => {
  // ne gère que les polygones à 4 sommets dans un premier temps
  if (coords.length === 4) {
    coords = coords.map(c => [+c.W_DD, +c.N_DD])
    return {
      type: 'Polygon',
      coordinates: [[...coords, coords[0]]]
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: [
      coords.reduce((acc, c, i, arr) => {
        if (i % 4 === 0) {
          if (i > 0) {
            const poly = acc.slice(-1)[0]
            poly.push(poly[0])
          }

          acc.push([])
        }

        const poly = acc.slice(-1)[0]

        poly.push([+c.W_DD, +c.N_DD])

        if (i === arr.length - 1) {
          poly.push(poly[0])
        }

        return acc
      }, [])
    ]
  }
}

const indexify = (arr, key, unique = false) => {
  if (typeof key !== 'function') {
    key = e => e[key]
  }

  return arr.reduce((r, e) => {
    const val = key(e)

    if (unique === true) {
      r[val] = e
      return r
    }

    if (!r[val]) {
      r[val] = []
    }

    r[val].push(e)

    return r
  }, {})
}

const writeRtf = (path, rtf) => {
  return

  if (rtf.match('pngblip')) {
    rtf = rtf.replace(/pngblip([^}]+)/g, s => s.replace(/ /g, '\n'))
  }

  write(path, rtf)
}

const rtfParseContent = fileContent =>
  new Promise((resolve, reject) => {
    const errorHandler = err => {
      console.error(err)
      resolve('error')
    }

    try {
      parseRtf.string(
        fileContent,
        (err, doc) =>
          err
            ? errorHandler(err)
            : resolve(doc.content[0].content.map(c => c.value).join(''))
      )
    } catch (e) {
      resolve('error')
      console.error(e)
    }
  })

const leftPad = str => str.toString().padStart(2, '0')

const capitalize = str =>
  str
    ? str
        .trim()
        .toLowerCase()
        .replace(/(^| )(\w)/g, s => s.toUpperCase())
    : ''

const pointsCreate = (titreEtapeId, contour, contourId, groupeId) =>
  contour.reduce(
    (r, set, pointId) =>
      pointId === contour.length - 1
        ? r
        : [
            ...r,
            {
              id: slugify(
                `${titreEtapeId}-g${leftPad(groupeId + 1)}-c${leftPad(
                  contourId + 1
                )}-p${leftPad(pointId + 1)}`
              ),
              coordonnees: set.join(),
              groupe: groupeId + 1,
              contour: contourId + 1,
              point: pointId + 1,
              titreEtapeId,
              nom: String(pointId + 1)
            }
          ],
    []
  )

const toWGS = (system, [coord1, coord2]) => {
  // console.log({ coord1, coord2 })

  const point = new gdal.Point(coord1, coord2)
  const transformation = new gdal.CoordinateTransformation(
    gdal.SpatialReference.fromEPSG(system),
    gdal.SpatialReference.fromEPSG(4326)
  )
  point.transform(transformation)

  return [point.x, point.y]
}

const transformCoordinates = (geojson, titreEtapeId) => {
  const { coordinates } = geojson
  const system = 4326

  let titresPoints
  let titresPointsReferences = []

  const transformPoints = (titreEtapeId, contour, contourId, groupeId) => {
    const points = pointsCreate(titreEtapeId, contour, contourId, groupeId)

    const references = points.map(point => {
      const { coordonnees: coords } = point
      const coordonnees = coords.split(',').map(Number)

      point.coordonnees = coords //toWGS(system, coordonnees).join()

      return {
        id: `${point.id}-${system}`,
        titrePointId: point.id,
        geoSystemId: system,
        coordonnees: coords
      }
    })

    titresPointsReferences = [...titresPointsReferences, ...references]

    return points
  }

  titresPoints = coordinates.reduce(
    (res, contoursOrPoints, contourIdOrGroupId) =>
      coordinates.type === 'MultiPolygon'
        ? [
            ...res,
            ...contoursOrPoints.reduce(
              (ps, points, contourId) => [
                ...ps,
                ...transformPoints(
                  titreEtapeId,
                  points,
                  contourId,
                  contourIdOrGroupId
                )
              ],
              []
            )
          ]
        : [
            ...res,
            ...transformPoints(
              titreEtapeId,
              contoursOrPoints,
              contourIdOrGroupId,
              0
            )
          ],
    []
  )

  return { titresPoints, titresPointsReferences }
}

const dateformat = date => {
  date = date && date.replace('-', '').slice(0, 9)

  if (!date) return ''

  // Corrige les typos courrantes sur les dates
  switch (date.slice(0, 4)) {
    case '2301':
      date = `2013-${date.slice(5)}`
      break

    case '2050':
      date = `2005-${date.slice(5)}`
      break
  }

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(-2)}`
}

const typeIdCorrespondance = {
  AEX: 'axm',
  ARM: 'arm',
  COM: 'cxx',
  PER: 'prx',
  PEX: 'pxm'
}

const titreCreate = titre => ({
  id: '',
  nom: '',
  typeId: '',
  domaineId: '',
  statutId: '',
  references: {},
  ...titre
})

const demarcheCreate = demarche => ({
  id: '',
  typeId: '',
  titreId: '',
  statutId: '',
  ordre: 1,
  ...demarche
})

const etapeCreate = etape => ({
  id: '',
  titreDemarcheId: '',
  typeId: '',
  statutId: '',
  ordre: '',
  date: '',
  dateDebut: '',
  duree: '',
  dateFin: '',
  surface: '',
  engagement: '',
  engagementDeviseId: '',
  data: '',
  ...etape
})

const documentCreate = doc => ({
  id: `${doc.titreEtapeId}-${cryptoRandomString({ length: 8 })}`,
  titreEtapeId: '',
  jorf: '',
  nor: '',
  url: '',
  uri: '',
  nom: '',
  type: '',
  fichier: '',
  public: false,
  ...doc
})

const titreArmCreate = (titreIdIndex, dossier) => {
  const references = {
    ONF: dossier.ReferenceONF,
    PTMG: dossier.RefDrire
  }

  const domaineId = 'm'
  const typeId = typeIdCorrespondance[dossier.Typededossier]
  let titreNom = capitalize(dossier.NomSecteur)

  let dateId = dateformat(dossier.DepotLe).slice(0, 4)

  // En cas de date de dépôt invalide, (ex : 10400121)
  // prendre la date d'arrivée à l'ONF
  if (dateId < 1993) {
    dossier.DepotLe = dossier.ArriveeONFle
    dateId = dateformat(dossier.DepotLe).slice(0, 4)
  }

  let titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)
  if (titreIdIndex[titreId]) {
    const titreIdOld = titreId

    const ordre = titreIdIndex[titreId].length + 1

    titreNom = `${titreNom} (${ordre})`
    titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)

    titreIdIndex[titreIdOld].push(titreId)
  } else {
    titreIdIndex[titreId] = [titreId]
  }

  const titre = titreCreate({
    id: titreId,
    nom: titreNom,
    typeId,
    domaineId,
    statutId: 'ind',
    references
  })

  return titre
}

const octroiCreate = (dossier, titre) => {
  const titreId = titre.id

  const octroi = demarcheCreate({
    id: `${titreId}-oct01`,
    typeId: 'oct',
    titreId,
    statutId: 'ind',
    ordre: 1
  })

  return octroi
}

const depotCreate = (dossier, octroi) => {
  if (!dossier.DepotLe) return []

  const dateDepot = dateformat(dossier.DepotLe)

  const mfr = etapeCreate({
    id: `${octroi.id}-mfr01`,
    typeId: 'mfr',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    surface: dossier.SurfaceDemandee,
    date: dateDepot,
    data: {}
  })

  if (dossier.NomForet) {
    mfr.data.nom_foret = capitalize(dossier.NomForet)
  }

  const mdp = etapeCreate({
    id: `${octroi.id}-mdp01`,
    typeId: 'mdp',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    date: dateDepot
  })

  return [mfr, mdp]
}

const enregistrementCreate = (dossier, octroi) => {
  if (!dossier.ArriveeONFle) return null

  const men = etapeCreate({
    id: `${octroi.id}-men01`,
    typeId: 'men',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    date: dateformat(dossier.ArriveeONFle)
  })

  return men
}

const expertiseCreate = (dossier, octroi) => {
  if (
    !dossier.DebutAnalyseExpertiseLe &&
    !dossier.SaisieAnalyseExpertiseLe &&
    !dossier.NotesExpertise &&
    !dossier.MotifExpertise
  ) {
    return null
  }

  const dateDebut = dateformat(dossier.DebutAnalyseExpertiseLe)

  const dateSaisie = dateformat(dossier.SaisieAnalyseExpertiseLe)

  const eof = etapeCreate({
    id: `${octroi.id}-eof01`,
    typeId: 'eof',
    titreDemarcheId: octroi.id,
    statutId: dateSaisie ? 'fai' : 'aca',
    ordre: 1,
    date: dateDebut || dateSaisie,
    dateFin: dateSaisie || '',
    data: {}
  })

  if (dossier.OperateurUsExpertise) {
    eof.data.operateur_expertise = capitalize(dossier.OperateurUsExpertise)
  }

  if (dossier.ExpertiseSuiviePar) {
    eof.data.agent_implique = capitalize(dossier.ExpertiseSuiviePar)
  }

  return eof
}

const expertiseDocumentsCreate = (dossier, eof) => {
  let notes
  if (dossier.NotesExpertise) {
    notes = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-notes.rtf`,
      type: 'Notes'
    })

    writeRtf(`./exports/onf-rtf/${eof.id}-notes.rtf`, dossier.NotesExpertise)
  }

  let motif
  if (dossier.MotifExpertise) {
    motif = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-motif.rtf`,
      type: 'Motif'
    })

    writeRtf(`./exports/onf-rtf/${eof.id}-motif.rtf`, dossier.MotifExpertise)
  }

  return [notes, motif]
}

const expertiseRevCreate = (dossier, octroi) => {
  if (
    dossier.RevisionExpertise !== '1' ||
    (!dossier.REVDebutAnalyseExpertiseLe &&
      !dossier.REVSaisieAnalyseExpertiseLe)
  ) {
    return null
  }

  const dateDebut = dateformat(dossier.REVDebutAnalyseExpertiseLe)

  const dateSaisie = dateformat(dossier.REVSaisieAnalyseExpertiseLe)

  const eof = etapeCreate({
    id: `${octroi.id}-eof02`,
    typeId: 'eof',
    titreDemarcheId: octroi.id,
    statutId: dateSaisie ? 'fai' : 'aca',
    ordre: 1,
    date: dateDebut || dateSaisie,
    dateFin: dateSaisie || '',
    data: {}
  })

  if (dossier.REVOperateurUsExpertise) {
    eof.data.operateur_expertise = capitalize(dossier.REVOperateurUsExpertise)
  }

  if (dossier.REVExpertiseSuiviePar) {
    eof.data.agent_implique = capitalize(dossier.REVExpertiseSuiviePar)
  }

  return eof
}

const expertiseRevDocumentsCreate = (dossier, eof) => {
  let notes
  if (dossier.REVNotesExpertise) {
    notes = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-notes.rtf`,
      type: 'Notes'
    })

    writeRtf(`./exports/onf-rtf/${eof.id}-notes.rtf`, dossier.REVNotesExpertise)
  }

  let motif
  if (dossier.REVMotifExpertise) {
    motif = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-motif.rtf`,
      type: 'Motif'
    })

    writeRtf(`./exports/onf-rtf/${eof.id}-motif.rtf`, dossier.REVMotifExpertise)
  }

  return [notes, motif]
}

const avisExpertises = {
  '-1': 'ind',
  1: 'fav',
  2: 'def',
  3: 'ajo'
}

const avisCreate = (dossier, octroi) => {
  if (dossier.AvisExpertise === '-1') return null

  if (!avisExpertises[dossier.AvisExpertise]) {
    console.info(
      'avis expertise inconnu:',
      dossier.AvisExpertise,
      dossier.ReferenceONF,
      octroi.id
    )
    // return null
  }

  if (!dossier.AvisExpertiseOnfLe) {
    console.info(
      'avis expertise sans date:',
      dossier.AvisExpertise,
      dossier.ReferenceONF,
      octroi.id
    )
    // return null
  }

  const date = dateformat(dossier.AvisExpertiseOnfLe)
  const aof = etapeCreate({
    id: `${octroi.id}-aof01`,
    typeId: 'aof',
    titreDemarcheId: octroi.id,
    statutId: avisExpertises[dossier.AvisExpertise],
    ordre: 1,
    date,
    data: {}
  })

  if (dossier.AvisExpertisePar) {
    aof.data.operateur_signature_expertise = capitalize(
      dossier.AvisExpertisePar
    )
  }

  return aof
}

const avisRevCreate = (dossier, octroi) => {
  if (dossier.RevisionExpertise !== '1') return null

  if (!avisExpertises[dossier.REVAvisExpertise]) {
    console.info(
      'avis expertise rev inconnu:',
      dossier.REVAvisExpertise,
      dossier.ReferenceONF,
      octroi.id
    )
    // return null
  }

  if (!dossier.REVAvisExpertiseOnfLe) {
    console.info(
      'avis expertise rev sans date:',
      dossier.REVAvisExpertise,
      dossier.ReferenceONF,
      octroi.id
    )
    // return null
  }

  const date = dateformat(dossier.REVAvisExpertiseOnfLe)

  const aof = etapeCreate({
    id: `${octroi.id}-aof02`,
    typeId: 'aof',
    titreDemarcheId: octroi.id,
    statutId: avisExpertises[dossier.REVAvisExpertise],
    ordre: 1,
    date,
    data: {}
  })

  if (dossier.REVAvisExpertisePar) {
    aof.data.operateur_signature_expertise = capitalize(
      dossier.REVAvisExpertisePar
    )
  }

  return aof
}

const mecaRegExp = /m\\\\'e9canis"/
const manuelleRegExp = /manuelle/

const octroiDefCreate = (dossier, octroi) => {
  if (dossier.AvisExpertise === '-1' && dossier.REVAvisExpertise === '-1')
    return null

  // Si l'avis d'expertise n'est pas favorable, pas de DEF
  if (dossier.AvisExpertise !== '1' && dossier.REVAvisExpertise !== '1')
    return null

  const mecanisee =
    (dossier.NotesExpertise && mecaRegExp.test(dossier.NotesExpertise)) ||
    (dossier.MotifExpertise && mecaRegExp.test(dossier.MotifExpertise))

  const manuelle =
    (dossier.NotesExpertise && manuelleRegExp.test(dossier.NotesExpertise)) ||
    (dossier.MotifExpertise && manuelleRegExp.test(dossier.MotifExpertise))

  const data = {
    mecanisee,
    manuelle,
    convention: !!dossier.ConventionSigneeLe
  }

  let statutId
  let date
  if (dossier.ConventionSigneeLe) {
    statutId = 'acc'
    date = dossier.ConventionSigneeLe

    if (!mecanisee) {
      console.info(
        'convention signée pour ARM non mécanisée',
        dossier.ReferenceONF,
        octroi.id
      )
    }
  } else {
    /*
    dossier.ConventionSigneeLe ||
      dossier.AvisExpertiseOnfLe ||
      dossier.SaisieAnalyseExpertiseLe ||
      dossier.DebutAnalyseExpertiseLe
     */

    if (!mecanisee) {
      // le statut de l'octroi d'une ARM non mécanisée sans convention est "acceptée"
      statutId = 'acc'
      // la date de l'octroi est la date de la commission des ARM
      date = dossier.AvisExpertiseOnfLe
      if (date) {
        console.info('octroi sans date', dossier.ReferenceONF, octroi.id)
      }
    } else {
      // ARM mécanisée sans convention
      statutId = ''
      // TODO: si date commission > 1 mois, alors classe sans suite
      // TODO: vérifier aussi le statut
      date = ''

      console.info(
        'pas de convention signée pour ARM mécanisée',
        dossier.ReferenceONF,
        octroi.id
      )
    }
  }

  date = dateformat(date)

  let dateFin

  // s'il y a prolongation, la date de fin de l'ARM est repoussée de 4 mois
  if (dossier.ProlongationARM !== '1' && dossier.FinConventionLe) {
    dateFin = dateformat(dossier.FinConventionLe)
  } else {
    dateFin = moment(new Date(date))
    dateFin.add(4, 'months')
    dateFin = dateformat(dateFin.toDate().toISOString())
  }

  const octroiDef = etapeCreate({
    id: `${octroi.id}-def01`,
    typeId: 'def',
    titreDemarcheId: octroi.id,
    statutId,
    ordre: 1,
    date,
    duree: statutId === 'acc' ? 4 : '',
    dateFin,
    surface: statutId === 'acc' ? dossier.SurfacePermisKm2 : '',
    data
  })

  if (dossier.ConventionSigneePar) {
    data.convention_signee_par = capitalize(dossier.ConventionSigneePar)
  }

  if (dossier.ConventionValideePar) {
    data.convention_validee_par = capitalize(dossier.ConventionValideePar)
  }

  if (dossier.ConventionSuiviePar) {
    data.agent_implique = capitalize(dossier.ConventionSuiviePar)
  }

  return octroiDef
}

const prorogationCreate = (dossier, titre) => {
  if (dossier.ProlongationARM !== '1') return null

  const titreId = titre.id

  const prorogation = demarcheCreate({
    id: `${titreId}-prr01`,
    typeId: 'prr',
    titreId,
    statutId: 'ind',
    ordre: 1
  })

  return prorogation
}

const prorogationDefCreate = (dossier, prorogation, octroiDef) => {
  if (!octroiDef) {
    console.info(
      "prorogation sans DEF d'octroi:",
      dossier.ReferenceONF,
      prorogation.id
    )
    return null
  }

  let date = ''

  if (dossier.ConventionSigneeLe) {
    date = moment(octroiDef.date)
    date.add(4, 'months')
    date = dateformat(date.toDate().toISOString())
  }

  const prorogationDef = etapeCreate({
    id: `${prorogation.id}-def01`,
    typeId: 'def',
    titreDemarcheId: prorogation.id,
    statutId: 'acc',
    ordre: 1,
    date,
    dateFin: dossier.FinConventionLe ? dateformat(dossier.FinConventionLe) : '',
    duree: 4
  })

  return prorogationDef
}

const renonciationCreate = (dossier, titre, octroiDef, prorogationDef) => {
  if (!octroiDef || !dossier.QuitusLe) return null

  const dateQuitus = dateformat(dossier.QuitusLe)

  // si la date de quitus est antérieure à la date de fin du titre
  // c'est une renonciation anticipée
  const dateQuitusIsPrevious =
    dateQuitus <
    new Date(prorogationDef ? prorogationDef.dateFin : octroiDef.dateFin)

  if (!dateQuitusIsPrevious) return null

  const titreId = titre.id

  const renonciation = {
    id: `${titreId}-ren01`,
    typeId: 'ren',
    titreId,
    statutId: 'ind',
    ordre: 1
  }

  return renonciation
}

const renonciationDefCreate = (dossier, renonciation) => {
  const dateQuitus = dateformat(dossier.QuitusLe)

  const renonciationDef = etapeCreate({
    id: `${renonciation.id}-ren01`,
    typeId: 'ren',
    titreDemarcheId: renonciation.id,
    statutId: 'acc',
    ordre: 1,
    date: dateQuitus
  })

  return renonciationDef
}

const main = async () => {
  let dossiers = await csv().fromFile('./exports/onf-dossiers.csv')
  // let dossiers = await csv().fromFile('./exports/onf-dossiers-light.csv')
  // let dossiers = await csv().fromFile('./exports/AR2018024.csv')

  dossiers = dossiers.filter(d => d.Typededossier === 'ARM')

  const dossiersIndex = indexify(dossiers, 'IDDossier', true)

  const demandeurs = await csv().fromFile('./exports/onf-demandeurs.csv')
  const demandeursConsolidation = await csv().fromFile(
    './sources/csv/onf-entreprises-consolidation.csv'
  )
  const demandeursIndex = indexify(
    demandeursConsolidation,
    e => capitalize(e.nom),
    true
  )
  // console.log(demandeursIndex[capitalize("LA PEPITE D'OR")])
  // return

  const polygones = await csv().fromFile('./exports/onf-polygones.csv')
  const polygonesIndex = indexify(polygones, 'IDPolygone', true)
  const polygonesIndexDossiers = indexify(polygones, 'IDDossier', true)

  const polycoordonnees = await csv().fromFile(
    './exports/onf-polycoordonnees-light.csv'
  )

  const polycoordonneesIndex = indexify(
    polycoordonnees,
    'IDPolycoordonnee',
    true
  )
  const polycoordonneesIndexPolygones = indexify(polycoordonnees, 'IDPolygone')

  //  console.log(dossiers.length, polygones.length, polycoordonnees.length)
  //  console.log(dossiers[0], polygones[0], polycoordonnees[0])

  const titreIdIndex = {}

  const { entreprises, entreprisesIndex } = demandeurs.reduce(
    (acc, demandeurOnf) => {
      let {
        NomDemandeur: nomDemandeur,
        NomConvention: nomConvention
      } = demandeurOnf
      nomDemandeur = nomDemandeur || nomConvention

      if (!nomDemandeur) return acc

      const siren =
        demandeurOnf.SIRET &&
        demandeurOnf.SIRET.replace(/[^0-9]/g, '').slice(0, 9)

      const entreprise = {
        id: `fr-${siren || slugify(nomDemandeur)}`,
        nom: capitalize(nomDemandeur),
        pays_id: 'FR',
        legal_siren: siren,
        legal_etranger: '',
        legal_form: '',
        adresse: '',
        code_postal: '',
        commune: capitalize(demandeurOnf.Ville_geo)
      }

      acc.entreprises.push(entreprise)
      acc.entreprisesIndex[nomDemandeur] = entreprise

      return acc
    },
    { entreprises: [], entreprisesIndex: {} }
  )

  const entreprisesTitulairesIndex = {}

  const res = await dossiers.reduce(async (acc, dossier) => {
    acc = await acc

    const { IDDossier: dossierId } = dossier

    const titre = titreArmCreate(titreIdIndex, dossier)

    const demarches = []
    const etapes = []
    const documents = []
    const erreurs = []

    let etapesPointsTitulaires = []

    const octroi = octroiCreate(dossier, titre)
    let octroiDef

    if (octroi) {
      demarches.push(octroi)

      const [mfr, mdp] = depotCreate(dossier, octroi)

      if (mfr) {
        etapes.push(mfr)
      }
      if (mdp) {
        etapes.push(mdp)
      }

      if (mfr) {
        erreurs.push({
          titreEtapeId: mfr.id,
          date: true
        })

        etapesPointsTitulaires.push(mfr)
      }

      const men = enregistrementCreate(dossier, octroi)

      if (men) {
        etapes.push(men)
      }

      const eof = expertiseCreate(dossier, octroi)

      if (eof) {
        etapes.push(eof)

        const [notes, motif] = expertiseDocumentsCreate(dossier, eof)

        documents.push(notes, motif)
      }

      const aof = avisCreate(dossier, octroi)

      if (aof) {
        etapes.push(aof)
      }

      const eofRev = expertiseRevCreate(dossier, octroi)

      if (eofRev) {
        etapes.push(eofRev)

        const [notes, motif] = expertiseRevDocumentsCreate(dossier, eofRev)

        documents.push(notes, motif)
      }

      const aofRev = avisRevCreate(dossier, octroi)

      if (aofRev) {
        etapes.push(aofRev)
      }

      octroiDef = octroiDefCreate(dossier, octroi)

      if (octroiDef) {
        etapes.push(octroiDef)
        etapesPointsTitulaires.push(octroiDef)
      }
    }

    const prorogation = prorogationCreate(dossier, titre)
    let prorogationDef

    if (prorogation) {
      demarches.push(prorogation)

      prorogationDef = prorogationDefCreate(dossier, prorogation, octroiDef)

      if (prorogationDef) {
        etapes.push(prorogationDef)
      }
    }

    const renonciation = renonciationCreate(
      dossier,
      titre,
      octroiDef,
      prorogationDef
    )

    if (renonciation) {
      demarches.push(renonciation)

      const renonciationDef = renonciationDefCreate(dossier, renonciation)

      if (renonciationDef) {
        etapes.push(renonciationDef)
      }
    }

    let points = []
    let pointsReferences = []

    if (etapesPointsTitulaires.length && polygonesIndexDossiers[dossierId]) {
      const g = polygonesIndexDossiers[dossierId]
      const { IDPolygone: idPoly } = g

      const coords = polycoordonneesIndexPolygones[idPoly]
      if (coords && coords.length % 4 === 0) {
        etapesPointsTitulaires.forEach(etape => {
          const { titresPoints, titresPointsReferences } = transformCoordinates(
            toGeojson(coords),
            etape.id
          )

          points = [...points, ...titresPoints]
          pointsReferences = [...pointsReferences, ...titresPointsReferences]
        })
      }
    }

    let titulaires = []
    let entreprises = []

    // const entreprise = entreprisesIndex[dossier.NomDemandeur]
    const entreprise = demandeursIndex[capitalize(dossier.NomDemandeur)]
    if (!entreprise) {
      console.info(
        `entreprise introuvable: ${dossier.NomDemandeur}`,
        dossier.ReferenceONF
      )
    } else {
      titulaires = etapes.reduce(
        (titulaires, e) =>
          ['mfr', 'def'].includes(e.typeId)
            ? titulaires.concat({
                titreEtapeId: e.id,
                entreprise_id: entreprise.id
              })
            : titulaires,
        titulaires
      )

      // ajout de l'entreprise si pas déjà fait
      if (!entreprisesTitulairesIndex[entreprise.id]) {
        entreprises.push(entreprise)
        entreprisesTitulairesIndex[entreprise.id] = true
      }
    }

    acc.push({
      titres: [titre],
      demarches,
      etapes,
      points,
      pointsReferences,
      titulaires,
      documents,
      erreurs,
      entreprises
    })
    return acc
  }, [])

  const tables = [
    'titres',
    'demarches',
    'etapes',
    'points',
    'pointsReferences',
    'entreprises',
    'titulaires',
    'documents',
    'erreurs'
  ]

  tables.forEach(nom => {
    const items = res.reduce((r, e) => r.concat(...(e[nom] || [])), [])

    toCsv(items, nom)
  })

  if (false) {
    const multis = res.filter(r => r.geojson.type === 'MultiPolygon')

    const features = {
      type: 'FeatureCollection',
      features: multis.map(m => ({
        type: 'Feature',
        properties: {
          ref: m.dossier.ReferenceONF,
          secteur: m.dossier.NomSecteur,
          demandeur: m.dossier.NomDemandeur,
          depot: m.dossier.DepotLo,
          IDDossier: m.id
        },
        geometry: m.geojson
      }))
    }
    //write('./exports/arm-multi.geojson', JSON.stringify(features, null, 2))

    // const multi = res.find(r => r.polygone.IDPolygone === '1664')
    // console.log(JSON.stringify(multi.geojson))
  }
}

main()
