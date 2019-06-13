const json2csv = require('json2csv').parse

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

function epsgPointCheck(coord1, coord2) {
  var R = 6371 // Radius of the earth in km
  var dLat = deg2rad(coord2.x - coord1.x) // deg2rad below
  var dLon = deg2rad(coord2.y - coord1.y)
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.x)) *
      Math.cos(deg2rad(coord2.x)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c // Distance in km
  return d < 10
}

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

const titreCorrespondance = (
  etapeNomTsv,
  graphQlRequeteTitre,
  pointsTsv,
  pointsReferencesTsv
) => {
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
    etape: '',
    pointsWgs84: [],
    validiteWgs84: [],
    pointsReference: []
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
        const pointsCamino = etapeCamino.points
        pointsTsv.forEach(pointTsv => {
          pointNomTsv = pointTsv.id
            .split('-')
            .slice(-3)
            .join('-')
          pointsCamino.some(pointCamino => {
            pointNomCamino = pointCamino.id
              .split('-')
              .slice(-3)
              .join('-')
            if (pointNomCamino !== pointNomTsv) return false

            tsvCaminoExistence.pointsWgs84.push(pointCamino.id)
            tsvCoord = {
              x: pointTsv.coordonnees.split(',')[0],
              y: pointTsv.coordonnees.split(',')[1]
            }
            epsgPointCheck(tsvCoord, pointCamino.coordonnees)
              ? tsvCaminoExistence.validiteWgs84.push(true)
              : tsvCaminoExistence.validiteWgs84.push(false)

            const pointsReferenceCamino = pointCamino.references
            pointsReferencesTsv.forEach(pointsEpsgTsv => {
              tsvCaminoExistence.pointsReference.push([])
              pointsEpsgTsv.forEach(pointEpsgTsv => {
                pointEpsgNomTsv = pointEpsgTsv.id
                  .split('-')
                  .slice(-4)
                  .join('-')
                pointsReferenceCamino.some(pointReferenceCamino => {
                  pointReferenceNomCamino = pointReferenceCamino.id
                    .split('-')
                    .slice(-4)
                    .join('-')
                  if (pointReferenceNomCamino !== pointEpsgNomTsv) return false

                  tsvCaminoExistence.pointsReference
                    .slice(-1)
                    .push(pointCamino.id)
                  tsvCoord = {
                    x: pointEpsgTsv.coordonnees.split(',')[0],
                    y: pointEpsgTsv.coordonnees.split(',')[1]
                  }

                  return true
                })

                return true
              })
            })
            return true
          })
          return true
        })
        return true
      })
    })
  })
  return tsvCaminoExistence
}

module.exports = titreCorrespondance
