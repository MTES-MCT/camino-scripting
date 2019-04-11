/*
const tsvCaminoExistenceCheck = (etapeNomTsv, graphQlRequeteTitre) => {
  //
  Renvoie un chiffre dépendant du degré d'existence du tsv dans Camino
    1 si le titre n'esite pas dans Camino
    2 si la démarche n'existe pas dans Camino
    3 si l'étape n'existe pas dans Camino
    4 si l'étape existe dans Camino
  //

const demarcheNomTsv = etapeNomTsv
  .split('-')
  .splice(0, etapeNomTsv.split('-').length - 1)
  .join('-')
const titreNomTsv = demarcheNomTsv
  .split('-')
  .splice(0, demarcheNomTsv.split('-').length - 1)
  .join('-')

let existenceValue = 0
const titreExisteCheck = graphQlRequeteTitre.some(titreCamino => {
  if (!similarString(titreCamino.id, titreNomTsv)) return false

  const demarcheExisteCheck = titreCamino.demarches.some(demarcheCamino => {
    if (!similarString(demarcheCamino.id, demarcheNomTsv)) return false

    const etapeExisteCheck = demarcheCamino.etapes.some(etapeCamino => {
      if (!similarString(etapeCamino.id, etapeNomTsv)) return false

      existenceValue = 4
      return true
    })
    if (!etapeExisteCheck) existenceValue = 3
    return true
  })
  if (!demarcheExisteCheck) existenceValue = 2
  return true
})
if (!titreExisteCheck) existenceValue = 1
return existenceValue
}
*/

const json2csv = require('json2csv').parse
const fs = require('fs')

const tsvVerif = (data, graphQlRequeteTitre) => {
  // tsv-nom,camino-titre,camino-demarche,camino-etape
  const tsvCaminoExistences = Object.keys(data).map(etapeNomTsv => {
    const demarcheNomTsv = etapeNomTsv
      .split('-')
      .slice(0, -1)
      .join('-')
    const titreNomTsv = demarcheNomTsv
      .split('-')
      .slice(0, -1)
      .join('-')

    const tsvCaminoExistence = {
      tsv: etapeNomTsv,
      titre: '',
      demarche: '',
      etape: ''
    }
    graphQlRequeteTitre.some(titreCamino => {
      if (!similarString(titreCamino.id, titreNomTsv)) return false

      tsvCaminoExistence.titre = titreCamino.id
      titreCamino.demarches.some(demarcheCamino => {
        if (!similarString(demarcheCamino.id, demarcheNomTsv)) return false

        tsvCaminoExistence.demarche = demarcheCamino.id
        demarcheCamino.etapes.some(etapeCamino => {
          if (!similarString(etapeCamino.id, etapeNomTsv)) return false

          tsvCaminoExistence.etape = etapeCamino.id
          return true
        })
        return true
      })
      return true
    })

    return tsvCaminoExistence
  })
  return json2csv(tsvCaminoExistences)
}

const titreCorrespondance = async (data, graphQlRequeteTitre) =>
  tsvVerif(data, graphQlRequeteTitre)

const ignoreAdjectif = titreString => {
  const titreTable = titreString.split('-')
  if (titreTable[2].length <= 3) titreTable.splice(2, 1)
  return titreTable.join('-')
}

const ignoreDate = titreString => {
  const titreTable = titreString.split('-')
  const filterTable = (titre, index) =>
    titre.filter(elem => elem != titre[titre.length - index]).join('-')

  return !isNaN(titreTable[titreTable.length - 1])
    ? filterTable(titreTable, 1)
    : !isNaN(titreTable[titreTable.length - 2])
    ? filterTable(titreTable, 2)
    : filterTable(titreTable, 3)
}

const ignoreAccent = titreString =>
  titreString.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const ignoreSpace = titreString => titreString.replace(/ /g, '')

const similarString = (titreCaminoString, titreTsvString, toIgnore) => {
  if (toIgnore && toIgnore.length === 0) {
    return titreCaminoString === titreTsvString
  }

  if (!toIgnore) {
    toIgnore = [ignoreSpace, ignoreAccent, ignoreDate, ignoreAdjectif]
  }

  let titreCamino = titreCaminoString
  let titreTsv = titreTsvString
  return toIgnore.some(
    ignoreFunction => ignoreFunction(titreCamino) === titreTsv
  )
}

module.exports = titreCorrespondance
