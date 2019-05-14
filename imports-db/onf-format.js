// Correspondances :
// https://docs.google.com/spreadsheets/d/1-6CmKH0_birxfIazM55R6Vr_ipZ-wzykx9boB6NRfR4/edit#gid=1227385847

const { writeFileSync: write } = require('fs')
const slugify = require('@sindresorhus/slugify')
const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const gdal = require('gdal')
const moment = require('moment')

const leftPad = str => str.toString().padStart(2, '0')

const capitalize = str =>
  str.toLowerCase().replace(/(^| )(\w)/g, s => s.toUpperCase())

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
  date = date.replace('-', '').slice(0, 9)
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(-2)}`
}

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

const indexify = (arr, key, unique = false) =>
  arr.reduce((r, e) => {
    const val = e[key]

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
  sourceIndisponible: '',
  data: '',
  ...etape
})

const main = async () => {
  let dossiers = await csv().fromFile('./exports/onf-dossiers-light.csv')
  dossiers = dossiers.filter(d => d.Typededossier === 'ARM')
  const dossiersIndex = indexify(dossiers, 'IDDossier', true)

  const demandeurs = await csv().fromFile('./exports/onf-demandeurs-light.csv')

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
      const { NomDemandeur: nomDemandeur } = demandeurOnf

      const siren = demandeurOnf.SIRET
        ? demandeurOnf.SIRET.replace(/[\s-]/g, '').slice(0, 9)
        : slugify(nomDemandeur)

      const entreprise = {
        id: `fr-${siren}`,
        nom: capitalize(demandeurOnf.NomDemandeur),
        legal_siren: siren,
        pays_id: 'FR',
        commune: capitalize(demandeurOnf.Ville_geo)
      }

      acc.entreprises.push(entreprise)
      acc.entreprisesIndex[nomDemandeur] = entreprise

      return acc
    },
    { entreprises: [], entreprisesIndex: {} }
  )

  const res = dossiers.map(dossier => {
    const { IDDossier: dossierId } = dossier

    const references = {
      ONF: dossier.ReferenceONF,
      PTMG: dossier.RefDrire
    }

    const domaineId = 'm'
    const typeId = typeIdCorrespondance[dossier.Typededossier]
    let titreNom = capitalize(dossier.NomSecteur)
    const dateId = dossier.DepotLe.slice(0, 4)

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

    const demarches = []
    const etapes = []
    const erreurs = []

    const octroi = demarcheCreate({
      id: `${titreId}-oct01`,
      typeId: 'oct',
      titreId,
      statutId: 'ind',
      ordre: 1
    })

    demarches.push(octroi)

    let etapesPointsTitulaires = []

    let mfr

    if (dossier.DepotLe) {
      const dateDepot = dateformat(dossier.DepotLe)

      mfr = etapeCreate({
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

      erreurs.push({
        titreEtapeId: mfr.id,
        date: true
      })

      etapes.push(mfr)
      etapesPointsTitulaires.push(mfr)

      const mdp = etapeCreate({
        id: `${octroi.id}-mdp01`,
        typeId: 'mdp',
        titreDemarcheId: octroi.id,
        statutId: 'fai',
        ordre: 1,
        date: dateDepot
      })

      etapes.push(mdp)
    }

    if (dossier.ArriveeONFle) {
      const men = etapeCreate({
        id: `${octroi.id}-men01`,
        typeId: 'men',
        titreDemarcheId: octroi.id,
        statutId: 'fai',
        ordre: 1,
        date: dateformat(dossier.ArriveeONFle)
      })

      etapes.push(men)
    }

    const avisExpertises = {
      '-1': 'ind',
      1: 'fav',
      2: 'def',
      3: 'ajo'
    }

    if (dossier.DebutAnalyseExpertiseLe || dossier.SaisieAnalyseExpertiseLe) {
      const dateDebut = dateformat(dossier.DebutAnalyseExpertiseLe)
      const dateSaisie = dateformat(dossier.SaisieAnalyseExpertiseLe)
      const eof = etapeCreate({
        id: `${octroi.id}-eof01`,
        typeId: 'eof',
        titreDemarcheId: octroi.id,
        statutId: dateSaisie ? 'fai' : 'eco',
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

      // TODO: créer document
      if (dossier.NotesExpertise) {
        // eof.data.note_expertise_interne = capitalize(dossier.NotesExpertise)
      }

      // TODO: créer document
      if (dossier.MotifExpertise) {
        // eof.data.note_expertise = capitalize(dossier.MotifExpertise)
      }

      // donnée à ne pas reprendre
      // if (dossier.CorpsExpertise) {
      // eof.data.corps_expertise = capitalize(dossier.CorpsExpertise)
      // }

      etapes.push(eof)
    }

    if (dossier.AvisExpertise !== '-1') {
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

      etapes.push(aof)
    }

    if (dossier.RevisionExpertise === '1') {
      if (
        dossier.REVDebutAnalyseExpertiseLe ||
        dossier.REVSaisieAnalyseExpertiseLe
      ) {
        const dateDebut = dateformat(dossier.REVDebutAnalyseExpertiseLe)
        const dateSaisie = dateformat(dossier.REVSaisieAnalyseExpertiseLe)
        const eof = etapeCreate({
          id: `${octroi.id}-eof02`,
          typeId: 'eof',
          titreDemarcheId: octroi.id,
          statutId: dateSaisie ? 'fai' : 'eco',
          ordre: 1,
          date: dateDebut || dateSaisie,
          dateFin: dateSaisie || '',
          data: {}
        })

        if (dossier.REVOperateurUsExpertise) {
          eof.data.operateur_expertise = capitalize(
            dossier.REVOperateurUsExpertise
          )
        }

        if (dossier.REVExpertiseSuiviePar) {
          eof.data.agent_implique = capitalize(dossier.REVExpertiseSuiviePar)
        }

        // TODO: créer document
        if (dossier.REVNotesExpertise) {
          // eof.data.note_expertise_interne = capitalize(dossier.REVNotesExpertise)
        }

        // TODO: créer document
        if (dossier.REVMotifExpertise) {
          // eof.data.note_expertise = capitalize(dossier.REVMotifExpertise)
        }

        // donnée à ne pas reprendre
        // if (dossier.REVCorpsExpertise) {
        // eof.data.corps_expertise = capitalize(dossier.REVCorpsExpertise)
        //}

        etapes.push(eof)
      }

      if (dossier.REVAvisExpertise !== '-1') {
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

        etapes.push(aof)
      }
    }

    let points = []
    let pointsReferences = []

    let octroiDef
    // SI l'avis d'expertise est favorable
    // MAIS pas de date de signature de convention
    // ET le dossier est archivé
    // ALORS le titre est classé sans suite
    // => voir comment traduire ça dans camino
    if (dossier.AvisExpertise !== '-1') {
      let statutId
      if (dossier.ConventionSigneeLe) {
        statutId = 'acc'
      } else if (dossier.AvisExpertise === '2') {
        statutId = 'rej'
      } else if (dossier.AvisExpertise === '1') {
        statutId = 'ind'
      }

      const date = dateformat(
        dossier.ConventionSigneeLe ||
          dossier.AvisExpertiseOnfLe ||
          dossier.SaisieAnalyseExpertiseLe ||
          dossier.DebutAnalyseExpertiseLe
      )

      let dateFin

      if (dossier.ProlongationARM !== '1' && dossier.FinConventionLe) {
        dateFin = dateformat(dossier.FinConventionLe)
      } else {
        dateFin = moment(new Date(date))
        dateFin.add(4, 'months')
        dateFin = dateformat(dateFin.toDate().toISOString())
      }

      octroiDef = etapeCreate({
        id: `${octroi.id}-def01`,
        typeId: 'def',
        titreDemarcheId: octroi.id,
        statutId,
        ordre: 1,
        date,
        duree: statutId === 'acc' ? 4 : '',
        dateFin,
        surface: statutId === 'acc' ? dossier.SurfacePermisKm2 : '',
        data: {}
      })

      if (statutId === 'acc') {
        if (dossier.CorpsConvention) {
          // octroiDef.data.corps_decision = capitalize(dossier.CorpsConvention)
        }

        if (dossier.ConventionSigneePar) {
          octroiDef.data.convention_signee_par = capitalize(
            dossier.ConventionSigneePar
          )
        }

        if (dossier.ConventionValideePar) {
          octroiDef.data.convention_validee_par = capitalize(
            dossier.ConventionValideePar
          )
        }

        if (dossier.ConventionSuiviePar) {
          octroiDef.data.agent_implique = capitalize(
            dossier.ConventionSuiviePar
          )
        }
      }

      etapes.push(octroiDef)
      etapesPointsTitulaires.push(octroiDef)
    }

    let prorogation
    let prorogationDef
    if (dossier.ProlongationARM === '1') {
      prorogation = demarcheCreate({
        id: `${titreId}-prr01`,
        typeId: 'prr',
        titreId,
        statutId: 'ind',
        ordre: 1
      })

      demarches.push(prorogation)

      let date = ''

      if (dossier.ConventionSigneeLe) {
        date = moment(octroiDef.date)
        date.add(4, 'months')
        date = dateformat(date.toDate().toISOString())
      }

      prorogationDef = etapeCreate({
        id: `${prorogation.id}-def01`,
        typeId: 'def',
        titreDemarcheId: prorogation.id,
        statutId: 'acc',
        ordre: 1,
        date,
        dateFin: dossier.FinConventionLe
          ? dateformat(dossier.FinConventionLe)
          : '',
        duree: 4
      })

      etapes.push(prorogationDef)
    }

    if (octroiDef && dossier.QuitusLe) {
      const dateQuitus = dateformat(dossier.QuitusLe)

      // si la date de quitus est antérieure à la date de fin du titre
      // c'est une renonciation anticipée
      const dateQuitusIsPrevious =
        dateQuitus <
        new Date(prorogation ? prorogationDef.dateFin : octroiDef.dateFin)

      if (dateQuitusIsPrevious) {
        const renonciation = {
          id: `${titreId}-ren01`,
          typeId: 'ren',
          titreId,
          statutId: 'ind',
          ordre: 1
        }

        demarches.push(renonciation)

        const def = etapeCreate({
          id: `${renonciation.id}-ren01`,
          typeId: 'ren',
          titreDemarcheId: renonciation.id,
          statutId: 'acc',
          ordre: 1,
          date: dateQuitus
        })

        etapes.push(def)
      }
    }

    if (etapesPointsTitulaires.length && polygonesIndexDossiers[dossierId]) {
      const g = polygonesIndexDossiers[dossierId]
      const { IDPolygone: idPoly } = g

      const coords = polycoordonneesIndexPolygones[idPoly]
      if (coords && coords.length === 4) {
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

    if (entreprisesIndex[dossier.NomDemandeur]) {
      const entreprise = entreprisesIndex[dossier.NomDemandeur]
      if (!entreprise) {
        console.info(`entreprise introuvable: ${dossier.NomDemandeur}`)
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
      }
    }

    return {
      titres: [titre],
      demarches,
      etapes,
      points,
      pointsReferences,
      titulaires,
      erreurs
    }
  })

  res.push({ entreprises })

  const tables = [
    'titres',
    'demarches',
    'etapes',
    'points',
    'pointsReferences',
    'entreprises',
    'titulaires',
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
