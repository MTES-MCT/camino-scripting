const { titulairesGet } = require('./titulaires')
const each = require('jest-each').default

describe('teste la gestion des titulaires', () => {
  each([
    ['BRGM', ['Bureau de Recherches Géologiques et Minières']],
    ['B.R.G.M.', ['Bureau de Recherches Géologiques et Minières']],
    ['E.D.F.', ['ELECTRICITE DE FRANCE (EDF)']],
    ['E.D.F', ['ELECTRICITE DE FRANCE (EDF)']],
    ['EDF', ['ELECTRICITE DE FRANCE (EDF)']],
    ['ELECTRICITE DE FRANCE', ['ELECTRICITE DE FRANCE (EDF)']],
    ]).test('récupère correctement les titulaires de %s', (input, output) =>
    expect(titulairesGet(input)).toEqual(output)
  )
})
