const { titulairesGet } = require('./titulaires')
const each = require('jest-each').default

describe('teste la gestion des titulaires', () => {
  each([
    [null, []],
    ['11/08/1906', []],
    ['', ['']],
    ['toto', ['toto']],
    ['etat', ['Etat']],
    ['état', ['Etat']],
    ['ETAT', ['Etat']],
    ['État', ['Etat']],
    ["L'ÉTAT", ['Etat']],
    ["L'ETAT", ['Etat']],
    ["l'Etat", ['Etat']],
    ['petat', ['petat']],
    ["Propriété de l'Etat", ['Etat']],
    [
      'Mme Marcorelles de Corneillan / Etat',
      ['Mme Marcorelles de Corneillan', 'Etat'],
    ],
    [
      'Mme Marcorelles de Corneillan / État',
      ['Mme Marcorelles de Corneillan', 'Etat'],
    ],
    [
      'Mme Marcorelles de Corneillan/ Etat',
      ['Mme Marcorelles de Corneillan', 'Etat'],
    ],
    ['M Abadie et M.Ayoub / Etat', ['M. Abadie', 'M. Ayoub', 'Etat']], // exeption
    [
      'MM. Léon et Etienne Darasse / État',
      ['MM. Léon et Etienne Darasse', 'Etat'],
    ],
    [
      'Société Minière et Métallurgiques de Penarroya / Métaleurop',
      ['Société Minière et Métallurgiques de Penarroya', 'Métaleurop'],
    ],
    ['État-unis', ['État-unis']],

    ['MM. tototettotot et tutu', ['M. tototettotot', 'M. tutu']],
    ['MM. Abelanet, Barthès et Mas', ['M. Abelanet', 'M. Barthès', 'M. Mas']],
    [
      "Cie des Salins du Midi et des Salines de l'Est",
      ["Cie des Salins du Midi et des Salines de l'Est"],
    ],
    [
      'Mrs Pradal, Granier, Villebrun et Peyras',
      ['M. Pradal', 'M. Granier', 'M. Villebrun', 'M. Peyras'],
    ],
    ['Sieurs Fourcade J. et Munier A.', ['M. Fourcade J.', 'M. Munier A.']],
    [
      'Sieurs Castillon de St Victor et Thomas',
      ['M. Castillon de St Victor et Thomas'],
    ], //Exception, les autres on split le ET
    [
      'M. Radu, Dambacher Berg und Hüttenverein',
      ['M. Radu', 'M. Dambacher', 'M. Berg', 'M. Hüttenverein'],
    ], //Exception, les autres on split le ET
    ['Sieur P. Beauviel', ['M. P. Beauviel']],
    [
      'Aluminium Pechiney/ SABAP/ AluminiumAlcan',
      ['Aluminium Pechiney', 'SABAP', 'AluminiumAlcan'],
    ],
    ['BRGM/GUILLIAMS', ['BRGM', 'GUILLIAMS']],
    ['HÉRITIERS ROUX/ concession orpheline', ['HÉRITIERS ROUX']],
    ['HÉRITIERS ROUX/Orpheline', ['HÉRITIERS ROUX']],
    ['M Sarg', ['M. Sarg']],
    ['Mr Armingaud', ['M. Armingaud']],
    ['M. Stehelin,', ['M. Stehelin']],
    ['Mr Blanc ?,', ['M. Blanc']],
    ['Exalor Inc;', ['Exalor Inc']],
    ['Sté Pénaroya)', ['Sté Pénaroya']],
    ['MM. ROHMER ET MICOLON ??', ['M. ROHMER', 'M. MICOLON']],
    ['M. ANTOINE CHARPIN.', ['M. ANTOINE CHARPIN']],
    [
      'M. GUYON,Maître de forge à Foucherans .',
      ['M. GUYON, Maître de forge à Foucherans'],
    ],
    [
      'Mr Brugairolles, Floutier et Toulouze',
      ['M. Brugairolles', 'M. Floutier', 'M. Toulouze'],
    ], //C’est une exeption, les autres sont ok
    ['HÉRITIERS VEYRAT-CONCESSION "ORPHELINE" SANS', ['HÉRITIERS VEYRAT']], //Exeption
    [
      'Charbonnages de Fra,ce (ex H.B.C.M.)',
      ['Charbonnages de France (ex H.B.C.M.)'],
    ], //Exeption
    [
      'Société Minière des Schistes Bitumineux dAutun',
      ["Société Minière des Schistes Bitumineux d'Autun"],
    ], //Exeption
    ['S.A. St-Gobain - Chauny - Cirey', ['S.A. St-Gobain', 'Chauny', 'Cirey']],
    [
      'Mmes Maffioly, Adamzyk, Cerri',
      ['Mme Maffioly', 'Mme Adamzyk', 'Mme Cerri'],
    ],
    [
      'Commerner Bergwerk- und Hütten Aktien Verein',
      ['Commerner Bergwerk', 'Hütten Aktien Verein'],
    ], //Exeption
    ['Sté  de La Petite Faye', ['Sté La Petite Faye']], //Exeption
    ['Sté des Mines du Bourneix', ['Sté des mines du Bourneix']], //Exeption
    /////////////////////////// gérer les +
    ['- REPLOR + SPI (op)', ['REPLOR + SPI (op)']], //Exeption
  ]).test('récupère correctement les titulaires de %s', (input, output) =>
    expect(titulairesGet(input)).toEqual(output)
  )
})
