const domaineGet = require("./domaine");
const substances = require('../sources/json/substances-rntm-camino.json')
const substanceByAliasGet = (alias) => substances.find(s => s.alias === alias)



describe("teste la définition du domaine du titre", () => {

    test('si pas de substance le domaine est alors inconnu', () => {
        expect(domaineGet([])).toEqual('i')
        expect(domaineGet(undefined)).toEqual('i')
    })

    test('si une seule substance, alors le domaine est celui de la substance', () => {
        expect(domaineGet([{domaine: 'm'}])).toEqual('m')
    })

    test('si plusieurs substances du même domaine, alors le domaine est celui des substances', () => {
        expect(domaineGet([{domaine: 'm'}, {domaine: 'm'}])).toEqual('m')
    })

    test('si plusieurs substances de différents domaines, alors le domaine est inconnu', () => {
        expect(() => domaineGet([{domaine: 'm'}, {domaine: 'd'}], 'toto')).toThrow()
    })

})
