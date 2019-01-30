const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

function buildTitreRef(titre) {
  const date = titre.datprefsd

  return `${date.slice(0, 4)}-${titre.cod.padEnd(4, '0')}-${titre.txtcod}`;
}

async function buildTitres() {
  let titres = await csv().fromFile('./sources/csv/deb_titres.csv');

  let demarches = await csv().fromFile('./sources/csv/deb_affaires.csv');
  const indexDemarches = demarches.reduce((r, t) => (r[t.id_tit] = (r[t.id_tit] || []).concat(t), r), {});
  let demarchesTypes = await csv().fromFile('./sources/csv/deb_affaires_types.csv');
  const indexDemarchesTypes = demarchesTypes.reduce((r, t) => (r[t.id] = t, r), {})

  let etapes = await csv().fromFile('./sources/csv/deb_events.csv');
  const indexEtapes = etapes.reduce((r, t) => (r[t.id_aff] = (r[t.id_aff] || []).concat(t), r), {});
  let etapesTypes = await csv().fromFile('./sources/csv/deb_events_types.csv');
  const indexEtapesTypes = etapesTypes.reduce((r, t) => (r[t.id] = t, r), {})
  let documents = await csv().fromFile('./sources/csv/deb_events_documents.csv');
  const indexDocuments = documents.reduce((r, t) => (r[t.id_evt] = (r[t.id_evt] || []).concat(t), r), {});

  let titresTypes = await csv().fromFile('./sources/csv/deb_titres_types.csv');
  const indexTitresTypes = titresTypes.reduce((r, t) => (r[t.id] = t, r), {})
  let titresEtatst = await csv().fromFile('./sources/csv/deb_titres_etats_t.csv');
  const indexTitresEtatst = titresEtatst.reduce((r, t) => (r[t.id] = t, r), {})
  let titresEtatsj = await csv().fromFile('./sources/csv/deb_titres_etats_j.csv');
  const indexTitresEtatsj = titresEtatsj.reduce((r, t) => (r[t.id] = t, r), {})

  titres = titres.map((titre) => {
    const titreDemarches = indexDemarches[titre.id];

    if (titreDemarches && titreDemarches.length) {
      const octroi = titreDemarches.find(d => d.a_typ === '2') || '';
      titre.date_oct = octroi.dat_a_ouv;

      titreDemarches.forEach((d) => {
        const { typ_aff } = indexDemarchesTypes[d.a_typ] || {};
        d.type = typ_aff;

        const demarcheEtapes = indexEtapes[d.id];

        if (demarcheEtapes && demarcheEtapes.length) {
          demarcheEtapes.forEach((e) => {
            const { evt_nom, com, ord }  = indexEtapesTypes[e.cod_evt] || {};
            e.nom = evt_nom;

            const docs = indexDocuments[e.id] || [];
            if (docs && docs.length) {
              e.docs = docs;
            }
          });

          d.etapes = demarcheEtapes;
        }
      });
    }

    const {
      date_oct,
      datmo: dateperemp,
      duree,
      txtcod: domaine_id,
      surf: surf_off,
      ...rest
    } = titre;

    return {
      domaine_id,
      idtm: buildTitreRef(titre),
      id: titre.id,
      nomtitre: titre.nmtit,
      type: (indexTitresTypes[titre.typtit] || '').nom,
      statut: (indexTitresEtatsj[titre.etatj] || '').nom_etatj,
      statut_precis: (indexTitresEtatst[titre.etatt] || '').nom_etatt,
      date_oct,
      duree,
      dateperemp,
      surf_off,
      dep: titre.c_dpt_coor,
      demarches: titreDemarches,
    };
  });

  titres = titres.filter(t => {
    return t.type === 'Concession' && t.dep !== '973';
  });

  return titres;
}

async function buildTitulaires() {
  let titres = await buildTitres();
  const indexTitres = titres.reduce((r, t) => (r[t.id] = true, r), {})

  let titulaires = await csv().fromFile('./sources/csv/deb_titulaires.csv');
  const indexTitulaires = titulaires.reduce((r, t) => (r[t.itv_cdn] = t, r), {});

  let liens = await csv().fromFile('./sources/csv/deb_liens_titulaires.csv');
  const indexLiens = liens.reduce((r, e) => (indexTitres[e.id_tit] && (r[e.id_titu] = true), r), {});
  const ids = Object.keys(indexLiens);

  titulaires = ids.map(id => {
    const titulaire = indexTitulaires[id];

    if (!titulaire) console.log({ id })
    return titulaire;
  });

  return titulaires;
}

async function buildDemarches() {
  let titres = await buildTitres();
  const indexTitres = titres.reduce((r, t) => (r[t.id] = t, r), {})

  let demarches = await csv().fromFile('./sources/csv/deb_affaires.csv');

  let demarchesTypes = await csv().fromFile('./sources/csv/deb_affaires_types.csv');
  const indexDemarchesTypes = demarchesTypes.reduce((r, t) => (r[t.id] = t, r), {})

  demarches = demarches.map((demarche) => {
    const titre = indexTitres[demarche.id_tit];

    const { a_typ } = demarche;

    const { typ_aff }  = indexDemarchesTypes[a_typ] || {};

    if (!titre) return '';

    return {
      ref: titre.idtm,
      titre: titre && titre.nomtitre,
      typ_aff,
      ...demarche,
    };
  });

  demarches = demarches.filter(e => e);

  return demarches;
}

async function buildEtapes() {
  let titres = await buildTitres();
  const indexTitres = titres.reduce((r, t) => (r[t.id] = t, r), {})

  let demarches = await csv().fromFile('./sources/csv/deb_affaires.csv');
  const indexDemarches = demarches.reduce((r, t) => (r[t.id] = t, r), {})

  let etapesTypes = await csv().fromFile('./sources/csv/deb_events_types.csv');
  const indexEtapesTypes = etapesTypes.reduce((r, t) => (r[t.id] = t, r), {})

  let etapes = await csv().fromFile('./sources/csv/deb_events.csv');

  let documents = await csv().fromFile('./sources/csv/deb_events_documents.csv');
  const indexDocuments = documents.reduce((r, t) => (r[t.id_evt] = (r[t.id_evt] || []).concat(t), r), {});

  etapes = etapes.map((etape) => {
    const demarche = indexDemarches[etape.id_aff];
    const titre = demarche && indexTitres[demarche.id_tit];

    if (!titre) return '';

//    if (!demarche || demarche.a_typ !== '5') return '';

    const { id, dat: date, cod_evt, obs } = etape;

    const { evt_nom, com, ord }  = indexEtapesTypes[cod_evt] || {};

    const docs = indexDocuments[etape.id] || [];

    return {
      idtm: titre && titre.idtm,
      titre: titre && titre.nomtitre,
      d_id: demarche && demarche.id,
      demarche: demarche && demarche.nom,
      dateouv: demarche && demarche.dat_a_ouv,
      datefer: demarche && demarche.dat_a_fer,
      datefin: demarche && demarche.dat_a_fndelai,
      id,
      cod_evt,
      event: evt_nom,
      date,
      com,
      ord,
      obs,
      ...docs[0],
    };
  });

  etapes = etapes.filter(e => e);

  return etapes;
}

async function buildDocuments() {
  const etapes = await buildEtapes();

  const indexEtapes = etapes.reduce((r, t) => (r[t.id] = (r[t.id] || []).concat(t), r), {});

  let documents = await csv().fromFile('./sources/csv/deb_events_documents.csv');

  documents = documents.filter(d => indexEtapes[d.id_evt]);

  return documents;
}

async function buildCommunes() {
  let titres = await buildTitres();
  const indexTitres = titres.reduce((r, t) => {
    r[t.id] = t;
    return r;
  });

  let liensCommunes = await csv().fromFile('./sources/csv/deb_liens_communes.csv');

  let communes = liensCommunes.reduce((r, { insee, id_tit }) => {
    const titre = indexTitres[id_tit];

    if (!titre) return r;

    const { nomtitre: nom, date_oct: date } = titre;

    r.push({
      id_tit,
      nom,
      date,
      insee,
    });

    return r;
  }, []);

  communes = communes.filter(c => indexTitres[c.id_tit]);

  return communes;
}

async function main() {
  const result = await buildTitres();
// const result = await buildTitulaires();
//  const result = await buildDemarches();
//  const result = await buildEtapes();
//  const result = await buildDocuments();
//  const result = await buildCommunes();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
