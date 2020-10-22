const {toLowerCase} = require("./_utils");
const substances = require('../sources/json/substances-rntm-camino.json')

const substancesLookup = val =>
    (val || '')
        .replace(/, /g, ',')
        .split(/[,;]/)
        .reduce((acc, cur) => {
            cur = toLowerCase(cur).trim()

            if (!cur) return acc

            const sub = substances.find(s => s.alias === cur)

            if (!sub) {
                console.error(`Erreur: substance ${cur} non identifée`)
                throw new Error('substance')
            }

            if (cur && sub) {
                acc.push(sub)
            }

            return acc
        }, [])

module.exports = substancesLookup
