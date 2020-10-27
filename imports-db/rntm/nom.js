const substances = require('../sources/json/substances-rntm-camino.json')
const {capitalize} = require("./_utils");

const substancesAliases = substances.map(s => s.alias.toLowerCase())


const nomGet = (rntmNom, reportRow) => {

    nom = rntmNom.toLowerCase()

    const substance = substancesAliases.find(s => nom.includes(`(${s})`))
    const remarques = []
    if (substance) {
        nom = nom.replace(`(${substance})`, '')
        remarques.push('Suppression de la substance')
    }

    const titreType = ["pex", 'per', 'concession'].find(t => nom.includes(`(${t})`))
    if (titreType) {
        nom = nom.replace(`(${titreType})`, '')
        remarques.push('Suppression du type de titre')
    }

    const determinant = ["le", 'la', 'les', 'l\'', 'l '].find(d => nom.includes(`(${d})`))
    if (determinant) {
        nom = nom.replace(`(${determinant})`, '')

        if (determinant === 'l\'') {
            nom = `${determinant}${nom}`;
        }else if ( determinant === 'l '){
            nom = `l'${nom}`;

        } else {
            nom = `${determinant} ${nom}`;
        }

        remarques.push('Déplacement du déterminant devant')
    }

    if( nom.includes("(dite") ){
        nom = nom.replace(/ *\(dit[^)]*\) */g, " ")
        if (nom.includes("(")) {
            nom = nom.substring(0, nom.indexOf('('))
        }
        remarques.push('Suppression du "(DITE DE)"')
    }

    if( nom.includes("ou c")) {
        remarques.push('Suppression du "ou concession"')
        nom = nom.substring(0, nom.indexOf('ou c'))
    }

    const chiffreRomain = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
        'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'].find(n => nom.includes(` ${n} `) || nom.includes(` ${n}(`) || nom.endsWith(` ${n}`))
    if (chiffreRomain) {
        const pattern = ` ${chiffreRomain}`;
        nom = nom.replace(new RegExp(pattern), l => l.toUpperCase())
    }

    const motsLowercase = ["du", "le", "les", "la", "de", "sur", "aux", "et", "d", "ou", "sous", "des", "en"]
    const separators = [" ", "-"]
    separators.forEach(separator => {
        nom = nom
            .split(separator)
            .map(s => {
                if (s.startsWith('(') || motsLowercase.includes(s)) {
                    return s
                }
                if (s.startsWith('d\'') || s.startsWith('l\'')) {
                    return `${s.substring(0, 1)}'${capitalize(s.substring(2))}`
                }
                return capitalize(s);
            })
            .join(separator)
    })

    nom = nom.trim();
    nom = nom.replace(/  /g, ' ')
    nom = capitalize(nom)

    if (reportRow) {
        reportRow['Résultat nom'] = nom;
        reportRow['Remarques nom'] = remarques.join('. ');
    }

        // console.log(rntmNom, "\t", nom);

    return nom;
}

module.exports = { nomGet }
