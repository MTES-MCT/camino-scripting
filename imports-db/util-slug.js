const csv = require('csvtojson');
const json2csv = require('json2csv').parse;
const slugify = require('@sindresorhus/slugify');

async function buildUtilisateurs() {
  let utils = await csv().fromFile('./sources/csv/consol-utilisateurs.csv');

  utils = utils.map(e => ({
    ...e,
    id: slugify(`${e.prenom}-${e.nom}`),
  }));

  return utils;
}

async function main() {
  const result = await buildUtilisateurs();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
