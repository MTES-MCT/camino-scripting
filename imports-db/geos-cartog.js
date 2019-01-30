const json2csv = require('json2csv').parse;

//const geos = require('./sources/json/m973-axm.json');
const geos = require('./sources/json/aex.json');

const fields = [
  'type',
  'idtm',
  'nomtitre',
  'dateperemp',
  'date_oct',
  'datemodif',
  'surf_off',
  'surf_sig',
  'titulaire',
  'subst_1',
  'subst_2',
  'acte_deb',
  'acte_fin',
  'prol',
  'obs',
  'statut',
  'coordinates',
];

async function main() {
  const valid = geos.features
//          .filter((a) => a.properties.statut === 'valide' && a.properties.type === 'axm')
          .map(a => ({ ...a.properties, coordinates: JSON.stringify(a.geometry.coordinates) }))
          .map(a => {
            let { titulaire, dateperemp, date_oct, datemodif } = a;
            if (titulaire.match(/^(SAS|SASU|SARL|EURL)/)) {
              const [raison, ...rest] = titulaire.split(' ');
              titulaire = [...rest, `(${raison})`].join(' ');
            }

            dateperemp = (dateperemp || '').replace(/\//g, '-');
            date_oct = (date_oct || '').replace(/\//g, '-');
            datemodif = (datemodif || '').replace(/\//g, '-');

            a.type = 'axm'

            return {
              ...a,
              titulaire,
              dateperemp,
              date_oct,
              datemodif,
            };
          });

  const opts = { fields };

  try {
    const csv = json2csv(valid, opts);
    console.log(csv);
  } catch (err) {
    console.error(err);
  }
}

main();
