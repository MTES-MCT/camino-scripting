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

const tsvVerif = (data, graphQlRequeteTitre) => {
  return Object.keys(data).reduce((logCorrespondance, tsvElemEtape) => {
    const tsvElemDemarche = tsvElemEtape
      .split('-')
      .splice(0, tsvElemEtape.split('-').length - 1)
      .join('-')
    const tsvElemTitre = tsvElemDemarche
      .split('-')
      .splice(0, tsvElemDemarche.split('-').length - 1)
      .join('-')

    const titreExisteCheck = graphQlRequeteTitre.some(caminoTitre => {
      if (similarString(caminoTitre.id, tsvElemTitre)) {
        const demarcheExisteCheck = caminoTitre.demarches.some(
          caminoDemarche => {
            if (similarString(caminoDemarche.id, tsvElemDemarche)) {
              const etapeExisteCheck = caminoDemarche.etapes.some(
                caminoEtape => {
                  if (similarString(caminoEtape.id, tsvElemEtape)) {
                    logCorrespondance = [
                      ...logCorrespondance,
                      [tsvElemEtape, 'cette Etape existe dans Camino']
                    ]
                    return true
                  }
                }
              )
              if (!etapeExisteCheck) {
                logCorrespondance = [
                  ...logCorrespondance,
                  [
                    tsvElemEtape,
                    'pas de correspondance dans les Etapes de Camino'
                  ]
                ]
              }
              return true
            }
          }
        )
        if (!demarcheExisteCheck) {
          logCorrespondance = [
            ...logCorrespondance,
            [
              tsvElemDemarche,
              'pas de correspondance dans les Demarches de Camino'
            ]
          ]
        }
        return true
      }
    })

    if (!titreExisteCheck) {
      logCorrespondance = [
        ...logCorrespondance,
        [tsvElemTitre, 'pas de correspondance dans les Titres de Camino']
      ]
    }
    return logCorrespondance
  }, [])
}

const titreCorrespondance = async (data, graphQlRequeteTitre) => {
  return tsvVerif(data, graphQlRequeteTitre)
}

module.exports = titreCorrespondance
