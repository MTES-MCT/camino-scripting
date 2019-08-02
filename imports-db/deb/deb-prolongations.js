const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

async function buildDemarches() {
  let titres = require('./sources/json/titres-m973-titres.json')
  const indexTitres = titres.reduce((r, t) => (r[t.references.DEB] = t, r), {})

  let demarches = await csv().fromFile('./sources/csv/cxx-deb-prolongations.csv');

  demarches = demarches.reduce((r, e) => {
    if (e.cod_evt === '1') {
      const titre = indexTitres[e.idtm] || {};
      if (!titre) console.error(e);

      const { id: titre_id } = titre;

      r.push({
        id: `${titre_id}-pro01`,
        titre_id,
        type_id: 'pro',
        statut_id: 'ind',
        ordre: 1,
      })
    }

    return r;
  }, []);

  return demarches;
}

async function buildEtapes() {
  let titres = require('./sources/json/titres-m973-titres.json')
  const indexTitres = titres.reduce((r, t) => (r[t.references.DEB] = t, r), {})

  let etapes = await csv().fromFile('./sources/csv/cxx-deb-prolongations.csv');

  etapes = etapes.reduce((r, e) => {
    if (e.cod_evt === '1') {
      const titre = indexTitres[e.idtm] || {};
      if (!titre) console.error(e);

      const { id: titreId } = titre;

      const titre_demarche_id = `${titreId}-pro01`;

      r.push({
        id: `${titreId}-pro01-men01`,
        titre_demarche_id,
        type_id: 'men',
        statut_id: 'fai',
        ordre: 1,
        date: e.date,
      }, {
        id: `${titreId}-pro01-mfr01`,
        titre_demarche_id,
        type_id: 'mfr',
        statut_id: 'fai',
        ordre: 2,
        date: '',
      }, {
        id: `${titreId}-pro01-dim01`,
        titre_demarche_id,
        type_id: 'dim',
        statut_id: 'rej',
        ordre: 3,
        date: e.datefin,
      })
    }

    return r;
  }, []);

  return etapes;
}

async function main() {
  // const result = await buildEtapes();
  const result = await buildDemarches();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
