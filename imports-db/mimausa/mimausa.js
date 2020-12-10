const { writeFileSync } = require('fs')
const cryptoRandomString = require('crypto-random-string')

const slugify = require('@sindresorhus/slugify')
const titresMimausa = require('./sources/titres-mimausa.json')
const titulairesCamino = require('./sources/titulaires-camino.json')
const json2csv = require('json2csv').parse

let nbErrors = 0
let nbTitresIgnores = 0

const titreIdGet = (domaineId, typeId, titreNom, dateId, titreIds) => {
  let titreId = slugify(`${domaineId}-${typeId}-${titreNom}-${dateId}`)
  const hash = cryptoRandomString({ length: 8 })
  titreId = slugify(`${titreId}-${hash}`)

  return titreId
}

const typesCamino = {
  INC: 'in',
  PER_EXPER: 'pr',
  PEX_EXPEX: 'px',
  CON_EXCON: 'cx',
  NULL: 'in',
  HORS_PER: 'in'
}

const typeGet = (type) => {
  let typeId
  if (!type) {
    typeId = 'in'
  } else {
    typeId = typesCamino[type]
  }

  if (!typeId) {
    throw new Error(`Type inconnu (${type})`)
  }

  return typeId
}

const dateGet = (date) => {
  if (!date || date.trim() === '' || date === 'NULL') {
    return undefined
  }

  return date.slice(0, 10)
}

const etapeGet = (typeId, titreDemarcheId, date, dateFin, surface, duree, substances, titulaires) => ({
  id: `${titreDemarcheId}-${typeId}01`,
  titreDemarcheId: titreDemarcheId,
  typeId,
  statutId: 'acc',
  ordre: 1,
  date,
  dateFin,
  duree : duree ? parseInt(duree) * 12 : undefined,
  surface: surface ? parseFloat(surface) : undefined,
  substances: substances.map((s) => ({
    id: s,
  })),
  titulaires,
  incertitudes: {
    date: true,
    dateDebut: true,
    dateFin: true,
    duree: true,
    surface: true,
    substances: true,
    titulaires: true
  }
})

const titreFormat = (titre, titreIds, reportRow) => {

  const domaineId = 'r'
  const substances = ['uran', 'rxxx']

  const typeId = typeGet(titre.Nature)
  reportRow['Résultat type'] = `${typeId}${domaineId}`

  const titreNom = titre.Nom

  let demarcheEtapeDate = dateGet(titre['Date octroi'])
  if (!demarcheEtapeDate) {
    //On essaie de chercher la date dans le nom
    const year = titreNom.match(/ *\d\d\d\d*/)
    if (year) {
      reportRow[
          'Remarque date'
          ] = `On prend l’année qui est dans le nom du titre`
      demarcheEtapeDate = `${year[0]}-01-01`
    } else {
      demarcheEtapeDate = '1810-04-21'
      reportRow['Remarque date'] = `Pas de date d’octroi de définie`
    }
  }
  reportRow['Résultat date'] = demarcheEtapeDate

  let demarcheEtapeDateFin = dateGet(titre['Date peremption'])

  const dexDate = dateGet(titre['Date décret'])

  const dateId = demarcheEtapeDate.substr(0, 4)

  const titreId = titreIdGet(domaineId, typeId, titreNom, dateId, titreIds)
  reportRow['Résultat titreId'] = titreId

  const demarcheId = 'oct'

  const titreDemarcheId = `${titreId}-${demarcheId}01`


  const references = [
    {
      titreId,
      typeId: 'irs',
      nom: titre.Code,
    },
  ]


  const titulaires = []
  const titulaireMatch = titulairesCamino.find( t => t['Titulaire Mimausa'] === titre.Titulaire)
  if (titulaireMatch && titulaireMatch['Titulaire Camino'].trim() !== '') {
    titulaires.push(titulaireMatch['Titulaire Camino'])
  }else {
    console.log(`titulaire inconnu: ${titre.Titulaire}`)
  }

  const surface = titre.Surface && titre.Surface !== 'NULL' ? titre.Surface : undefined;
  const duree = titre.Duree && titre.Duree !== 'NULL' ? titre.Duree : undefined

  const etapes =  [etapeGet('dpu', titreDemarcheId, demarcheEtapeDate, demarcheEtapeDateFin, surface, duree, substances, titulaires)]
  if (dexDate) {
    etapes.push(etapeGet('dex', titreDemarcheId, dexDate,undefined, surface, undefined, substances, titulaires))
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
    demarches: [
      {
        id: titreDemarcheId,
        typeId: demarcheId,
        titreId,
        statutId: 'ind',
        ordre: 1,
        etapes
      },
    ],
  };
}


const main = () => {
  const reportColumns = [
    'Code',
    'Nom',
    'Nature',
    'Titulaire',
    'Date octroi',
    'Date peremption',
    'Date décret',
    'Durée validité',
  ]

  const caminoIrsnRefs = {
    "33TU01": "r-cx-fieu-1984",
    "19TU06": "r-cx-la-porte-1996",
    "03TU01": "r-cx-la-varenne-1985",
    "56TU05": "r-cx-lignol-1970",
  }

  const report = []
  const titres = titresMimausa.reduce((titres, t) => {
    const reportRow = reportColumns.reduce(
      (acc, c) => ({ ...acc, [c]: t[c] }),
      {}
    )
    report.push(reportRow)

    const titreCaminoId = caminoIrsnRefs[t.Code]
    reportRow['Camino'] = ''
    if (titreCaminoId) {
      nbTitresIgnores++
      reportRow[
        'Camino'
      ] = `https://camino.beta.gouv.fr/titres/${titreCaminoId}`
      return titres
    }

    const titresIds = titres.map((t) => t.id)
    const titre = titreFormat(t, titresIds, reportRow)

    if (titre) {
      titres.push(titre)
    }

    return titres
  }, [])

  const titresIds = titres.map((t) => t.id)
  const duplicateIds = [
    ...new Set(
      titresIds.filter((item, index) => titresIds.indexOf(item) !== index)
    ),
  ]
  if (duplicateIds.length) {
    duplicateIds.forEach((id) => console.log(id))
    throw new Error('Il y a des ids de titres en double')
  }

  try {
    const csv = json2csv(report)
    writeFileSync('./results/rapport.csv', csv)

    writeFileSync('./results/mimausa-titres.json', JSON.stringify(titres, null, 2))
  } catch (err) {
    console.error(err)
  }

  console.log(`${titres.length} titres ont été traités`)
  console.log(
    `${nbTitresIgnores} titres non traités car déjà existant dans Camino`
  )
  console.log(`dont ${nbErrors} titres avec au moins une erreur`)
  console.log(`dont ${titres.length - nbErrors} avec aucune erreur`)
}

main()
