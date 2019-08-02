const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

const names = [
  'titres',
  'typetr',
  'demandeurs',
  'prolongation',
  'activite',
];

async function main() {
  const geos = await csv().fromFile('./sources/csv/cartog-aex-full.csv');

  const tables = await Promise.all(names.map(
    async (table) => {
      const csvFilePath = `./sources/csv/gda_${table}.csv`;

      return {
        table,
        data: await csv().fromFile(csvFilePath),
      };
    }
  ));

  const result = tables.map(({ table, data }) => {
    const { 0: first, length } = data;

    const cols = Object.keys(first);

    const index = data.reduce((r, line) => {
      r[line[`idd_${table}`]] = line;
      return r;
    }, {});

    return {
      table,
      length,
      cols,
      data,
      index,
      display: `${table} (${length}):\n- ${cols.join('\n- ')}`,
    };
  });

  const l = result[0].index;
  const keys = Object.keys(l);

  const gdas = result[0].data;

  const joined = gdas.filter((title) => {
    const geo = geos.find(f => f.idtm.toLowerCase() === title.num_titre.toLowerCase());

    if (geo) {
      title.geos = geo;

      title.type = result[1].index[title.idd_typetr];
      title.demandeur = result[2].index[title.idd_demandeurs];
      title.prolongations = result[3].data.filter((p) => p.idd_titres === title.idd_titres);
      title.activites = result[4].data.filter((p) => p.idd_titres === title.idd_titres);

      return true;
    }
  });

  const valid = joined
          .filter((title) => title.geos.statut === 'valide');

  if ('titres' === false) {
    const fields = Object.keys(valid[0]);

    const opts = { fields: fields.slice(0, fields.length - 4) };

    try {
      const csv = json2csv(valid, opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('type' === false) {
    const fields = Object.keys(valid[0].type);

    const opts = { fields };

    try {
      const csv = json2csv(valid.map(v => v.type), opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('demandeurs' === false) {
    const fields = Object.keys(valid.find(e => e.demandeur).demandeur);

    const opts = { fields };

    const demandeurs = Object.values(
      valid
        .map(v => v.demandeur)
        .reduce((r, d) => {
          if (!d) return r;

          d.siret = d.siret.replace(/[.\s]/g, '');
          r[d.idd_demandeurs] = d;
          return r;
        }, {})
    );

    try {
      const csv = json2csv(demandeurs, opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('prolongations' === false) {
    const prolongs = valid.filter(v => v.prolongations.length);

    const fields = Object.keys(prolongs[0].prolongations[0]);

    const opts = { fields };

    try {
      const csv = json2csv(valid.reduce((r, v) => r.concat(v.prolongations), []), opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('activites' === false) {
    const prolongs = valid.filter(v => v.activites.length);

    const fields = Object.keys(prolongs[0].activites[0]);

    const opts = { fields };

    try {
      const csv = json2csv(valid.reduce((r, v) => r.concat(v.activites), []), opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('consolidation') {
    const consol = geos.map(title => {
      const gda = gdas.find(f => title.idtm.toLowerCase() === f.num_titre.toLowerCase());
      if (gda) {
        return {
          ...title,
          gda,
        };
      }
      return title;
    });

    const fields = [
      'gda.idd_titres',
      'idtm', 'gda.num_titre',
      'nomtitre', 'gda.localisation',
      'titulaire',
      'gda.idd_demandeurs',
      'gda.demandeur.societe', 'gda.demandeur.siret',
      'date_oct', 'gda.date_octroi', 'dateperemp',
      'gda.date_echeance', 'gda.date_renonciation',
      'subst_1', 'subst_2',
      'surf_off', 'gda.surface',
      'surf_sig',
      'gda.prolongations', 'prol',
      'coordinates',
    ];

    const opts = { fields };

    try {
      const csv = json2csv(consol, opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }
}

main();
