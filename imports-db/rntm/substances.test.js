const {substancesLookup, substancesPrincipalesGet} = require("./substances");
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
        expect(substancesLookup({sub: "or"}, 'sub')).toContainEqual(substanceByAliasGet("or"));
    })

    test('parse correctement les substances séparées par des virgules', () => {
        expect(substancesLookup({sub: "or,argent, cuivre"}, 'sub')).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("cuivre")]);
    })

    test('parse correctement les substances séparées par des points virgules', () => {
        expect(substancesLookup({sub:"or; argent;cuivre"}, 'sub')).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("cuivre")]);
    })

    test('parse correctement les substances avec des espaces', () => {
        expect(substancesLookup({sub:"or; argent, substances connexes"}, 'sub')).toEqual([substanceByAliasGet("or"), substanceByAliasGet("argent"), substanceByAliasGet("substances connexes")]);
    })

    test('la substances "18" est ignorée', () => {
        expect(substancesLookup({sub:"or; 18"}, 'sub')).toEqual([substanceByAliasGet("or")]);
    })

    test('si plusieurs substances alors le bitume n’est pas une substance principale', () => {
        const props = {
            "Substances_principales_concessibles": "Bitumes",
            "Substances_produites": "Bitumes",
            "Autres_substances": "Bitumes ; Hydrocarbures liquides"
        }
        expect(substancesPrincipalesGet(props)).toEqual([substanceByAliasGet('hydrocarbures liquides')])
    })

})
