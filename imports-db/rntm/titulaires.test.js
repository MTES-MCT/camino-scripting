const { titulairesGet } = require('./titulaires')
const each = require('jest-each').default

describe('teste la gestion des titulaires', () => {
  each([
    [null, []],
    ['11/08/1906', []],
    ['', []],
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
    ['Sté Pénaroya)', ['Société Pénaroya']],
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
    ['S.A. St-Gobain - Chauny - Cirey', ['SA St-Gobain, Chauny et Cirey']],
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
    [
      'Socité des Charbonnages et Electricité du Sud-est',
      ['Société des Charbonnages et Electricité du Sud-est'],
    ],
    ['LÉTAT', ['Etat']],
    ['Etat français', ['Etat']],
    ['LÉTAT', ['Etat']],
    ['E.D.F. ALPES', ['EDF ALPES']],
    ['Sté de Rumigny', ['Société de Rumigny']],
    ['Sté de Rumigny', ['Société de Rumigny']],
    ['Ste de Rumigny', ['Société de Rumigny']],
    ['Eploitation', ['Exploitation']],
    ['Société Anonymé', ['SA']],
    ['Société Anonyme', ['SA']],
    ['S.A.', ['SA']],
    ['S.A', ['SA']],
    ['S A', ['SA']],
    ['SOC toto', ['Société toto']],
    ['SOC. Anonyme toto', ['SA toto']],
    ['S.A.des Baux.', ['SA des Baux']],
    ['MR. toto', ['M. toto']],
    ['Monsieur toto', ['M. toto']],
    ['Madame toto', ['Mme toto']],
    ['MONSIEUR ET MADAME DE LA MOUSSAYE', ['M. ET Mme DE LA MOUSSAYE']],
    [
      'MM.Xavier et  Charles Lamotte\n' +
        'Louis, Pierre et Robert Gorand,\n' +
        'A. Devaux, M. le CdT Le Bicqué,\n' +
        'Mme Fo',
      [
        'MM. Xavier et  harles Lamotte',
        'MM. Louis, Pierre et Robert Gorand',
        'M. A. Devaux',
        'M. le CdT Le Bicqué',
        'Mme Fo',
      ],
    ],
    ['MM.TIQUET et PERGAUD', ['M. TIQUET', 'M. PERGAUD']],
    ['MM Gérard et Prestat', ['M. Gérard', 'M. Prestat']],
    ['COMINCO France SA', ['SA COMINCO']],
    ['COMINCO France S.A.', ['SA COMINCO']],
    ['COMINCO France S.A.', ['SA COMINCO']],
    ['CIE MINIERE DE ST VINCENT', ['Compagnie MINIERE DE ST VINCENT']],
    ['Cie MINIERE DE ST VINCENT', ['Compagnie MINIERE DE ST VINCENT']],
    ['BRGM + Vieille Montagne', ['BRGM', 'Vieille montagne']],
    ['BRGM et Vieille Montagne', ['BRGM', 'Vieille montagne']],
    [
      'Aluminium Pechiney et Union des Bauxites',
      ['Aluminium Pechiney', 'Union des Bauxites'],
    ],
    [
      'Aluminium Pechiney + Union des Bauxites',
      ['Aluminium Pechiney', 'Union des Bauxites'],
    ],
    ['SA Union Minière France', ['SA Union Minière France']],
    ['Méridionnale', ['Méridionale']],
    ['Charbonnage de France', ['Charbonnages de France']],
    ['BRGGM', ['BRGM']],
    ['B.R.G.M.', ['BRGM']],
    ['B.R.G.M', ['BRGM']],
    ['COGEMA-HEXAMINES', ['COGEMA', 'HEXAMINES']],
    ["Centre d'etude set de recherches", ["Centre d'etudes et de recherches"]],
    [
      'COMPAGNIE GENERALE DESASPHALTES DE FRANCE',
      ['COMPAGNIE GENERALE DES ASPHALTES DE FRANCE'],
    ],
    [
      'Propriétaires: M. Etienne et M. Liberier et Melle Liberier',
      ['M. Etienne', 'M. Liberier', 'Melle Liberier'],
    ],
    ['SARL Burguière-Verdeille', ['SARL Burguière-Verdeille']],
    [
      'Société Générale des Recherches et Exploitations Minières',
      ["SOGEREM (Société Générale de Recherches et d'Exploitation Minière)"],
    ],
    [
      "Société Générale de Recherches et d'Exploitations Minières",
      ["SOGEREM (Société Générale de Recherches et d'Exploitation Minière)"],
    ],
    ['ALUMINIUM PECHINEY', ['Aluminium Pechiney']],
    ['Société nouvelles', ['Société nouvelle']],
    ['Sté La Petite Faye', ['Société La Petite Faye']],
    [
      'Société des Mines de fonderie de Zn',
      ['Société des Mines de fonderie de Zinc'],
    ],
    [
      'Société des Mines de fonderie de Zn',
      ['Société des Mines de fonderie de Zinc'],
    ],
    ['La vieille montagne', ['vieille montagne']],
    ['vieille-montagne', ['vieille montagne']],
    ["de l'ariège", ["d'ariège"]],

    [
      'Société Commentry-Fourchambault-Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'SA de Commentry, Fourchambault et Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'SA de Commentry-Fourcambault-Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'SA de Commentry-Fourchambault-Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'Société de Commentry-Fourcambault et Decazeville en 1931',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'Société de Commentry-Fourchambault et Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'Commentry-Fourchambeault-Decazeville',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],
    [
      'COMMENTRY-FOURCHAMBAULT-DECAZEVILLE',
      ['SA de Commentry-Fourchambault-Decazeville'],
    ],

    [
      'COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS, ETABLISSEMENT PRENAT',
      ['COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS'],
    ],
    [
      'COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS, ETABLISSEMENTS PRENA',
      ['COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS'],
    ],
    [
      'COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DES GIVORS, ETABLISSEMENT PRENAT',
      ['COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS'],
    ],
    [
      'Compagnie HAUTS FOURNEAUX ET FONDERIE DE GIVORS',
      ['COMPAGNIE DES HAUTS FOURNEAUX ET FONDERIES DE GIVORS'],
    ],

    [
      'Compagnie des Produits Chimiques et Electro-metallurgique Alais-Froges et Camargue',
      [
        'Compagnie des Produits Chimiques et Electrométallurgiques Alais, Froges et Camargue',
      ],
    ],
    [
      'Compagnie des Produits Chimiques et Electrométallurgiques Alais, Froges et Camargues',
      [
        'Compagnie des Produits Chimiques et Electrométallurgiques Alais, Froges et Camargue',
      ],
    ],

    ['ventes', ['vente']],
    ['PENARROYA-BRGM', ['PENARROYA', 'BRGM']],
    ['Pennaroya', ['PENARROYA']],
  ]).test('récupère correctement les titulaires de %s', (input, output) =>
    expect(titulairesGet(input)).toEqual(output)
  )
})
