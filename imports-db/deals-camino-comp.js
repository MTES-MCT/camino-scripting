const csv = require('csvtojson')
const json2csv = require('json2csv').parse;

function sortNumtitres(arr) {
  return arr.sort(
    ({ numtitre: a }, { numtitre: b }) => a < b ? -1 : (a > b ? 1 : 0)
  );
}

async function main() {
  let camino = await csv({ delim: '\t' }).fromFile('./sources/csv/m973-deal-ids.csv')
  let deal = await csv().fromFile('./sources/csv/deal.csv')

  camino = sortNumtitres(camino);
  deal = sortNumtitres(deal);

  const dups = sortNumtitres([...camino, ...deal])

  let res = dups.reduce((r, e) => {
    if (!r[e.numtitre]) {
      r[e.numtitre] = {
        count: 0,
      }
    }

    r[e.numtitre] = {
      ...r[e.numtitre],
      ...e,
    }

    r[e.numtitre].count += 1

    return r
  }, {})

  res = Object.values(res)

  const opts = {
    fields: Object.keys({ ...camino[0], ...deal[0] }),
  }

  try {
    const csv = json2csv(res, opts);
    console.log(csv);
  } catch (err) {
    console.error(err);
  }
}

main()
