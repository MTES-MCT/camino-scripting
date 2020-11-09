const titulairesGet = (titulaires, reportRow) => {
  if (titulaires === '') return ['']

  if (!titulaires) return []

  //   Toutes les exceptions gérées à la main
  if (titulaires === '11/08/1906') return []
  if (titulaires === 'Sieurs Castillon de St Victor et Thomas')
    return ['M. Castillon de St Victor et Thomas']
  if (titulaires === 'M. Radu, Dambacher Berg und Hüttenverein')
    return ['M. Radu', 'M. Dambacher', 'M. Berg', 'M. Hüttenverein']
  if (titulaires === 'MM. Léon et Etienne Darasse / État')
    return ['MM. Léon et Etienne Darasse', 'Etat']
  if (titulaires === 'M Abadie et M.Ayoub / Etat')
    return ['M. Abadie', 'M. Ayoub', 'Etat']
  if (titulaires === 'Charbonnages de Fra,ce (ex H.B.C.M.)')
    return ['Charbonnages de France (ex H.B.C.M.)']
  if (titulaires === 'Société Minière des Schistes Bitumineux dAutun')
    return ["Société Minière des Schistes Bitumineux d'Autun"]
  if (titulaires === 'Sté  de La Petite Faye') return ['Sté La Petite Faye']
  if (titulaires === 'Sté des Mines du Bourneix')
    return ['Sté des mines du Bourneix']

  // adapte le - séparateur
  if (titulaires === 'Commerner Bergwerk- und Hütten Aktien Verein') {
    titulaires = 'Commerner Bergwerk - Hütten Aktien Verein'
  }
  if (titulaires === '- REPLOR + SPI (op)') {
    titulaires = 'REPLOR + SPI (op)'
  }
  titulaires = titulaires.replace(/\S(-\s)/, ' $1')

  const titulaire_tiret_separation = [
    'HÉRITIERS VEYRAT-CONCESSION "ORPHELINE" SANS',
  ]

  if (titulaire_tiret_separation.includes(titulaires)) {
    titulaires = titulaires.replace('-', ' - ')
  }

  // ajoute un espace derrière la virgule s'il est manquant
  titulaires = titulaires.replace(/(,)(\S)/, '$1 $2')

  // retire les ',' à la fin
  titulaires = titulaires.replace(/,$/, '')

  // retire les ';' à la fin
  titulaires = titulaires.replace(/;$/, '')

  // remplace 'S. A.' par 'S.A.'
  titulaires = titulaires.replace('S. A.', 'S.A.')

  // retire les ')' orphelines
  if (titulaires.match(/\)/) && !titulaires.match(/\(.*\)/)) {
    titulaires = titulaires.replace(/\)/, '')
  }

  // remplace les 'ß' (allemand) par 'ss'
  titulaires = titulaires.replace(/ß/, 'ss')

  // retire le . final s'il ne s'agit pas d'un acronyme (B.R.G.M.) ou d'une initiale (Munier A.)
  if (
    !titulaires.match(/\.[A-Z]{1}\.$/) &&
    !titulaires.match(/\s[A-Z]{1}\.$/)
  ) {
    titulaires = titulaires.replace(/\.$/, '')
  }

  // retire le(s) ? final(aux) et les éventuels espaces devant
  titulaires = titulaires.replace(/(\s*\?+)$/, '')

  // gère où il y a 'etat'
  titulaires = titulaires
    .replace(/\s[eé]tat\s/i, ' Etat ')
    .replace("Propriété de l'Etat", 'Etat')

    .replace(/^l'[ée]tat$/i, 'Etat')

  if (titulaires.match(/\s[eé]tat$/i) || titulaires.match(/^[eé]tat$/i)) {
    titulaires = titulaires.slice(0, -4) + 'Etat'
  }

  let result

  if (
    titulaires.match(/^MM\.\s/i) ||
    titulaires.match(/^Sieurs?\s/i) ||
    titulaires.match(/^Mrs?\s/i)
  ) {
    result = [
      ...titulaires
        .substring(titulaires.indexOf(' '))
        .split(',')
        .flatMap((t) => t.split(/\set\s/i))
        .map((t) => t.trim())
        .filter((t) => t !== '')
        .map((t) => 'M. ' + t),
    ]
  } else if (titulaires.match(/^Mmes\s/i)) {
    result = [
      ...titulaires
        .substring(titulaires.indexOf(' '))
        .split(',')
        .flatMap((t) => t.split(/\set\s/i))
        .map((t) => t.trim())
        .filter((t) => t !== '')
        .map((t) => 'Mme ' + t),
    ]
  } else {
    result = titulaires
      .split(/\//)
      .flatMap((t) => t.split(/\s-\s/))
      .flatMap((t) => t.split(/\sund\s/))
      .map((t) => t.trim())
  }

  // retire tout ce qui ressemble à 'orphelin'
  result = result.filter((r) => !r.match(/orphelin/i))

  // ajoute un . derrière le 'M' s'il est manquant
  result = result.map((r) =>
    r.match(/^M\s/) ? 'M.' + titulaires.substring(1) : r
  )

  // ajoute un espace derrière 'M.' s'il est manquant
  result = result.map((r) => r.replace(/^(M\.)(\S)/, '$1 $2'))

  //   result.filter((r) => r.match(/,/)).forEach((r) => console.log(r))
  //   result.filter((r) => r.match(/-/)).forEach((r) => console.log(r))

  ///////////// Vérif lorsqu'aucun traitement
  if (result.length === 1 && result[0] === titulaires) {
    const titulaires_OK = [
      'Etat',
      'M. Vogt',
      'M. Finkler',
      'M. Herzinger',
      'M. Münster',
      'M. Schaal',
      'Gewerkschaft Petrolea',
      'Münstersche Gewerkschaft',
      'St-Kreuzer Erzgruben',
      'Bergheim & Mac Garvey',
      'Aluminium Pechiney',
      'Deutsche Tiefbohr AG',
      'S.A. des mines de Faymoreau',
      'Société Minière des Schistes Bitumineux dAutun',
      'Sté  de La Petite Faye',
      'Sté la Petite Faye',
      'S.A. des Mines de Faymoreau',
      'Sté des Mines du Bourneix',
      'Sté des mines du Bourneix',
      'S.A. de la Rochetréjoux',
      "Société Nouvelle des Mines de Soufre d'Apt et de Biabaux Réunies",
      'COMPAGNIE DES MINES DE MAURIENNE',
      'COMPAGNIE DES MINES DE MAURIENNE (LIQUIDATEUR : M. L.A. BOEHLER)',
      'SOCIÉTÉ DES MINES DE LA MAURIENNE',
      'Charbonnages de France',
    ]

    if (!titulaires.match(/\s/) && !titulaires_OK.includes(titulaires)) {
      console.log('titulaires :>> ', titulaires)
    }
  }

  return result
  /////////////

  return result
}

module.exports = { titulairesGet }
