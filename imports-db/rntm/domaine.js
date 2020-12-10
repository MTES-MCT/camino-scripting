const {substancesToString} = require("./_utils");

const domaineGet = (substances, rntmCode, reportRow) => {


    let domaineId
    let message = ""
    const domaineIds = [...new Set(substances ? substances.map(s => s.domaine) : [])];


    if( ['87TM0165', '70TM0042', '70TM0036'].includes(rntmCode) ){
        message = `Plusieurs domaines possibles ${substancesToString(substances)}. Choix manuel => m`
        domaineId = 'm'
    }else if( ['67TM0034', '67TM0001', '67TM0126'].includes(rntmCode) ){
        message = `Plusieurs domaines possibles ${substancesToString(substances)}. Choix manuel => f`
        domaineId = 'f'
    }else if (domaineIds.length === 0) {
        // Si pas de substance, on met de domaine "inconnu"
        message = "Aucune substance, domaine inconnu"
        domaineId = 'i'
    }else if( domaineIds.length === 1){
        domaineId = domaineIds[0]
    }else {
        throw new Error(`Plusieurs domaines possibles: ${substancesToString(substances)}`)
    }
    if (reportRow) {
        reportRow['Résultat Domaine'] = domaineId
        reportRow['Remarque Domaine'] = message;
    }
    return domaineId

}

module.exports = domaineGet
