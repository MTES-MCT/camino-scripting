const fs = require('fs')
const csv = require('csvtojson')
const json2csv = require('json2csv').parse
const slugify = require('@sindresorhus/slugify')
const cryptoRandomString = require('crypto-random-string')

const padStart = (n, i, c) => n.toString().padStart(i, c)
const padEnd = (n, i, c) => n.toString().padEnd(i, c)
const toLowerCase = s => (s || '').toString().toLowerCase()

const allDocsDeb = []
const allDocsCamino = []

const capitalize = str => str && `${str[0].toUpperCase()}${str.slice(1)}`

// https://stackoverflow.com/questions/44195322/a-plain-javascript-way-to-decode-html-entities-works-on-both-browsers-and-node
const decodeEntities = encodedString => {
  const translate_re = /&(nbsp|amp|quot|lt|gt);/g
  const translate = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    lt: '<',
    gt: '>'
  }

  return encodedString
    .replace(translate_re, (match, entity) => translate[entity])
    .replace(/&#(\d+);/gi, (match, numStr) => {
      var num = parseInt(numStr, 10)

      return String.fromCharCode(num)
    })
}

const indexify = (arr, key, { unique = false, caseSensitive = true }) => {
  const getKey = typeof key !== 'function' ? e => e[key] : key

  return arr.reduce((r, e) => {
    let val = getKey(e)

    if (!caseSensitive) {
      val = toLowerCase(val)
    }

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

const loadSchema = async schema => {
  const files = await Promise.all(
    schema.map(async table => {
      const fileName = table.fileName || `deb_${table.name}.csv`

      const csvFilePath = `../sources/csv/${fileName}`

      try {
        const data = fileName.match(/csv$/)
          ? await csv().fromFile(csvFilePath)
          : JSON.parse(fs.readFileSync(csvFilePath).toString())

        return {
          table,
          data: table.data ? table.data(data) : data
        }
      } catch (e) {
        console.error(table.name, e)

        process.exit(1)
      }
    })
  )

  return files.reduce((result, { table, data }) => {
    //    const { 0: first, length } = data

    //    const cols = Object.keys(first)

    result[table.name] = {
      table,
      //      length,
      //      cols,
      data
      //      display: `${table.name} (${length}):\n- ${cols.join('\n- ')}`
    }

    return result
  }, {})
}

let tables

const tablesIndexify = tables =>
  Object.keys(tables).forEach(name => {
    const rest = tables[name]
    const { table, data } = rest

    rest.indices = table.indices.reduce((r, { name, key, ...options }) => {
      r[name] = indexify(data, key, options)

      return r
    }, {})
  })

const tablesLink = tables =>
  Object.keys(tables).forEach(name => {
    const rest = tables[name]
    const { table, data } = rest

    data.forEach(
      row =>
        table.links &&
        table.links.reduce(
          (r, { name, key, index, alias = key, caseSensitive = true }) => {
            try {
              let val = typeof key === 'function' ? key(row) : row[key]

              if (!caseSensitive) {
                val = toLowerCase(val)
              }

              row[alias] = tables[name].indices[index][val]
            } catch (e) {
              console.error(name, index, key, row[key], alias)
              console.error(e)
              process.exit(1)
            }

            return r
          },
          {}
        )
    )
  })

const domainesCamino = {
  CA: 'c',
  MI: 'm',
  GM: 'w'
}

const typesCamino = {
  PEC: 'pc',
  CON: 'cx',
  PER: 'pr',
  PEX: 'px'
}

const demarchesCamino = {
  1: 'amo',
  2: 'oct',
  3: 'fus',
  4: 'mut',
  5: titre =>
    titre.typeId.match(/cx|pc/)
      ? 'pro'
      : `pr${titre.demarches.filter(d => d.typeId.match(/^pr/)).length + 1}`,
  6: 'ren',
  7: 'ret',
  8: null
}

const etapesCamino = {
  1: 'men',
  2: null,
  3: 'spp',
  4: 'mcr',
  5: 'mco',
  6: 'anf',
  7: 'ane',
  8: null,
  9: null,
  10: null,
  11: 'apo',
  12: 'epu',
  13: 'epu',
  14: 'edm',
  15: 'apd',
  16: 'apd',
  17: 'app',
  18: null,
  19: 'cac',
  20: 'cac',
  21: 'cim',
  22: 'scg',
  23: 'rcg',
  24: 'acg',
  25: 'spe',
  26: 'spe',
  27: null,
  28: 'ape',
  29: 'rpe',
  30: 'sas',
  31: 'dex',
  32: 'dpu',
  33: null,
  34: 'mno',
  35: null,
  36: null,
  37: 'rco',
  38: null,
  39: null,
  40: 'mco',
  41: 'rco'
}

// TODO: événements gérés plus tard
const evenementsNonGeres = {
  8: true,
  9: true,
  35: true,
  36: true
}

const substancesCamino = {
  1: 'kals',
  2: 'anda',
  3: 'anti',
  4: 'arge',
  5: null,
  6: null,
  7: 'arse',
  8: 'aloh',
  9: 'bery',
  10: 'bism',
  11: 'cadm',
  12: null,
  13: 'chro',
  14: 'coba',
  15: 'cuiv',
  16: 'diam',
  17: 'diat',
  18: 'etai',
  19: 'ferx',
  20: 'fluo',
  21: 'galt',
  22: 'gall',
  23: 'germ',
  24: 'grap',
  25: 'gyps',
  26: 'hafn',
  27: 'indi',
  28: 'kaol',
  29: 'maer',
  30: 'mang',
  31: 'marn',
  32: 'merc',
  33: 'moly',
  34: 'nick',
  35: 'niob',
  36: 'auru',
  37: 'phos',
  38: null,
  39: 'plat',
  40: 'plom',
  41: 'rhen',
  42: 'saco',
  43: 'sgra',
  44: 'sasi',
  45: 'sgsm',
  46: 'nacl',
  47: 'sele',
  48: null,
  49: 'souf',
  50: 'suco',
  51: null,
  52: 'tant',
  53: 'tell',
  54: 'trxx',
  55: 'thal',
  56: 'tita',
  57: 'wolf',
  59: 'vana',
  59: 'zinc',
  60: 'zirc',
  61: 'cesi',
  62: 'scan',
  63: 'plax'
}

// les documents de ces types d'étapes sont visibles par les entreprises
const etapesDocsEntreprisesLecture = [
  'mfr',
  'mdp',
  'des',
  'pfd',
  'mod',
  'mco',
  'rco',
  'mif',
  'rif',
  'mcp',
  'apu',
  'rde',
  'vfd',
  'anf',
  'ane',
  'ppu',
  'epu',
  'dim',
  'dex',
  'dpu',
  'dux',
  'dup',
  'rpu',
  'rtd',
  'abd',
  'and',
  'mno',
  'pfc',
  'vfc',
  'sco',
  'aco'
]

const documentsCamino = {
  1: 'lem',
  2: 'acr',
  3: 'lpf',
  4: 'cnr',
  5: 'cco',
  6: 'avc',
  7: null,
  8: 'lcm',
  9: 'acm',
  10: 'ocd',
  11: 'acd',
  12: 'aep',
  13: 'rce',
  14: 'rdr',
  15: 'adr',
  16: 'not',
  17: 'apf',
  18: null,
  19: 'lac',
  20: 'aac',
  21: null,
  22: 'lcg',
  23: null,
  24: null,
  25: 'lce',
  26: 'lce',
  27: null,
  28: null,
  29: 'erd',
  30: 'nas',
  31: 'arm',
  32: 'pub',
  33: null,
  34: 'ndd',
  35: 'arp',
  36: null,
  37: 'cod',
  38: 'ndc',
  39: 'ndc',
  40: 'cco',
  41: 'cod'
}

const entreprisesNoSiren = []

const schema = [
  {
    name: 'titres',
    indices: [{ name: 'id', key: 'id', unique: true }],
    links: [
      { name: 'titres_types', key: 'typtit', index: 'id' },
      { name: 'titres_etats_t', key: 'etatt', index: 'id' },
      { name: 'titres_etats_j', key: 'etatj', index: 'id' },
      {
        name: 'titres_substances',
        key: 'id',
        index: 'titres',
        alias: 'substances'
      },
      // /*
      {
        name: 'liens_titulaires',
        key: 'id',
        index: 'titres',
        alias: 'titulaires'
      },
      // */
      {
        name: 'affaires',
        key: 'id',
        index: 'titres',
        alias: 'affaires'
      },
      {
        name: 'titres_rntm_consolidation',
        key: l => `${l.datprefsd}-${l.cod}-${l.txtcod}`,
        index: 'ref',
        alias: 'rntmConsol'
      },
      {
        name: 'rntm',
        key: l => {
          const consol =
            l.rntmConsol &&
            l.rntmConsol.find(
              r => r.Code && r.match === 'TRUE' && r.non_reprise_deb !== 'TRUE'
            )

          return consol && consol.Code
        },
        index: 'code',
        alias: 'rntm'
      }
    ]
  },

  {
    name: 'titres_types',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'titres_etats_t',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'titres_etats_j',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'titres_rntm_consolidation',
    indices: [{ name: 'ref', key: 'ref', unique: false }]
  },

  {
    name: 'rntm',
    fileName: '../json/rntm.geojson',
    data: d => d.features,
    indices: [
      {
        name: 'code',
        key: l => l.properties.Code,
        unique: true
      }
    ]
  },

  {
    name: 'affaires',
    indices: [
      { name: 'id', key: 'id', unique: true },
      { name: 'titres', key: 'id_tit', unique: false }
    ],
    links: [
      { name: 'affaires_types', key: 'a_typ', index: 'id' },
      { name: 'affaires_etats', key: 'a_etat', index: 'id' },
      { name: 'events', key: 'id', index: 'affaires', alias: 'events' }
    ]
  },
  {
    name: 'affaires_types',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'affaires_etats',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },

  {
    name: 'events',
    indices: [
      { name: 'id', key: 'id', unique: true },
      { name: 'affaires', key: 'id_aff', unique: false }
    ],
    links: [
      { name: 'events_types', key: 'cod_evt', index: 'id' },
      {
        name: 'events_documents',
        key: 'id',
        index: 'events',
        alias: 'documents'
      },
      {
        name: 'events_documents_consolidation',
        key: 'id',
        index: 'events',
        alias: 'documentsConsolidation'
      }
    ]
  },
  {
    name: 'events_types',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'events_documents',
    indices: [
      { name: 'id', key: 'id', unique: true },
      { name: 'events', key: 'id_evt', unique: false }
    ]
  },
  {
    name: 'events_documents_consolidation',
    indices: [
      { name: 'id', key: 'id', unique: true },
      { name: 'events', key: 'id_evt', unique: false }
    ]
  },

  // /*
  {
    name: 'titulaires',
    indices: [{ name: 'id', key: 'itv_cdn', unique: true }],
    links: [
      {
        name: 'liens_titulaires',
        key: 'id',
        index: 'titulaires',
        alias: 'titres'
      },
      {
        name: 'titulaires_consolidation',
        key: 'itv_nom_lb',
        index: 'name',
        alias: 'consolidation',
        caseSensitive: false
      }
    ]
  },
  {
    name: 'liens_titulaires',
    indices: [
      { name: 'titres', key: 'id_tit' },
      { name: 'titulaires', key: 'id_titu' }
    ],
    links: [
      { name: 'titulaires', key: 'id_titu', index: 'id', alias: 'titulaire' }
    ]
  },
  {
    name: 'titulaires_consolidation',
    indices: [{ name: 'name', key: 'nom', unique: true, caseSensitive: false }]
  },
  // */

  {
    name: 'substances',
    indices: [{ name: 'id', key: 'id', unique: true }]
  },
  {
    name: 'titres_substances',
    indices: [
      { name: 'titres', key: 'id_tit' },
      { name: 'substances', key: 'id_sub' }
    ],
    links: [
      {
        name: 'substances',
        key: 'id_sub',
        index: 'id',
        alias: 'substance'
      }
    ]
  }
]

const entrepriseCreate = (titulaire, titre) => {
  let {
    itv_nom_lb: nom,
    itv_rfa: siren,
    itv_rue: adresse,
    itv_vil: ville,
    consolidation
  } = titulaire

  nom = decodeEntities(nom)

  if (!consolidation)
    console.error('pas de consolidation titulaire:', titulaire.itv_nom_lb)
  if (consolidation && consolidation.ignorer === 'TRUE') return null

  const codePostal = ((ville && ville.match(/[0-9]{5}/)) || [])[0] || ''
  const commune = ville && ville.replace(/\s*\(?[0-9]{5}\s*\)/, '')

  siren = siren.replace(/[^0-9]/g, '').slice(0, 9)

  let id

  if (!siren && !consolidation) {
    if (entreprisesNoSiren.includes(toLowerCase(nom))) {
      return null
    }

    entreprisesNoSiren.push(toLowerCase(nom))

    id = `xx-${padStart(titre.c_dpt_coor, 3, '0')}${padStart(
      '',
      3,
      '0'
    )}${padStart(entreprisesNoSiren.length + 1, 3, '0')}`

    siren = ''
  } else {
    id = `fr-${consolidation ? consolidation.legalSiren : siren}`
  }

  const entreprise = {
    id,
    nom,
    paysId: '',
    legalSiren: siren,
    adresse,
    codePostal,
    commune
  }

  return entreprise
}

const entreprisesCreate = titres =>
  titres.reduce(
    (entreprises, titre) =>
      (titre.titulaires || []).reduce((entreprises, lien) => {
        if (!lien.titulaire) return entreprises

        const entreprise = entrepriseCreate(lien.titulaire, titre)

        if (entreprise && !entreprises.find(e => e.id === entreprise.id)) {
          lien.entreprise = entreprise

          entreprises.push(entreprise)
        }

        return entreprises
      }, entreprises),
    []
  )

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

let total = 0

const titreOctroiCalc = l => {
  let date

  if (l.affaires) {
    l.affaires.some(affaire => {
      if (demarchesCamino[affaire.a_typ.id] !== 'oct') return false

      return affaire.events.some(event => {
        if (
          ['dpu', 'dex'].includes(etapesCamino[event.cod_evt.id]) &&
          event.dat
        ) {
          date = event.dat

          return true
        }

        return false
      })
    })
  }

  return date || l.datmo || l.datprefsd
}

const titreCreateInformation = (l, titre) => {
  const { rntm } = l

  total += 1

  let dateOctroi = rntm && rntm.properties.Date_octroi

  if (dateOctroi) {
    // formate la date RNTM DD/MM/AAAA
    const parts = dateOctroi.split('/')

    dateOctroi = `${parts[2]}-${parts[1]}-${parts[0]}`
  } else {
    dateOctroi = l.datmo || l.datprefsd
  }

  // si pas de date d'octroi
  // ou date en 2013 (date de mise à jour dans DEB)
  if (!dateOctroi || dateOctroi.match(/2013/)) {
    // alors on met une valeur incertaine
    // à la date de création du droit minier
    dateOctroi = '1810-04-21'
  }

  //  if (false)
  console.error(
    total,
    l.nmtit,
    ', date :',
    dateOctroi,
    ', date octroi rntm:',
    rntm && rntm.properties.Date_octroi
  )

  const demarche = (({ typeId }) => ({
    id: `${titre.id}-${typeId}01`,
    typeId,
    statutId: 'ind',
    etapes: []
  }))({ typeId: 'oct' })

  titre.demarches.push(demarche)

  const titulaires = (l.titulaires || []).reduce((titulaires, lien) => {
    if (lien.entreprise) {
      titulaires.push({ id: lien.entreprise.id })
    }

    return titulaires
  }, [])

  if (!titulaires.length && rntm && rntm.properties.Dernier_titulaire) {
    const dernier = rntm.properties.Dernier_titulaire

    const titulaire = tables.titulaires_consolidation.data.find(
      t => t.nom.toLowerCase() === dernier.toLowerCase()
    )

    if (!titulaire) {
      console.log(dernier)

      process.exit(0)
    }

    titulaires.push({
      id: titulaire.id,
      nom: titulaire.nom.toUpperCase()
    })
  }

  const etape = (({ typeId }) => {
    const id = `${demarche.id}-${typeId}01`

    return {
      id,
      typeId,
      statutId: 'fai',
      date: dateOctroi,
      ordre: 1,
      titulaires,
      points: rntm
        ? rntm.geometry.coordinates.reduce(
            (res, points, contourId) => [
              ...res,
              ...pointsCreate(id, points, contourId, 0)
            ],
            []
          )
        : [],
      incertitudes: {
        date: true,
        points: !!rntm,
        titulaires: true
      }
    }
  })({ typeId: 'ihi' })

  demarche.etapes.push(etape)

  return titre
}

const sansOctroiIgnore = [
  'X20/07',
  '2013-0222-MI',
  '2013-0405-MI',
  '2013-0406-MI',
  '2013-0269-MI',
  '2013-0296-MI',
  '2013-0297-MI',
  '2013-0295-MI',
  '2016-0003-MI',
  '2015-0003-MI',
  '2016-0007-MI',
  '2015-0015-MI',
  '2013-0262-MI',
  '2013-0229-MI',
  '2013-0074-MI',
  '2015-0007-MI',
  '2015-0014-MI',
  '2013-0158-MI',
  '2013-0233-MI',
  '2013-0129-MI',
  '2013-0018-CA',
  '2015-0002-CA',
  '2013-0223-MI',
  '2013-0226-MI',
  '2013-0230-MI',
  '2013-0267-MI',
  '2014-0003-MI',
  '2013-0253-MI',
  '2013-0480-MI',
  '2013-0481-MI',
  '2013-0488-MI',
  '2013-0232-MI',
  '2013-0499-MI',
  '2017-0006-MI'
]

const titreCreate = (l, titresIds, build) => {
  if (!l.typtit) return null

  // Petit-Hâvre sera traîté manuellement
  if (l.id === '96') return null

  // on ignore les titres suivant la consolidation RNTM
  if (l.rntmConsol && l.rntmConsol.find(c => c.non_reprise_deb === 'TRUE')) {
    // console.error('ignore:', l.nmtit)

    return null
  }

  const reference = `${l.datprefsd}-${l.cod}-${l.txtcod}`

  // on ignore la liste des titres sans octroi
  // la consolidation sera faite manuellement
  if (sansOctroiIgnore.includes(reference)) return null

  const domaineId = domainesCamino[l.txtcod]

  const typeId = `${typesCamino[l.typtit.cod]}${domaineId}`

  const annee = titreOctroiCalc(l).slice(0, 4)

  let nom = decodeEntities(l.nmtit)

  l.id = `${domaineId}-${typeId.slice(0, 2)}-${slugify(nom)}-${annee}`

  // l'id est déjà pris
  if (titresIds[l.id]) {
    const id = l.id

    const n = titresIds[l.id] + 1

    titresIds[l.id] = n

    // on ajoute un numéro à la fin du nom et de l'id
    l.id = `${l.id}-${n}`
    nom = `${nom} (${n})`

    console.error('old:', id, '=> new:', l.id)
  }

  let titre = {
    id: l.id,
    nom,
    typeId,
    domaineId,
    statutId: 'ind',
    references: [
      {
        typeId: 'deb',
        nom: reference
      }
    ],
    demarches: []
  }

  const props = build(l, titre)
  if (!props) return null

  // on ne s'intéresse qu'aux titres ayant des démarches avec étapes
  // if (!titre.demarches.find(d => d.etapes.length)) return null

  // on consolide les titres sans démarche/affaire
  // avec RNTM, s'il y a un lien
  if (
    !titre.demarches.length &&
    l.rntmConsol &&
    l.rntmConsol.find(c => c.sans_demarches === c.ref)
  ) {
    titre = titreCreateInformation(l, titre)

    if (!titre) return null
  }

  return {
    ...titre,
    ...props
  }
}

const titresCreate = (titres, build = () => ({})) =>
  titres.reduce(
    ({ titresIds, titres }, l) => {
      const titre = titreCreate(l, titresIds, build)
      if (!titre) return { titresIds, titres }

      l.titre = titre

      titresIds[l.id] = (titresIds[l.id] | 0) + 1

      titres.push(l.titre)

      return { titresIds, titres }
    },
    { titresIds: {}, titres: [] }
  ).titres

const titreDocumentCreate = (event, titreEtape, documentDeb) => {
  let typeId = documentsCamino[event.cod_evt.id]
  if (!typeId) return null

  // on ne traite que les pdf
  if (documentDeb.exten && documentDeb.exten !== 'pdf') return null

  if (documentDeb.import !== 'TRUE') return null

  const date = documentDeb.datdep

  const hash = cryptoRandomString({ length: 8 })

  const documentId = `${date}-${typeId}-${hash}`

  const document = {
    id: documentId,
    titreEtapeId: titreEtape.id,
    typeId,
    date,
    url: encodeURI(
      decodeEntities(documentDeb.url).replace(
        'http://www.deb.developpement-durable.gouv.fr/titreminier/documents/',
        'http://www.deb.developpement-durable.gouv.fr/titreminier/upload.php?file=documents/'
      )
    ),
    description: documentDeb.tdoc
      ? capitalize(decodeEntities(documentDeb.tdoc))
      : null,
    fichier: documentDeb.nfic ? true : null,
    fichierTypeId: documentDeb.nfic ? documentDeb.exten : null,
    publicLecture: false,
    entreprisesLecture: etapesDocsEntreprisesLecture[titreEtape.typeId],
    fileName: documentDeb.nfic ? documentDeb.nfic : null
  }

  documentDeb.idCamino = documentId

  return document
}

const titreEtapeBuild = (l, event, titreEtape) => {
  if (!event.dat) return null

  const etape = {}

  allDocsDeb.push(...(event.documentsConsolidation || []))

  const documents = (event.documentsConsolidation || []).reduce(
    (documents, documentDeb) => {
      const document = titreDocumentCreate(event, titreEtape, documentDeb)

      if (document) {
        documents.push(document)
      }

      return documents
    },
    []
  )

  allDocsCamino.push(...documents)

  etape.documents = documents

  // avis
  if (titreEtape.typeId[0] === 'a') {
    etape.statutId = (event.obs || '').match(/d[ée]favorable/i) ? 'def' : 'fav'

    return etape
  }

  if (!['men', 'dex', 'dpu'].includes(titreEtape.typeId)) return etape

  const titulaires = (l.titulaires || []).reduce((titulaires, lien) => {
    if (lien.entreprise) {
      titulaires.push({ id: lien.entreprise.id })
    }
    return titulaires
  }, [])

  return {
    statutId: (event.obs || '').match(/rej/) ? 'rej' : 'acc',
    duree: (l.duree | 0) * 12,
    surface: +l.surf,
    titulaires,
    ...etape
  }
}

const titreEtapeCreate = (l, event, demarche, typeId, build = () => ({})) => {
  const ordreTypeId =
    demarche.etapes.filter(e => e.typeId === typeId).length + 1

  const id = `${demarche.id}-${typeId}${padStart(ordreTypeId, 2, 0)}`

  const titreEtape = {
    id,
    typeId,
    titreDemarcheId: demarche.id,
    statutId: 'fai',
    ordre: demarche.etapes.length + 1,
    date: event.dat,
    duree: null,
    surface: null,
    points: [],
    substances: [],
    titulaires: []
  }

  const props = build(l, event, titreEtape)
  if (!props) return null

  return { ...titreEtape, ...props }
}

const titreEtapesCreate = (affaire, demarche, l) => {
  if (!affaire.events || !affaire.events.length) return []

  return affaire.events.reduce((titreEtapes, event) => {
    let typeId = etapesCamino[event.cod_evt.id]
    if (!typeId) return titreEtapes

    // les retraits/prorogations/déchéances sont unilatérales
    // on remplace dex et dpu
    // par leur jumelles maléfiques : dux et dup
    if (['ret', 'prr', 'dec'].includes(demarche.typeId)) {
      if (typeId === 'dex') {
        typeId = 'dux'
      } else if (typeId === 'dpu') {
        typeId = 'dup'
      }
    }

    const titreEtape = titreEtapeCreate(
      l,
      event,
      demarche,
      typeId,
      titreEtapeBuild
    )
    if (!titreEtape) return titreEtapes

    titreEtapes.push(titreEtape)
    demarche.etapes.push(titreEtape)

    return titreEtapes
  }, [])
}

const titreDemarcheCreate = (l, titre, typeId, build = () => ({})) => {
  const ordreTypeId =
    titre.demarches.filter(e => e.typeId === typeId).length + 1

  const id = `${titre.id}-${typeId}${padStart(ordreTypeId, 2, 0)}`

  const titreDemarche = {
    id,
    typeId,
    titreId: titre.id,
    statutId: 'ind',
    ordre: titre.demarches.length + 1,
    annulationTitreDemarcheId: null,
    etapes: []
  }

  const props = build(l, id, titreDemarche)
  if (!props) return null

  // on ne s'intéresse pas aux démarches sans étapes
  // if (!titreDemarche.etapes.length) return null

  return {
    ...titreDemarche,
    ...props
  }
}

const titreDemarchesCreate = (l, titre) => {
  if (!l.affaires || !l.affaires.length) return []

  return l.affaires.reduce((titreDemarches, affaire) => {
    let typeId = demarchesCamino[affaire.a_typ.id]
    if (!typeId) return titreDemarches

    typeId = typeof typeId === 'function' ? typeId(titre) : typeId

    const titreDemarche = titreDemarcheCreate(
      l,
      titre,
      typeId,
      (l, titreDemarcheId, demarche) => {
        titreEtapesCreate(affaire, demarche, l)

        return {}
      }
    )
    if (!titreDemarche) return titreDemarches

    titreDemarches.push(titreDemarche)
    titre.demarches.push(titreDemarche)

    return titreDemarches
  }, [])
}

const titrePropsCreate = (l, titre) => {
  // on ne prend pas les titres sans démarche
  const demarches = titreDemarchesCreate(l, titre)
  // if (!demarches.length) return null

  return {}
}

async function main() {
  tables = await loadSchema(schema)

  if (false)
    console.log(
      Object.keys(tables).forEach(table => {
        console.log(tables[table].display)
      })
    )

  tablesIndexify(tables)
  tablesLink(tables)

  const entreprises = entreprisesCreate(tables.titres.data)

  const titres = titresCreate(tables.titres.data, titrePropsCreate)

  if (false)
    console.error(
      titres.find(t =>
        t.demarches.find(d => d.etapes.find(e => e.typeId === 'ihi'))
      ).demarches[0].etapes[0]
    )

  const titus = titres.reduce(
    (r, t) =>
      t.demarches.reduce(
        (r, d) =>
          d.etapes.reduce(
            (r, e) =>
              e.titulaires.reduce((r, t) => (t ? r.set(t.id, t) : r), r),
            r
          ),
        r
      ),
    new Map()
  )

  // console.log(JSON.stringify([...titus.values()]))

  // process.exit(0)

  fs.writeFileSync(
    '../exports/deb-titres-entreprises.json',
    JSON.stringify({ titres, entreprises }, null, 2)
  )

  console.log('fichier ../exports/deb-titres-entreprises.json créé')

  fs.writeFileSync('./all-docs-deb.json', JSON.stringify(allDocsDeb, null, 1))

  fs.writeFileSync(
    './all-docs-camino.json',
    JSON.stringify(allDocsCamino, null, 1)
  )
}

main().catch(console.error)
