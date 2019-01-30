const fs = require('fs')
const path = require('path')

const csv = require('csvtojson')
const json2csv = require('json2csv').parse;

async function main() {
  let file1 = await csv().fromFile('./sources/recapitulation.csv')

  file1 = file1
    .filter(f => f.rapports === '-1')
    .map(f => {
      f.travaux.forEach(t => {
        Object.keys(t).forEach(k => {
          t[k] = t[k] === '1'
          if (!t[k]) {
            delete t[k]
          }
        })
      })

      const {
        annee,
        trimestre,
        or,
        pelles,
        pompes,
        mercure,
        carburantDetaxe,
        carburantConventionnel,
        effectifs,
        environnement,
        travaux,
        Observations,
      } = f;

      return {
        id: `${f.id}-2018-01`,
        titre_id: f.id,
        date: new Date,
        contenu: {
          annee: new Number(annee),
          trimestre: new Number(trimestre),
          or: new Number(or),
          pelles: new Number(pelles),
          pompes: new Number(pompes),
          mercure: new Number(mercure),
          carburantDetaxe: new Number(carburantDetaxe),
          carburantConventionnel: new Number(carburantConventionnel),
          effectifs: new Number(effectifs),
          environnement: new Number(environnement),
          travaux,
          complement: Observations,
        }
      }
    })

  const fields = Object.keys(file1[0]);

  const opts = { fields };

  try {
    const csv = json2csv(file1, opts);
    console.log(csv);
  } catch (err) {
    console.error(err);
  }

  process.exit(0)
}

main()
