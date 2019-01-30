const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

async function buildReport() {
  let reports = await csv().fromFile('./sources/csv/camino-db-travaux-rapports.csv');

  reports = reports.map((r) => {
    let contenu = JSON.parse(r.contenu);
    const { travaux, ...rest }  = contenu;

    contenu = {
      ...rest,
      ...travaux.reduce((r, e) => {
        const { id, nom, ...rest } = e;

        const keys = Object.keys(rest)
                .map(k => `${k}: ${e[k]}`);

        r[`travaux_mois_${id}`] = keys.join('\n');
        return r;
      }, {})
    };

    return {
      ...r,
      ...contenu,
    };
  });

  return reports;
}

async function main() {
  const result = await buildReport();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
