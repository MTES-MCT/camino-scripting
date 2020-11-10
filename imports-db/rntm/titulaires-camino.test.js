const { titulaireCaminoGet } = require('./titulaires-camino')
const each = require('jest-each').default

describe('teste la gestion des titulaires', () => {
  each([
    ['État', 'Etat'],
    ['État (test)', 'Etat'],
    ['BRGM', 'Bureau de Recherches Géologiques et Minières'],
    ['EDF','ELECTRICITE DE FRANCE (EDF)'],
    ['ELECTRICITE DE FRANCE','ELECTRICITE DE FRANCE (EDF)'],
    ['DRAGAGE TRANSPORTS ET TRAVAUX MARITIMES','DRAGAGE TRANSPORTS ET TRAVAUX MARITIMES (DTM)'],
    ['RECYLEX','RECYLEX SA'],
    ]).test('récupère correctement les titulaires de %s', (input, output) =>
    expect(titulaireCaminoGet(input)).toEqual(output)
  )
})
