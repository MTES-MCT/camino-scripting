const { titulaireCaminoGet } = require('./titulaires-camino')
const each = require('jest-each').default

describe('teste la gestion des titulaires', () => {
  each([
    ['État', 'Etat'],
    ['BRGM', 'Bureau de Recherches Géologiques et Minières'],
    ['B.R.G.M.', 'Bureau de Recherches Géologiques et Minières'],
    ['E.D.F.','ELECTRICITE DE FRANCE (EDF)'],
    ['E.D.F','ELECTRICITE DE FRANCE (EDF)'],
    ['EDF','ELECTRICITE DE FRANCE (EDF)'],
    ['ELECTRICITE DE FRANCE','ELECTRICITE DE FRANCE (EDF)']
    ]).test('récupère correctement les titulaires de %s', (input, output) =>
    expect(titulaireCaminoGet(input)).toEqual(output)
  )
})
