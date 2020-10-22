const substancesLookup = require("./substances");
const substances = require('../sources/json/substances-rntm-camino.json')
const each = require('jest-each').default

const substanceByAliasGet = (alias) => substances.find(s => s.alias === alias)

describe("teste la gestion des substances", () => {

    test('vérifie que le fichier source des substances n’a pas d’alias en double', () => {
        const aliases = substances.map(s => s.alias)
        expect(aliases).toHaveLength([...new Set(aliases)].length)
    })

    each(substances).test("la substance %s est complète", (s) => {
        expect(s.id).toHaveLength(4)
        expect(s.alias.length).toBeGreaterThan(0)
        expect(s.domaine).toHaveLength(1)
    })


    test('parse correctement les substances', () => {
        expect(substancesLookup("or")).toContainEqual(substanceByAliasGet("or"));
    })

    test('parse correctement les substances séparées par des virgules', () => {
        expect(substancesLookup("or,argent, cuivre")).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("cuivre")]);
    })

    test('parse correctement les substances séparées par des points virgules', () => {
        expect(substancesLookup("or; argent;cuivre")).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("cuivre")]);
    })

    test('parse correctement les substances avec des espaces', () => {
        expect(substancesLookup("or; argent, substances connexes")).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("substances connexes")]);
    })

})
