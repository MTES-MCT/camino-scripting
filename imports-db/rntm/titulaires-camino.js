const entreprisesCamino = require('../sources/json/entreprises-camino.json')
const slugify = require('@sindresorhus/slugify')

const entreprisesCaminoSlugIndex = entreprisesCamino.reduce((acc, e) => {
  const slug = slugify(e.nom)
  acc[slug] = e.nom
  return acc
}, {})

const entreprisesCaminoSlugFullIndex = entreprisesCamino
  .filter((e) => e.nom.match(/\(*\)/))
  .reduce((acc, e) => {
    const slug = slugify(e.nom.substring(0, e.nom.indexOf('(')).trim())
    acc[slug] = e.nom
    return acc
  }, {})

const titulairesCaminoGet = (titulaires, reportRow) => {
  return titulaires.map((t) => titulaireCaminoGet(t, reportRow))
}

const entreprisesNew = []
const titulaireCaminoGet = (titulaire, reportRow) => {
  //tente de trouver le même slug
  let slug = slugify(titulaire)
  if (['mydas', 'solamines', 'solvay-carbonate-france'].includes(slug)) {
    throw new Error(`Utilisation du doublon ${slug}`)
  }
  if (entreprisesCaminoSlugIndex[slug]) {
    return entreprisesCaminoSlugIndex[slug]
  }

  //rien trouver on retourne le titulaire rntm
  entreprisesCaminoSlugIndex[slugify(titulaire)] = titulaire
  entreprisesNew.push(titulaire)
  return titulaire
}

const logResult = () => {
  console.log('Nb entreprises crées:', entreprisesNew.length)

  entreprisesNew.sort()
  // .forEach(e => console.log(e))
}

module.exports = { titulairesCaminoGet, titulaireCaminoGet, logResult }
