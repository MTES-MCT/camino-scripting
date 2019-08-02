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
const turf = require('@turf/turf')

const infoTypeOrdre = ['oct-eof', 'oct-aof', 'oct-def', 'pro-def', 'tit']

const infos = []

const info = (type, obj) => {
  console.info(
    [infoTypeOrdre.indexOf(type) + 1, type, ...Object.values(obj)].join('\t')
  )

  infos.push(obj)
}

const toCsv = (res, name) => {
  if (!res || !res.length) {
    // console.log('empty file:', name)
    return
  }

  res = res.map(
    o => Object.keys(o).reduce((r, k) => ((r[decamelize(k)] = o[k]), r), {}),
    {}
  )

  const fields = Object.keys(res.reduce((r, o) => ({ ...r, ...o }), {}))

  const opts = { fields }

  try {
    const csv = json2csv(res, opts)
    write(`../exports/camino-onf-windev/${decamelize(name, '_')}.csv`, csv)
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

const isRtfEmpty = str => !str || str.replace(/\s/g, '').trim() === ''

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

const rtfsAll = []

const rtfsParse = dossier =>
  Promise.all(
    ['', 'REV'].reduce(
      (r, prefix) => [
        ...r,
        ...['Notes', 'Motif'].map(async name => {
          const field = `${prefix}${name}Expertise`

          const content = await rtfParseContent(dossier[field])

          dossier[`${field}Rtf`] = content

          const isEmpty = isRtfEmpty(content)

          dossier[`${field}RtfEmpty`] = isEmpty

          const contentClean =
            !isEmpty && content.replace(/[a-f0-9]{16,}/gi, '')

          dossier[`${field}RtfClean`] = contentClean

          if (!isEmpty) {
            rtfsAll.push({
              onf: dossier.ReferenceONF,
              field,
              rtf: contentClean
            })
          }
        })
      ],
      []
    )
  )

const leftPad = str => str.toString().padStart(2, '0')

const capitalize = str =>
  str
    ? str
        .trim()
        .toLowerCase()
        .replace(/(^| )(\w)/g, s => s.toUpperCase())
    : ''

const toWgs = (system, [coord1, coord2]) => {
  //  return [coord1, coord2]

  const point = new gdal.Point(coord1, coord2)
  const transformation = new gdal.CoordinateTransformation(
    gdal.SpatialReference.fromEPSG(system),
    gdal.SpatialReference.fromEPSG(4326)
  )
  point.transform(transformation)

  return [point.x, point.y]
}

const rgfg95 = 2972
const wgs84 = 4326

const polygonCorrect = coordinates => {
  // Enlever les [] contenant coord si l'on rajoute des polygones au lieu de rajouter des trous]

  const coords = [[...coordinates, coordinates[0]]]
  const polygon = turf.polygon(coords)

  // On crée l'enveloppe convexe des coordonnées (le rectangle le plus petit contenant tout les points)
  const convex = turf.convex(polygon)

  // L'enveloppe n'ayant pas exactement les mêmes coordonées que le polygone, on calcule l'aire des 2
  // L'aire d'un papillon est bien plus petite que l'aire d'un polygone fermé.
  // On néglige les erreurs d'approximation des coordonnées (approx < 1 mm)
  const ratio = turf.area(convex) / turf.area(polygon)

  return ratio >= 1.01 ? turf.getCoords(convex)[0] : null
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
      ...['utm95'].map(system => {
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

const polygonReorder = (contour, corrected) =>
  corrected
    .reduce(
      (r, coords) => [
        ...r,
        contour.find(
          c => JSON.stringify(c.wgs84.coords) === JSON.stringify(coords)
        )
      ],
      []
    )
    // exclude last point
    .slice(0, -1)

const polygonsToCamino = (polygons, titreEtapeId) =>
  polygons.reduce(
    ({ points: p, pointsReferences: r }, contour, contourIdOrGroupId) => {
      const coords = contour.map(c => c.wgs84.coords)

      const corrected = polygonCorrect(coords)
      if (corrected) {
        contour = polygonReorder(contour, corrected)
      }

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
  contenu: '',
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

const ptmgClean = (ptmg, onf) => {
  if (!ptmg) return ''

  let formatted = ptmg.trim()
  if (!formatted) return ''

  if (formatted.match(/^(PTMG-\d{4}-\d{3}|YN\d{2}|K\d{5})$/)) return formatted

  formatted = formatted.replace(/[^0-9]+/g, ' ').trim()

  if (formatted.match(/^\d{5}$/)) return `K${formatted}`

  formatted = formatted.match(/^\d{2,3}$/)
    ? `${onf.slice(2, 6)} ${formatted}`
    : formatted

  formatted = formatted.match(/^\d{2} \d{2,3}$/)
    ? `20${formatted.slice(0, 2)} ${formatted.slice(3)}`
    : formatted

  formatted = formatted.replace(/ /, '')
  formatted = (formatted.match(/(\d{6,7})$/) || [formatted]).shift()

  const annee = formatted.slice(0, 4)
  const num = formatted.slice(4)

  formatted = `PTMG-${annee}-${num.padStart(3, 0)}`

  const match = formatted.match(/^(PTMG-2\d{3}-\d{3}|YN\d{2}|K\d{5})$/)
  if (!match) {
    // console.warn(`Mauvais format de numéro PTMG : ${formatted} | ${ptmg}`)
    return ptmg
  }

  return formatted
}

const testRegExp = (regExp, str) => str && regExp.test(str)

const mecaRegExp = /(?<!non[ -])m\\'e9canis/
const manuelleRegExp = /manuelle/
const pelleRegExp = /pelle/

const incertitudes = []

const titreArmCreate = (titreIdIndex, dossier, { mecanisationsIndice }) => {
  const references = {
    ONF: dossier.ReferenceONF,
    //    ptmg: dossier.RefDrire,
    PTMG: ptmgClean(dossier.RefDrire, dossier.ReferenceONF)
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

  const mecanisee =
    testRegExp(mecaRegExp, dossier.NotesExpertiseRtfClean) ||
    testRegExp(mecaRegExp, dossier.MotifExpertiseRtfClean) ||
    testRegExp(mecaRegExp, dossier.REVNotesExpertiseRtfClean) ||
    testRegExp(mecaRegExp, dossier.REVMotifExpertiseRtfClean)

  const manuelle =
    testRegExp(manuelleRegExp, dossier.NotesExpertiseRtfClean) ||
    testRegExp(manuelleRegExp, dossier.MotifExpertiseRtfClean) ||
    testRegExp(manuelleRegExp, dossier.REVNotesExpertiseRtfClean) ||
    testRegExp(manuelleRegExp, dossier.REVMotifExpertiseRtfClean)

  const pelle =
    testRegExp(pelleRegExp, dossier.NotesExpertiseRtfClean) ||
    testRegExp(pelleRegExp, dossier.MotifExpertiseRtfClean) ||
    testRegExp(pelleRegExp, dossier.REVNotesExpertiseRtfClean) ||
    testRegExp(pelleRegExp, dossier.REVMotifExpertiseRtfClean)

  let mecanisation
  if (references.ONF) {
    mecanisation = mecanisationsIndice.onf[references.ONF]
  }
  if (!mecanisation && references.PTMG) {
    mecanisation = mecanisationsIndice.ptmg[references.PTMG]
  }

  const contenu = {
    onf: {
      etat: dossier.EtatDossier,
      avancement: dossier.Avancement,
      mecanisation: mecanisation && mecanisation.mecanisation === 'true',
      mecanisee,
      manuelle,
      pelle
    }
  }

  const titre = titreCreate({
    id: titreId,
    nom: titreNom,
    typeId,
    domaineId,
    statutId: 'ind',
    references,
    contenu
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

const depotCreate = (dossier, octroi, titre) => {
  const contenu = {
    onf: {
      mecanisee: titre.contenu.mecanisation
    }
  }

  const date = dateformat(dossier.DepotLe)

  const id = `${octroi.id}-mdp01`

  if (!date) {
    date = dossier.ReferenceONFAnnee1erJanv

    incertitudes.push({ titreEtapeId: id, date: true })
  }

  const mdp = etapeCreate({
    id,
    typeId: 'mdp',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    surface: dossier.SurfaceDemandee,
    date,
    contenu
  })

  if (dossier.NomForet) {
    mdp.contenu.onf.foret = capitalize(dossier.NomForet)
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

const expertiseCreate = (dossier, octroi, prefix = '') => {
  // si pas de révision d'expertise, alors pas de création d'eof02
  if (prefix === 'REV' && dossier.RevisionExpertise === '0') return null

  const id = `${octroi.id}-eof${prefix ? '02' : '01'}`

  if (
    !dossier[`${prefix}DebutAnalyseExpertiseLe`] &&
    !dossier[`${prefix}SaisieAnalyseExpertiseLe`]
  ) {
    const notesEmpty = dossier[`${prefix}NotesExpertiseRtfEmpty`]
    if (!notesEmpty) {
      info('oct-eof', {
        onf: dossier.ReferenceONF,
        id,
        raison: `pas de dates (début et saisie) d'expertise ${prefix ||
          '1'} mais des notes`,
        avis: dossier[`${prefix}AvisExpertise`],
        contenu: dossier[`${prefix}NotesExpertiseRtfClean`]
      })
    } else {
      return null
    }
  }

  const dateDebut = dateformat(dossier[`${prefix}DebutAnalyseExpertiseLe`])

  const dateSaisie = dateformat(dossier[`${prefix}SaisieAnalyseExpertiseLe`])

  let date = dateDebut || dateSaisie

  if (!date) {
    date = dossier.ReferenceONFAnnee1erJanv

    incertitudes.push({ titreEtapeId: id, date: true })
  }

  const eof = etapeCreate({
    id,
    typeId: 'eof',
    titreDemarcheId: octroi.id,
    statutId: dateSaisie ? 'fai' : 'nfa',
    ordre: 1,
    date,
    dateFin: dateSaisie || '',
    contenu: { onf: {} }
  })

  if (dossier[`${prefix}OperateurUsExpertise`]) {
    eof.contenu.onf.expert = capitalize(
      dossier[`${prefix}OperateurUsExpertise`]
    )
  }

  if (dossier[`${prefix}ExpertiseSuiviePar`]) {
    eof.contenu.onf.agent = capitalize(dossier[`${prefix}ExpertiseSuiviePar`])
  }

  return eof
}

const expertiseDocumentCreate = (dossier, eof, prefix = '') => {
  if (dossier[`${prefix}NotesExpertiseRtfEmpty`]) return null

  let notes = documentCreate({
    titreEtapeId: eof.id,
    fichier: `${eof.id}-notes`,
    type: 'Notes',
    nom: 'Notes'
  })

  writeRtf(
    `../exports/onf-rtf/${eof.id}-notes.rtf`,
    dossier[`${prefix}NotesExpertise`]
  )

  return notes
}

const avisExpertises = {
  '-1': 'nfa',
  1: 'fav',
  2: 'def',
  3: 'ajo'
}

const avisCreate = (dossier, octroi, prefix = '') => {
  const id = `${octroi.id}-aof0${prefix ? 2 : 1}`

  if (
    dossier[`${prefix}AvisExpertise`] === '-1' &&
    !dossier[`${prefix}AvisExpertiseOnfLe`]
  ) {
    const motifEmpty = dossier[`${prefix}MotifExpertiseRtfEmpty`]
    if (!motifEmpty) {
      info('oct-aof', {
        onf: dossier.ReferenceONF,
        id,
        raison: `pas de date d'avis d'expertise ${prefix || '1'} mais un motif`,
        avis: dossier[`${prefix}AvisExpertise`],
        contenu: dossier[`${prefix}MotifExpertiseRtfClean`]
      })
    } else {
      return null
    }
  }

  // si révision et pas d'avis d'expertise, alors pas de création d'aof
  if (!avisExpertises[dossier[`${prefix}AvisExpertise`]]) {
    info('oct-aof', {
      onf: dossier.ReferenceONF,
      id,
      raison: `avis expertise ${prefix || '1'} inconnu`,
      avis: dossier[`${prefix}AvisExpertise`]
    })
    // return null
  }

  if (!dossier[`${prefix}AvisExpertiseOnfLe`]) {
    info('oct-aof', {
      onf: dossier.ReferenceONF,
      id,
      raison: `avis expertise ${prefix || '1'} sans date`,
      avis: dossier[`${prefix}AvisExpertise`]
    })
    // return null
  }

  let date = dateformat(dossier[`${prefix}AvisExpertiseOnfLe`])

  if (!date) {
    date = dossier.ReferenceONFAnnee1erJanv

    incertitudes.push({ titreEtapeId: id, date: true })
  }

  const aof = etapeCreate({
    id,
    typeId: 'aof',
    titreDemarcheId: octroi.id,
    statutId: avisExpertises[dossier[`${prefix}AvisExpertise`]],
    ordre: 1,
    date,
    contenu: {}
  })

  if (dossier[`${prefix}AvisExpertisePar`]) {
    aof.contenu.onf.signataire = capitalize(
      dossier[`${prefix}AvisExpertisePar`]
    )
  }

  return aof
}

const avisDocumentCreate = (dossier, aof, prefix = '') => {
  if (dossier[`${prefix}MotifExpertiseRtfEmpty`]) return null

  let motif = documentCreate({
    titreEtapeId: aof.id,
    fichier: `${aof.id}-motif`,
    type: 'Motif',
    nom: 'Motif'
  })

  writeRtf(
    `../exports/onf-rtf/${aof.id}-motif.rtf`,
    dossier[`${prefix}MotifExpertise`]
  )

  return motif
}

const octroiDefStatutDateGet = (dossier, id, octroi, titre) => {
  // si la convention est signée, l'ARM est forcément valide
  // peu import la mécanisation
  if (dossier.ConventionSigneeLe) {
    return { statutId: 'acc', date: dossier.ConventionSigneeLe }
  }

  let statutId, date

  const avisExpertiseFavorable =
    dossier.AvisExpertise === '1' || dossier.REVAvisExpertise === '1'
  const mecanisee =
    titre.contenu.onf.mecanisee || titre.contenu.onf.mecanisation

  if (!mecanisee) {
    if (avisExpertiseFavorable) {
      // sans signature de convention
      // le statut de l'octroi d'une ARM non mécaniséeest "acceptée"
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

    return { statutId, date }
  }

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

  info('oct-def', {
    onf: dossier.ReferenceONF,
    id,
    raison: 'pas de convention signée pour ARM mécanisée'
  })

  return { statutId, date }
}

const octroiDefCreate = (dossier, octroi, titre) => {
  const id = `${octroi.id}-def01`

  // aucun avis d'expertise ou de révision d'avis, pas de def possible
  if (dossier.AvisExpertise === '-1' && dossier.REVAvisExpertise === '-1') {
    if (dossier.ConventionSigneeLe) {
      info('oct-def', {
        onf: dossier.ReferenceONF,
        id,
        raison: 'convention signée sans avis',
        convention: dossier.ConventionSigneeLe
      })
    }

    return null
  }

  const contenu = {
    onf: {
      // convention: !!dossier.ConventionSigneeLe
    }
  }

  let { statutId, date } = octroiDefStatutDateGet(dossier, id, octroi, titre)

  if (!date) {
    date = dossier.ReferenceONFAnnee1erJanv

    incertitudes.push({ titreEtapeId: id, date: true })

    info('oct-def', {
      onf: dossier.ReferenceONF,
      id,
      raison: 'pas de date de début'
    })
  }

  date = dateformat(date)

  let dateFin

  let duree = ''
  let surface = ''

  if (statutId === 'acc') {
    duree = 4
    surface = dossier.SurfacePermisKm2

    // La date de fin est 4 mois après la date de début
    dateFin = moment(new Date(date))
    dateFin.add(4, 'months')
    dateFin = dateformat(dateFin.toDate().toISOString())
  }

  const octroiDef = etapeCreate({
    id,
    typeId: 'def',
    titreDemarcheId: octroi.id,
    statutId,
    ordre: 1,
    date,
    duree,
    dateFin,
    surface,
    contenu
  })

  return octroiDef
}

const signatureConventionCreate = (dossier, octroi, titre) => {
  if (!dossier.ConventionSigneeLe) return null

  const contenu = {
    onf: {}
  }

  if (dossier.ConventionSigneePar) {
    contenu.onf.signataire = capitalize(dossier.ConventionSigneePar)
  }

  if (dossier.ConventionValideePar) {
    contenu.onf.validateur = capitalize(dossier.ConventionValideePar)
  }

  if (dossier.ConventionSuiviePar) {
    contenu.onf.agent = capitalize(dossier.ConventionSuiviePar)
  }

  const date = dateformat(dossier.ConventionSigneeLe)

  const id = `${octroi.id}-sco01`

  const sco = etapeCreate({
    id,
    typeId: 'sco',
    titreDemarcheId: octroi.id,
    statutId: 'fai',
    ordre: 1,
    surface: dossier.SurfaceDemandee,
    date,
    contenu
  })

  return sco
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
    info('pro-def', {
      onf: dossier.ReferenceONF,
      id: prorogation.id,
      raison: "prorogation sans DEF d'octroi:"
    })
    return null
  }

  let date = octroiDef.dateFin

  let dateFin = dateformat(dossier.FinConventionLe)

  if (!dateFin) {
    info('pro-def', {
      onf: dossier.ReferenceONF,
      id: octroiDef.id,
      raison: 'prorogation mais pas de date de fin'
    })

    dateFin = moment(new Date(date))
    dateFin.add(4, 'months')
    dateFin = dateformat(dateFin.toDate().toISOString())
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
      const polygons = toPolygons(coords, c => {
        const coordsSource = [+c.W_Utm95, +c.N_Utm95]

        // ignore les coordonnées en wgs84
        // la conversion BD Minier n'est pas aussi bonne que celle de gdal
        /*
        wgs84: {
          coords: [+c.W_DD, +c.N_DD],
          epsg: 4326
        },
         */

        return {
          utm95: {
            coords: coordsSource,
            epsg: rgfg95
          },
          wgs84: {
            coords: toWgs(rgfg95, coordsSource),
            epsg: wgs84
          },
          description: c.Correspondance
        }
      })

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

    const streamFile = createReadStream(`../exports/${file}`)
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
    //const file = 'onf-dossiers.csv'
    // corrections manuelles
    const file = 'onf-dossiers-corrected.csv'
    // const file = 'onf-dossiers-light.csv'
    // const file = 'AR2018024.csv'

    let dossiers = await csv().fromFile(`../exports/${file}`)

    // let dossiers = await csvRead(file)

    dossiers = dossiers.filter(d => d.Typededossier === 'ARM')

    // dossiers = dossiers.filter(d => d.IDDossier == '104')

    const dossiersIndex = indexify(dossiers, 'IDDossier', true)

    const mecanisations = await csv().fromFile(
      '../sources/csv/ptmg-2012-2019-consolidation.csv'
    )
    const mecanisationsIndice = {
      ptmg: indexify(mecanisations, 'numero_ptmg', true),
      onf: indexify(mecanisations, 'numero_onf', true)
    }

    const demandeurs = await csv().fromFile('../exports/onf-demandeurs.csv')
    const demandeurdefnsolidation = await csv().fromFile(
      '../sources/csv/onf-entreprises-consolidation.csv'
    )
    const demandeursIndex = indexify(
      demandeurdefnsolidation,
      e => capitalize(e.nom),
      true
    )

    const polygones = await csv().fromFile('../exports/onf-polygones.csv')
    const polygonesIndex = indexify(polygones, 'IDPolygone', true)
    const polygonesIndexDossiers = indexify(polygones, 'IDDossier', true)

    const polycoordonnees = await csv().fromFile(
      '../exports/onf-polycoordonnees-light.csv'
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

      dossier.ReferenceONFAnnee1erJanv = `${dossier.ReferenceONF.slice(
        2,
        6
      )}-01-01`

      await rtfsParse(dossier)

      const titre = titreArmCreate(titreIdIndex, dossier, {
        mecanisationsIndice
      })

      const demarches = []
      const etapes = []
      const substances = []
      const documents = []

      let etapesWithInfos = []

      const octroi = octroiCreate(dossier, titre)
      let octroiDef

      if (octroi) {
        demarches.push(octroi)

        const mdp = depotCreate(dossier, octroi, titre)

        if (mdp) {
          etapes.push(mdp)

          etapesWithInfos.push(mdp)
        }

        const men = enregistrementCreate(dossier, octroi)

        if (men) {
          etapes.push(men)
        }

        const eof = expertiseCreate(dossier, octroi)

        if (eof) {
          etapes.push(eof)

          const notes = expertiseDocumentCreate(dossier, eof)

          if (notes) {
            documents.push(notes)
          }
        }

        const aof = avisCreate(dossier, octroi)

        if (aof) {
          etapes.push(aof)

          const motif = avisDocumentCreate(dossier, aof)

          if (motif) {
            documents.push(motif)
          }
        }

        const eofRev = expertiseCreate(dossier, octroi, 'REV')

        if (eofRev) {
          etapes.push(eofRev)

          const notes = expertiseDocumentCreate(dossier, eofRev, 'REV')

          if (notes) {
            documents.push(notes)
          }
        }

        const aofRev = avisCreate(dossier, octroi, 'REV')

        if (aofRev) {
          etapes.push(aofRev)

          const motif = avisDocumentCreate(dossier, aofRev, 'REV')

          if (motif) {
            documents.push(motif)
          }
        }

        octroiDef = octroiDefCreate(dossier, octroi, titre)

        if (octroiDef) {
          etapes.push(octroiDef)
          etapesWithInfos.push(octroiDef)
        }

        const octroiSco = signatureConventionCreate(dossier, octroi, titre)

        if (octroiSco) {
          etapes.push(octroiSco)
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
        info('tit', {
          onf: dossier.ReferenceONF,
          raison: 'entreprise introuvable',
          demandeur: dossier.NomDemandeur
        })
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
        entreprises
      })

      return acc
    }, [])

    // global
    res.push({ titresIncertitudes: incertitudes })

    const tablesTitre = [
      'titres',
      'titresDemarches',
      'titresEtapes',
      'titresPoints',
      'titresPointsReferences',
      'titresTitulaires',
      'titresSubstances',
      'titresDocuments',
      'titresIncertitudes'
    ]

    const tablesRepertoire = ['entreprises']

    // toCsv(rtfsAll, 'rtfs')
    toCsv(infos, 'infos')

    const tables = [...tablesTitre, ...tablesRepertoire]

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
