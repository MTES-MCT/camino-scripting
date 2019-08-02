const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

function explode(obj, prefix) {
  return obj && Object.keys(obj).reduce((r, k) => (r[`${prefix}_${k}`] = obj[k], r), {});
}

async function main() {
  const geos = await csv().fromFile('./sources/csv/cartog-aex-full.csv');
  const geosIndex = geos.reduce((r, g) => (r[g.idtm] = g, r), {});

  const gda = await csv().fromFile('./sources/csv/gda_titres.csv');
  const gdaIndex = gda.reduce((r, g) => (r[g.num_titre] = g, r), {});

  const demandeurs = await csv().fromFile('./sources/csv/gda_demandeurs.csv');
  const demandeursIndex = demandeurs.reduce((r, d) => (r[d.idd_demandeurs] = d, r), {});

  const res = gda.reduce((r, gdaTitre) => {
    const geoTitre = geosIndex[gdaTitre.num_titre];

    gdaTitre.demandeur = (demandeursIndex[gdaTitre.idd_demandeurs] || {}).societe;

    r.push({
      ...explode(gdaTitre, 'gda'),
      ...explode(geoTitre, 'geo'),
    });

    return r;
  }, []);


  const opts = { fields: Object.keys(res[0]) };

  try {
    const csv = json2csv(res, opts);
    console.log(csv);
  } catch (err) {
    console.error(err);
  }
}

main();
