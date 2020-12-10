const {toLowerCase} = require("./_utils");
const substances = require('../sources/json/substances-rntm-camino.json')
const {uniqBy} = require("./_utils");
const {substancesToString} = require("./_utils");

//Les substances qui peuvent appartenir à plusieurs domaines
const substancesMultipleDomaines = ['bitu', 'suco']

const substancesLookup = (props, substanceKey, reportRow) => {

    let val = props[substanceKey]
    let remarques = []

    //Corrections manuelles
    if (val === 'Or, argent antimoine, tungstène') {
        remarques.push('Manque une virgule')
        val = 'Or, argent, antimoine, tungstène'
    }

    const result = (val || '')
        .replace(/, /g, ',')
        .split(/[,;]/)
        .reduce((acc, cur) => {
            cur = toLowerCase(cur).trim()

            if (!cur) return acc

            const sub = substances.find(s => s.alias === cur)

            if (!sub) {
                remarques.push(`Substance "${cur}" inconnue, donc ignorée`)
                return acc
            }

            if (cur && sub) {
                acc.push(sub)
            }

            return acc
        }, [])

    if (reportRow) {
        reportRow[`Résultat ${substanceKey}`] = substancesToString(result)
        reportRow[`Remarques ${substanceKey}`] = remarques.join('. ')
    }

    return result
}


//On récupère seulement les substances du domaine des substances principales
const substancesAllGet = (props, domaineId, reportRow) => {

    const substancesPrincipales = substancesLookup(props, "Substances_principales_concessibles")
    const substancesProduites = substancesLookup(props, "Substances_produites")
    const substancesAutres = substancesLookup(props, "Autres_substances")

    const substancesAll = [
        ...new Set([
            ...substancesPrincipales,
            ...substancesProduites,
            ...substancesAutres
        ])
    ]

    const substancesDomaine = substancesAll.filter(s => s.domaine === domaineId || substancesMultipleDomaines.includes(s.id))
    let remarques = []

    if (substancesAll.length !== substancesDomaine.length) {
        remarques.push("Substances ignorées car mauvais domaine: " + substancesToString(substancesAll.filter(s => !substancesDomaine.includes(s))))
    }

    const substancesResult = uniqBy(substancesDomaine, "id")

    if (substancesResult.length !== substancesDomaine.length) {
        remarques.push("Substances ignorées car en double : " + substancesToString(substancesDomaine.filter(s => !substancesResult.includes(s))))
    }

    reportRow["Résultat Substances"] =  substancesToString(substancesResult)
    reportRow["Remarques Substances"] =  remarques.join(". ")

    return substancesResult;
}

const substancesPrincipalesGet = (props, reportRow) => {

    let substancesPrincipales = [
        ...new Set(substancesLookup(
        props, "Substances_principales_concessibles",
            reportRow
    ))]
    const substancesConnexes = [...new Set([...substancesLookup(props, "Substances_produites", reportRow), ...substancesLookup(props, "Autres_substances", reportRow)])]

    let result = substancesPrincipales
    let message = "Substance principale présente"

    if (!substancesPrincipales || substancesPrincipales.length === 0) {
        result = substancesConnexes
        message = 'Aucune substance principale'
    }

    //Si on a une seule substance principale, et qu’elle peut-être dans plusieurs domaines.
    //alors on utilise les substances connexes pour trouver le domaine
    if (substancesPrincipales && substancesPrincipales.length === 1 && substancesMultipleDomaines.includes(substancesPrincipales[0].id) && substancesConnexes && substancesConnexes.length) {
        const autresSubstances = substancesConnexes.filter(s => !substancesMultipleDomaines.includes(s.id))
        if (autresSubstances.length) {
            result = autresSubstances
            message = 'La substance principale peut faire partie de plusieurs domaines'
        }
    }

    if (reportRow) {
        reportRow["Résultat Substances concessibles"] = substancesToString(result);
        reportRow["Remarques Substances concessibles"] = message
    }

    return result
}

module.exports = {substancesLookup, substancesPrincipalesGet, substancesAllGet}
