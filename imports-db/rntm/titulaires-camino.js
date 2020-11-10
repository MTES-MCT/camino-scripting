const entreprisesCamino = require('../sources/json/entreprises-camino.json')
const entreprisesAlias = require('../sources/json/entreprises-alias.json')
const slugify = require('@sindresorhus/slugify')

const entreprisesCaminoSlugIndex = entreprisesCamino.reduce((acc, e) => {
  const slug = slugify(e.nom)
  acc[slug] = e.nom
  return acc;
}, {})

const entreprisesCaminoSlugFullIndex = entreprisesCamino
    .filter(e => e.nom.match(/\(*\)/))
    .reduce((acc, e) => {
      const slug = slugify(e.nom.substring(0, e.nom.indexOf('(')).trim())
      acc[slug] = e.nom
      return acc;
}, {})

const titulairesCaminoGet = (titulaires, reportRow) => {
  return  titulaires.map(t => titulaireCaminoGet(t, reportRow))
}

const entreprisesNew = []
const titulaireCaminoGet = (titulaire, reportRow) => {

  let result = titulaire
  //tente de trouver le même slug
  let slug = slugify(titulaire)
  if (['mydas', 'solamines', 'solvay-carbonate-france'].includes(slug)) {
    throw new Error(`Utilisation du doublon ${slug}`)
  }
  if (entreprisesAlias[slug]) {
    result = entreprisesAlias[slug]
  }else if (entreprisesCaminoSlugIndex[slug]) {
    result = entreprisesCaminoSlugIndex[slug];
  }else if (entreprisesCaminoSlugFullIndex[slug]) {
    result = entreprisesCaminoSlugFullIndex[slug];
  }else if(titulaire.match(/\(*\)/) ){
    //tente de faire le slug mais sans les parenthèses
    let tmp = titulaire.substring(0, titulaire.indexOf('(')).trim();
    tmp = slugify(tmp);
    if (entreprisesCaminoSlugIndex[tmp]) {
      result = entreprisesCaminoSlugIndex[tmp]
    }else if (entreprisesCaminoSlugFullIndex[tmp]) {
      result = entreprisesCaminoSlugFullIndex[tmp]
    }
  }

  //rien trouver on retourne le titulaire rntm
  entreprisesCaminoSlugIndex[slugify(titulaire)] = result
  if (result.match(/\(*\)/)) {
    entreprisesCaminoSlugFullIndex[slugify(result.substring(0, result.indexOf('(')).trim())] = result
  }
  if (!entreprisesNew.includes(result) && !entreprisesCamino.map(e => e.nom).includes(result) ) {
    entreprisesNew.push(result);
  }
  return result
}

const logResult = () => {

  [...new Set(Object.values(entreprisesCaminoSlugIndex))]
      .sort()
      .forEach(e => {
        if (entreprisesNew.includes(e)) {
          console.log(e);
        }else {
          console.log("-", e)
        }
      })
  console.log("Nb entreprises crées:", entreprisesNew.length)
}


module.exports = { titulairesCaminoGet, titulaireCaminoGet, logResult }
