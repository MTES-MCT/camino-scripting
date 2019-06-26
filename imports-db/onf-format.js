// Correspondances :
// https://docs.google.com/spreadsheets/d/1-6CmKH0_birxfIazM55R6Vr_ipZ-wzykx9boB6NRfR4/edit#gid=1227385847

const { promisify } = require('util')
const { createReadStream, writeFileSync: write } = require('fs')

const slugify = require('@sindresorhus/slugify')
const cryptoRandomString = require('crypto-random-string')
const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const gdal = require('gdal')
const moment = require('moment')
const parserRtf = promisify(require('rtf-parser').string)
const decamelize = require('decamelize')

const infoTypeOrdre = ['oct-eof', 'oct-aof', 'oct-def', 'pro-def', 'tit']

const info = (type, ...args) =>
  console.info([infoTypeOrdre.indexOf(type) + 1, ...args].join('\t'))

const toCsv = (res, name) => {
  if (!res || !res.length) {
    // console.log('empty file:', name)
    return
  }

  res = res.map(
    o => Object.keys(o).reduce((r, k) => ((r[decamelize(k)] = o[k]), r), {}),
    {}
  )

  const opts = {
    fields: Object.keys(res[0])
  }

  try {
    const csv = json2csv(res, opts)
    write(`exports/camino-onf-${decamelize(name, '-')}.csv`, csv)
  } catch (err) {
    console.error(err)
  }
}

const indexify = (arr, key, unique = false) => {
  const getKey = typeof key !== 'function' ? e => e[key] : key

  return arr.reduce((r, e) => {
    const val = getKey(e)

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

const isRtfEmpty = str => !str || !str.replace(/\s/g, '').trim()

const writeRtf = (path, rtf) => {
  if (rtf.match('pngblip')) {
    rtf = rtf.replace(/pngblip([^}]+)/g, s => s.replace(/ /g, '\n'))
  }

  write(path, rtf)
}

const rtfParseContent = async fileContent => {
  if (!fileContent) return ''

  try {
    const doc = await parserRtf(fileContent)

    let content = doc.content
      .map(c =>
        c.content
          .map(c => c.value)
          .join('')
          .trim()
      )
      .join('\n')

    content = content.replace(/(\s)\1+/g, '$1').trim()

    return content
  } catch (e) {
    e.data = fileContent
    throw e
  }
}
const leftPad = str => str.toString().padStart(2, '0')

const capitalize = str =>
  str
    ? str
        .trim()
        .toLowerCase()
        .replace(/(^| )(\w)/g, s => s.toUpperCase())
    : ''

const toWGS = (system, [coord1, coord2]) => {
  const point = new gdal.Point(coord1, coord2)
  const transformation = new gdal.CoordinateTransformation(
    gdal.SpatialReference.fromEPSG(system),
    gdal.SpatialReference.fromEPSG(4326)
  )
  point.transform(transformation)

  return [point.x, point.y]
}

const pointsCreate = (titreEtapeId, points, contourId, groupeId) =>
  points.map((point, pointId) => ({
    id: slugify(
      `${titreEtapeId}-g${leftPad(groupeId + 1)}-c${leftPad(
        contourId + 1
      )}-p${leftPad(pointId + 1)}`
    ),
    coordonnees: point.wgs84.coords.join(),
    groupe: groupeId + 1,
    contour: contourId + 1,
    point: pointId + 1,
    titreEtapeId,
    nom: String(pointId + 1),
    description: point.description,
    source: point
  }))

const pointsReferencesCreate = points =>
  points.reduce(
    (r, point) => [
      ...r,
      ...['wgs84', 'utm95'].map(system => {
        const { coordonnees: coords } = point

        const { epsg, coords: coordonnees } = point.source[system]

        const reference = {
          id: `${point.id}-${epsg}`,
          titrePointId: point.id,
          geoSystemeId: epsg,
          coordonnees: coordonnees.join()
        }

        return reference
      })
    ],
    []
  )

const polygonsToCamino = (polygons, titreEtapeId) =>
  polygons.reduce(
    ({ points: p, pointsReferences: r }, contour, contourIdOrGroupId) => {
      const points = pointsCreate(titreEtapeId, contour, 0, contourIdOrGroupId)

      const result = {
        points: [...p, ...points],
        pointsReferences: [...r, ...pointsReferencesCreate(points)]
      }

      points.forEach(p => delete p.source)

      return result
    },
    { points: [], pointsReferences: [] }
  )

const toPolygons = (coords, toPoint) => {
  if (!toPoint)
    throw new Error(
      '[ImplementationError] Fonction de transformation de point non renseignée'
    )

  return coords.reduce((acc, c, i, arr) => {
    if (i % 4 === 0) {
      acc.push([])
    }

    const poly = acc.slice(-1)[0]

    poly.push(toPoint(c))

    return acc
  }, [])
}

const dateformat = date => {
  date = date && date.replace('-', '').slice(0, 9)

  if (!date) return ''

  // Corrige les typos courrantes sur les dates
  switch (date.slice(0, 4)) {
    case '2301':
      date = `2013${date.slice(4)}`
      break

    case '2050':
      date = `2005${date.slice(4)}`
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

  const data = {
    etat: dossier.EtatDossier,
    avancement: dossier.Avancement
  }

  const titre = titreCreate({
    id: titreId,
    nom: titreNom,
    typeId,
    domaineId,
    statutId: 'ind',
    references,
    data
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

  const mdp = etapeCreate({
    id: `${octroi.id}-mdp01`,
    typeId: 'mdp',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    surface: dossier.SurfaceDemandee,
    date: dateDepot,
    data: {}
  })

  if (dossier.NomForet) {
    mdp.data.nom_foret = capitalize(dossier.NomForet)
  }

  return mdp
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

const rtfsParse = dossier =>
  Promise.all(
    ['', 'REV'].reduce(
      (r, prefix) => [
        ...r,
        ...['Notes', 'Motif'].map(async name => {
          const field = `${prefix}${name}Expertise`

          dossier[`${field}Rtf`] = await rtfParseContent(dossier[field])
        })
      ],
      []
    )
  )

const expertiseCreate = (dossier, octroi, prefix = '') => {
  if (prefix === 'REV' && dossier.RevisionExpertise === '0') return

  if (
    !dossier[`${prefix}DebutAnalyseExpertiseLe`] &&
    !dossier[`${prefix}SaisieAnalyseExpertiseLe`] &&
    !dossier[`${prefix}NotesExpertise`] &&
    !dossier[`${prefix}MotifExpertise`]
  ) {
    return null
  }

  if (
    !dossier[`${prefix}DebutAnalyseExpertiseLe`] &&
    !dossier[`${prefix}SaisieAnalyseExpertiseLe`]
  ) {
    const notesEmpty = isRtfEmpty(dossier[`${prefix}NotesExpertiseRtf`])
    if (!notesEmpty) {
      info(
        'oct-eof',
        dossier.ReferenceONF,
        octroi.id,
        `pas de date d'expertise ${prefix || '1'} mais des notes`,
        dossier[`${prefix}AvisExpertise`]
      )
    }

    const motifEmpty = isRtfEmpty(dossier[`${prefix}MotifExpertiseRtf`])
    if (!motifEmpty) {
      info(
        'oct-eof',
        dossier.ReferenceONF,
        octroi.id,
        `pas de date d'expertise ${prefix || '1'} mais un motif`,
        dossier[`${prefix}AvisExpertise`]
      )
    }

    // ni date, ni notes, ni motif, donc pas d'expertise
    if (notesEmpty && motifEmpty) {
      info(
        'oct-eof',
        dossier.ReferenceONF,
        octroi.id,
        `pas de date d'expertise ${prefix || '1'}, ni de notes, ni de motif`,
        dossier[`${prefix}AvisExpertise`]
      )

      return null
    }
  }

  const dateDebut = dateformat(dossier[`${prefix}DebutAnalyseExpertiseLe`])

  const dateSaisie = dateformat(dossier[`${prefix}SaisieAnalyseExpertiseLe`])

  const eof = etapeCreate({
    id: `${octroi.id}-eof${prefix ? '02' : '01'}`,
    typeId: 'eof',
    titreDemarcheId: octroi.id,
    statutId: dateSaisie ? 'fai' : 'nfa',
    ordre: 1,
    date: dateDebut || dateSaisie,
    dateFin: dateSaisie || '',
    data: {}
  })

  if (dossier[`${prefix}OperateurUsExpertise`]) {
    eof.data.operateur_expertise = capitalize(
      dossier[`${prefix}OperateurUsExpertise`]
    )
  }

  if (dossier[`${prefix}ExpertiseSuiviePar`]) {
    eof.data.agent_implique = capitalize(dossier[`${prefix}ExpertiseSuiviePar`])
  }

  return eof
}

const expertiseDocumentsCreate = (dossier, eof, prefix = '') => {
  let notes

  if (!isRtfEmpty(dossier[`${prefix}NotesExpertiseRtf`])) {
    notes = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-notes`,
      type: 'Notes'
    })

    writeRtf(
      `./exports/onf-rtf/${eof.id}-notes.rtf`,
      dossier[`${prefix}NotesExpertise`]
    )
  }

  let motif
  if (!isRtfEmpty(dossier[`${prefix}MotifExpertiseRtf`])) {
    motif = documentCreate({
      titreEtapeId: eof.id,
      fichier: `${eof.id}-motif`,
      type: 'Motif'
    })

    writeRtf(
      `./exports/onf-rtf/${eof.id}-motif.rtf`,
      dossier[`${prefix}MotifExpertise`]
    )
  }

  return [notes, motif]
}

const avisExpertises = {
  '-1': 'ind',
  1: 'fav',
  2: 'def',
  3: 'ajo'
}

const avisCreate = (dossier, octroi, prefix = '') => {
  // si révision et pas d'avis d'expertise, alors pas de création d'aof
  if (dossier[`${prefix}AvisExpertise`] === '-1') return null

  if (!avisExpertises[dossier[`${prefix}AvisExpertise`]]) {
    info(
      'oct-aof',
      dossier.ReferenceONF,
      octroi.id,
      `avis expertise ${prefix || '1'} inconnu`,
      dossier[`${prefix}AvisExpertise`]
    )
    // return null
  }

  if (!dossier[`${prefix}AvisExpertiseOnfLe`]) {
    info(
      'oct-aof',
      dossier.ReferenceONF,
      octroi.id,
      `avis expertise ${prefix || '1'} sans date`,
      dossier[`${prefix}AvisExpertise`]
    )
    // return null
  }

  const date = dateformat(dossier[`${prefix}AvisExpertiseOnfLe`])

  const aof = etapeCreate({
    id: `${octroi.id}-aof0${prefix ? 2 : 1}`,
    typeId: 'aof',
    titreDemarcheId: octroi.id,
    statutId: avisExpertises[dossier[`${prefix}AvisExpertise`]],
    ordre: 1,
    date,
    data: {}
  })

  if (dossier[`${prefix}AvisExpertisePar`]) {
    aof.data.operateur_signature_expertise = capitalize(
      dossier[`${prefix}AvisExpertisePar`]
    )
  }

  return aof
}

const mecaRegExp = /(?<!non[ -])m\\'e9canis/
const manuelleRegExp = /manuelle/
const pelleRegExp = /pelle/

const testRegExp = (regExp, str) => str && regExp.test(str)

const octroiDefCreate = (dossier, octroi) => {
  // aucun avis d'expertise ou de révision d'avis, pas de def possible
  if (dossier.AvisExpertise === '-1' && dossier.REVAvisExpertise === '-1') {
    return null
  }

  const mecanisee =
    testRegExp(mecaRegExp, dossier.NotesExpertise) ||
    testRegExp(mecaRegExp, dossier.MotifExpertise) ||
    testRegExp(mecaRegExp, dossier.REVNotesExpertise) ||
    testRegExp(mecaRegExp, dossier.REVMotifExpertise)

  const manuelle =
    testRegExp(manuelleRegExp, dossier.NotesExpertise) ||
    testRegExp(manuelleRegExp, dossier.MotifExpertise) ||
    testRegExp(manuelleRegExp, dossier.REVNotesExpertise) ||
    testRegExp(manuelleRegExp, dossier.REVMotifExpertise)

  const pelle =
    testRegExp(pelleRegExp, dossier.NotesExpertise) ||
    testRegExp(pelleRegExp, dossier.MotifExpertise) ||
    testRegExp(pelleRegExp, dossier.REVNotesExpertise) ||
    testRegExp(pelleRegExp, dossier.REVMotifExpertise)

  const data = {
    mecanisee,
    manuelle,
    pelle,
    convention: !!dossier.ConventionSigneeLe
  }

  if (dossier.ConventionSigneePar) {
    data.convention_signee_par = capitalize(dossier.ConventionSigneePar)
  }

  if (dossier.ConventionValideePar) {
    data.convention_validee_par = capitalize(dossier.ConventionValideePar)
  }

  if (dossier.ConventionSuiviePar) {
    data.agent_implique = capitalize(dossier.ConventionSuiviePar)
  }

  let statutId
  let date

  // si la convention est signée, l'ARM est forcément valide
  if (dossier.ConventionSigneeLe) {
    statutId = 'acc'
    date = dossier.ConventionSigneeLe
  } else {
    const avisExpertiseFavorable =
      dossier.AvisExpertise === '1' || dossier.REVAvisExpertise === '1'

    if (!mecanisee) {
      if (avisExpertiseFavorable) {
        // le statut de l'octroi d'une ARM non mécanisée sans convention est "acceptée"
        // si l'avis d'expertise est favorable
        statutId = 'acc'
      } else if (
        dossier.AvisExpertise === '3' ||
        dossier.REVAvisExpertise === '3'
      ) {
        statutId = 'ajo'
      } else if (
        dossier.AvisExpertise === '2' ||
        dossier.REVAvisExpertise === '2'
      ) {
        statutId = 'rej'
      }

      // la date de l'octroi est la date de la commission des ARM
      date = dossier.AvisExpertiseOnfLe
      if (!date) {
        info('oct-def', dossier.ReferenceONF, octroi.id, 'octroi sans date')
      }
    } else {
      // ARM mécanisée sans signature de convention
      if (avisExpertiseFavorable) {
        // TODO: déterminer le bon statut
        statutId = 'fav'
      } else if (
        dossier.AvisExpertise === '3' ||
        dossier.REVAvisExpertise === '3'
      ) {
        statutId = 'ajo'
      } else if (
        dossier.AvisExpertise === '2' ||
        dossier.REVAvisExpertise === '2'
      ) {
        statutId = 'rej'
      }

      // TODO: si date commission > 1 mois, alors classer sans suite
      // TODO: vérifier aussi le statut
      date = dossier.AvisExpertiseOnfLe

      info(
        'oct-def',
        dossier.ReferenceONF,
        octroi.id,
        'pas de convention signée pour ARM mécanisée'
      )
    }
  }

  if (!date) {
    info('oct-def', dossier.ReferenceONF, octroi.id, 'pas de date de début')
  }

  let dateBackup = date
  date = dateformat(date)

  let dateFin

  if (dossier.FinConventionLe) {
    dateFin = dateformat(dossier.FinConventionLe)
  } else if (date) {
    // Si pas de date de fin de convention
    // alors la date de fin est 4 mois après la date de début
    dateFin = moment(new Date(date))
    dateFin.add(4, 'months')
    dateFin = dateformat(dateFin.toDate().toISOString())
  } else {
    info(
      'oct-def',
      dossier.ReferenceONF,
      octroi.id,
      'pas de date de début, ni de date de fin'
    )
  }

  let duree
  let surface

  if (statutId === 'acc') {
    duree = 4
    surface = dossier.SurfacePermisKm2

    if (dossier.SurfacePermisKm2 !== dossier.SurfaceDemandee) {
      data.surface_demandee = dossier.SurfaceDemandee
    }
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
    surface,
    data
  })

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
    info(
      'pro-def',
      dossier.ReferenceONF,
      prorogation.id,
      "prorogation sans DEF d'octroi:"
    )
    return null
  }

  let date = ''

  if (dossier.ConventionSigneeLe) {
    date = moment(octroiDef.date)
    date.add(4, 'months')
    date = dateformat(date.toDate().toISOString())
  }

  const dateFin = dateformat(dossier.FinConventionLe)

  if (!dateFin) {
    info(
      'pro-def',
      dossier.ReferenceONF,
      octroiDef.id,
      'prolongation mais pas de date de fin'
    )
  }

  const prorogationDef = etapeCreate({
    id: `${prorogation.id}-def01`,
    typeId: 'def',
    titreDemarcheId: prorogation.id,
    statutId: 'acc',
    ordre: 1,
    date,
    dateFin,
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

const pointsEtapesCreate = (
  polygonesIndexDossiers,
  polycoordonneesIndexPolygones,
  dossierId,
  etapesWithInfos
) => {
  if (!etapesWithInfos.length) return {}

  const p = polygonesIndexDossiers[dossierId]

  if (!p) return {}

  const { IDPolygone: idPoly } = p

  const coords = polycoordonneesIndexPolygones[idPoly]

  // ne gère que les périmètres rectangulaires à maximum 3 polygones
  if (!coords || ![4, 8, 12].includes(coords.length)) return {}

  return etapesWithInfos.reduce(
    (r, etape) => {
      const polygons = toPolygons(coords, c => ({
        wgs84: {
          coords: [+c.W_DD, +c.N_DD],
          epsg: 4326
        },
        utm95: {
          coords: [+c.W_Utm95, +c.N_Utm95],
          epsg: 2972
        },
        description: c.Correspondance
      }))

      const { points, pointsReferences } = polygonsToCamino(polygons, etape.id)

      r.points = [...r.points, ...points]
      r.pointsReferences = [...r.pointsReferences, ...pointsReferences]

      return r
    },
    { points: [], pointsReferences: [] }
  )
}

const csvRead = file =>
  new Promise((resolve, reject) => {
    let dossiers = []

    const streamFile = createReadStream(`./exports/${file}`)
    const streamCsv = csv({ objectMode: true })

    streamFile.pipe(streamCsv)

    streamCsv.on('data', data => {
      dossiers.push(JSON.parse(data))

      if (false && dossiers.length === 100) {
        resolve(dossiers)

        streamFile.close()
      }
    })

    streamCsv.on('end', () => resolve(dossiers))
    streamCsv.on('error', reject)
  })

const main = async () => {
  try {
    const file = 'onf-dossiers.csv'
    // const file = 'onf-dossiers-light.csv'
    // const file = 'AR2018024.csv'

    let dossiers = await csv().fromFile(`./exports/${file}`)

    // let dossiers = await csvRead(file)

    dossiers = dossiers.filter(d => d.Typededossier === 'ARM')

    // dossiers = dossiers.filter(d => d.IDDossier == '104')

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
    const polycoordonneesIndexPolygones = indexify(
      polycoordonnees,
      'IDPolygone'
    )

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

    const titreIdIndex = {}

    const entreprisesTitulairesIndex = {}

    const res = await dossiers.reduce(async (acc, dossier) => {
      acc = await acc

      const { IDDossier: dossierId } = dossier

      const titre = titreArmCreate(titreIdIndex, dossier)

      const demarches = []
      const etapes = []
      const substances = []
      const documents = []
      const incertitudes = []

      let etapesWithInfos = []

      const octroi = octroiCreate(dossier, titre)
      let octroiDef

      if (octroi) {
        demarches.push(octroi)

        const mdp = depotCreate(dossier, octroi)

        if (mdp) {
          etapes.push(mdp)

          etapesWithInfos.push(mdp)
        }

        const men = enregistrementCreate(dossier, octroi)

        if (men) {
          etapes.push(men)
        }

        await rtfsParse(dossier)

        const eof = expertiseCreate(dossier, octroi)

        if (eof) {
          etapes.push(eof)

          const [notes, motif] = expertiseDocumentsCreate(dossier, eof)

          if (notes) {
            documents.push(notes)
          }

          if (motif) {
            documents.push(motif)
          }
        }

        const aof = avisCreate(dossier, octroi)

        if (aof) {
          etapes.push(aof)
        }

        const eofRev = expertiseCreate(dossier, octroi, 'REV')

        if (eofRev) {
          etapes.push(eofRev)

          const [notes, motif] = expertiseDocumentsCreate(dossier, eof, 'REV')

          if (notes) {
            documents.push(notes)
          }

          if (motif) {
            documents.push(motif)
          }
        }

        const aofRev = avisCreate(dossier, octroi, 'REV')

        if (aofRev) {
          etapes.push(aofRev)
        }

        octroiDef = octroiDefCreate(dossier, octroi)

        if (octroiDef) {
          etapes.push(octroiDef)
          etapesWithInfos.push(octroiDef)
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

      if (etapesWithInfos.length) {
        const { points: p = [], pointsReferences: r = [] } = pointsEtapesCreate(
          polygonesIndexDossiers,
          polycoordonneesIndexPolygones,
          dossierId,
          etapesWithInfos
        )

        if (p.length) {
          points = [...points, ...p]
        }

        if (r.length) {
          pointsReferences = [...pointsReferences, ...r]
        }

        etapesWithInfos.reduce((substances, etape) => {
          substances.push({
            titreEtapeId: etape.id,
            substanceId: 'auru'
          })
          return substances
        }, substances)
      }

      let titulaires = []
      let entreprises = []

      // const entreprise = entreprisesIndex[dossier.NomDemandeur]
      const entreprise = demandeursIndex[capitalize(dossier.NomDemandeur)]
      if (!entreprise) {
        info(
          'tit',
          dossier.ReferenceONF,
          'entreprise introuvable',
          dossier.NomDemandeur
        )
      } else {
        titulaires = etapes.reduce(
          (titulaires, e) =>
            ['mdp', 'def'].includes(e.typeId)
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
        titresDemarches: demarches,
        titresEtapes: etapes,
        titresPoints: points,
        titresPointsReferences: pointsReferences,
        titresTitulaires: titulaires,
        titresSubstances: substances,
        titresDocuments: documents,
        titresIncertitudes: incertitudes,
        entreprises
      })

      return acc
    }, [])

    const tables = [
      'titres',
      'titresDemarches',
      'titresEtapes',
      'titresPoints',
      'titresPointsReferences',
      'titresTitulaires',
      'titresSubstances',
      'titresDocuments',
      'titresIncertitudes',
      'entreprises'
    ]

    tables.forEach(nom => {
      const items = res.reduce((r, e) => [...r, ...(e[nom] || [])], [])

      toCsv(items, nom)
    })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

main()
