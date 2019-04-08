const ignoreAdjectif = titreString => {
  const titreTable = titreString.split('-')
  if (titreTable[2].length <= 3) titreTable.splice(2, 1)
  return titreTable.join('-')
}

const ignoreDate = titreString => {
  const titreTable = titreString.split('-')
  const filterTable = (titre, index) => {
    return titre
      .filter(elem => {
        return elem != titre[titre.length - index]
      })
      .join('-')
  }
  return !isNaN(titreTable[titreTable.length - 1])
    ? filterTable(titreTable, 1)
    : !isNaN(titreTable[titreTable.length - 2])
    ? filterTable(titreTable, 2)
    : filterTable(titreTable, 3)
}

const ignoreAccent = titreString => {
  return titreString.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const ignoreSpace = titreString => {
  return titreString.replace(/ /g, '')
}

const similarString = (titre1String, titre2String, toIgnore) => {
  if (!toIgnore) {
    toIgnore = [ignoreSpace, ignoreAccent, ignoreDate, ignoreAdjectif]
  } else if (toIgnore.length === 0) {
    return titre1String === titre2String
  }
  let titre1 = titre1String
  let titre2 = titre2String
  return toIgnore.some(ignoreFunction => {
    titre1 = ignoreFunction(titre1)
    return titre1 === titre2
  })
}

const tsvVerif = (data, requete) => {
  return Object.keys(data).reduce((logCorrespondance, tsvElemEtape) => {
    const tsvElemDemarche = tsvElemEtape
      .split('-')
      .splice(0, tsvElemEtape.split('-').length - 1)
      .join('-')
    const tsvElemTitre = tsvElemDemarche
      .split('-')
      .splice(0, tsvElemDemarche.split('-').length - 1)
      .join('-')
    if (
      !requete.some(caminoTitre => {
        if (similarString(caminoTitre.id, tsvElemTitre)) {
          if (
            !caminoTitre.demarches.some(caminoDemarche => {
              if (similarString(caminoDemarche.id, tsvElemDemarche)) {
                if (
                  !caminoDemarche.etapes.some(caminoEtape => {
                    if (similarString(caminoEtape.id, tsvElemEtape)) {
                      logCorrespondance = [
                        ...logCorrespondance,
                        [tsvElemEtape, 'cette Etape existe dans Camino']
                      ]
                      return true
                    }
                  })
                ) {
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
            })
          ) {
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
    ) {
      logCorrespondance = [
        ...logCorrespondance,
        [tsvElemTitre, 'pas de correspondance dans les Titres de Camino']
      ]
    }
    return logCorrespondance
  }, [])
}

const epsgImport = async (data, requete) => {
  return tsvVerif(data, requete)
}

module.exports = epsgImport
