const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

const names = [
  'titres',
  'titulaires',
  'demarches',
  'etapes',
];

async function main() {
  const geos = await csv().fromFile('./sources/csv/cartog-cxx.csv');

  const tables = await Promise.all(names.map(
    async (table) => {
      const csvFilePath = `./sources/csv/deb_${table}.csv`;

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

  const joined = result[0].data.sort((a, b) => {
    a = a.localisation.toLowerCase();
    b = b.localisation.toLowerCase();
    return a < b ? -1 : a === b ? 0 : 1;
  }).filter((title) => {
    const geo = geos.find(f => f.idtm.toLowerCase() === title.num_titre.toLowerCase());

    if (geo) {
      title.geos = geo;

      title.type = result[1].index[title.idd_typetr];
      title.demandeur = result[2].index[title.idd_demandeurs];

      return true;
    }
  });

  const valid = joined.filter((title) => title.geos.statut === 'valide');

  if ('titres') {
    const fields = Object.keys(valid[0]);

    const opts = { fields: fields.slice(0, fields.length - 4) };

    try {
      const csv = json2csv(valid, opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('type') {
    const fields = Object.keys(valid[0].type);

    const opts = { fields };

    try {
      const csv = json2csv(valid.map(v => v.type), opts);
      console.log(csv);
    } catch (err) {
      console.error(err);
    }
  }

  if ('demandeurs') {
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

  if ('consolidation') {
    const consol = valid.map((v => ({
      deb: {
        ...v, geos: null, activites: null, type: null,
      },
      ...v.geos,
    })));

    if (false) {
      console.log(valid[10]);
      console.log(consol[10]);
    }

    const fields = [
      'deb.idd_titres',
      'idtm', 'deb.num_titre',
      'nomtitre', 'deb.localisation',
      'titulaire',
      'deb.idd_demandeurs',
      'deb.demandeur.societe', 'deb.demandeur.siret',
      'date_oct', 'deb.date_octroi', 'dateperemp',
      'deb.date_echeance', 'deb.date_renonciation',
      'subst_1', 'subst_2',
      'surf_off', 'deb.surface',
      'surf_sig',
      'deb.prolongations', 'prol',
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
