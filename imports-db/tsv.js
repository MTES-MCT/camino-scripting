const fs = require('fs')
const path = require('path')

const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

async function build() {
  let etapes = require('./sources/json/titres-m973-titres-etapes.json');

  const ids = etapes.map(e => e.id);
  const indexEtapes = ids.reduce((r, e) => (r[e] = true, r), {})

  let files = fs.readdirSync('./sources/tsv').map(f => path.basename(f, '.tsv'));
  const indexFiles = files.reduce((r, e) => (r[e] = true, r), {})

  const result = [...ids, ...files].reduce((r, e) => {
    if (!r[e]) {
      r[e] = {
        tsv: !!indexFiles[e],
        camino: !!indexEtapes[e]
      };
    }

    return r;
  }, {});

  return Object.keys(result).map((k) => ({
    name: k,
    ...result[k],
  }));
}

async function main() {
  const result = await build();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
