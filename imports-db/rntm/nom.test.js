const {nomGet} = require("./nom");
const each = require('jest-each').default


describe("teste la gestion du nom du titre", () => {

    test('transforme le nom en lowerCase', () => {
        expect(nomGet('TOTO')).toEqual("Toto")
    })

    test('enlève les espaces avant et après', () => {
        expect(nomGet('  TOTO ')).toEqual("Toto")
    })

    test('supprime la mention de la substance entre parenthèses', () => {
        expect(nomGet('toto (houille)')).toEqual("Toto")
        expect(nomGet('toto (HOUILLE)')).toEqual("Toto")
    })

    test('supprime la mention du type de titre', () => {
        expect(nomGet('toto (pex)')).toEqual("Toto")
        expect(nomGet('toto (PEX)')).toEqual("Toto")
    })

    test('mettre les déterminants au début', () => {
        expect(nomGet('toto (le)')).toEqual("Le Toto")
        expect(nomGet('toto (l\')')).toEqual("L'Toto")
        expect(nomGet('toto (les)')).toEqual("Les Toto")
        expect(nomGet('toto (la)')).toEqual("La Toto")
        expect(nomGet('toto (l )')).toEqual("L'Toto")
    })

    test('enlève les "ou concession" à la fin du nom', () => {
        expect(nomGet('girodet ou concession')).toEqual("Girodet")
        expect(nomGet('grand-champ ou concess')).toEqual("Grand-Champ")
    })


    test('enlève les "(dite des)"', () => {
        expect(nomGet('girodet (dite de)')).toEqual("Girodet")
        expect(nomGet('grand-champ (dite du)')).toEqual("Grand-Champ")
        expect(nomGet('grand-champ (dite du) et toto (dite')).toEqual("Grand-Champ et Toto")
    })

    test('met que les noms propres avec une lettre capitale', () => {
        expect(nomGet('VAL D\'AJOL')).toEqual('Val d\'Ajol')
    })

    each([
        { input: "", output: ""},
        { input: "ROPPE", output: "Roppe"},
        { input: "TROUS DE MINES (LES)", output: "Les Trous de Mines"},
        { input: "CHÂTENOIS-LES-FORGES", output: "Châtenois-les-Forges"},
    ]).test("transforme correctement le titre", ({input, output}) => expect(nomGet(input)).toEqual(output))

})
