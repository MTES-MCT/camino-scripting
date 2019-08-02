const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

function buildTitreRef(titre) {
  return `${(titre.datprefsd || 'XXXX').slice(0, 4)}-${titre.cod.padEnd(4, '0')}-${titre.txtcod}`;
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

  const titulaires = await csv().fromFile('./sources/csv/deb_titulaires.csv');
  const indexTitulaires = titulaires.reduce((r, t) => (r[t.itv_cdn] = t, r), {});
  const liens = await csv().fromFile('./sources/csv/deb_liens_titulaires.csv');
  const indexLiens = liens.reduce((r, e) => (r[e.id_tit] = indexTitulaires[e.id_titu], r), {});

  let substances = await csv().fromFile('./sources/csv/deb_substances.csv');
  const indexSubstances = substances.reduce((r, t) => (r[t.id] = t, r), {})
  let titresSubstances = await csv().fromFile('./sources/csv/deb_titres_substances.csv');
  const indexTitresSubstances = titresSubstances.reduce((r, t) => (r[t.id_tit] = (r[t.id_tit] || []).concat(t), r), {});

  let titresTypes = await csv().fromFile('./sources/csv/deb_titres_types.csv');
  const indexTitresTypes = titresTypes.reduce((r, t) => (r[t.id] = t, r), {})
  let titresEtatst = await csv().fromFile('./sources/csv/deb_titres_etats_t.csv');
  const indexTitresEtatst = titresEtatst.reduce((r, t) => (r[t.id] = t, r), {})
  let titresEtatsj = await csv().fromFile('./sources/csv/deb_titres_etats_j.csv');
  const indexTitresEtatsj = titresEtatsj.reduce((r, t) => (r[t.id] = t, r), {})

  titres = titres.map((titre) => {
    let { itv_rfa: siret = '', itv_nom_lb: titulaire = '' } = indexLiens[titre.id] || {};

    siret = siret.replace(/[ .-]/g, '');

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

    let substances;
    const titresSubstances = indexTitresSubstances[titre.id];
    if (titresSubstances && titresSubstances.length) {
      substances = titresSubstances.map(s => (indexSubstances[s.id_sub] || {}).nom_sub).join(', ');
    }

    return {
      domaine_id,
      idtm: buildTitreRef(titre),
      id: titre.id,
      nomtitre: titre.nmtit,
      type: (indexTitresTypes[titre.typtit] || '').nom,
      statut: (indexTitresEtatsj[titre.etatj] || '').nom_etatj,
      statut_precis: (indexTitresEtatst[titre.etatt] || '').nom_etatt,
      titulaire,
      entreprise_id: siret && `fr-${siret.slice(0, 9)}`,
      siret,
      date_oct,
      duree,
      dateperemp,
      substances,
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
  const liens = await csv().fromFile('./sources/csv/deb_titulaires.csv');
  let titulaires = await csv().fromFile('./sources/csv/deb_liens_titulaires.csv');

  const indexTitulaires = titulaires.reduce((r, t) => (r[t.itv_cdn] = t, r), {});

  const indexLiens = liens.reduce((r, e) => (r[e.id_titu] = true, r), {});
  const ids = Object.keys(indexLiens);

  titulaires = ids.map(id => {
    const titulaire = indexTitulaires[id];

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

    return {
      ref: titre.idtm,
      titre: titre && titre.nomtitre,
      typ_aff,
      ...demarche,
    };
  });

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

    const { id, dat: date, cod_evt, obs } = etape;

    const { evt_nom, com, ord }  = indexEtapesTypes[cod_evt] || {};

    const docs = indexDocuments[etape.id] || [];

    return {
      idtm: titre && titre.idtm,
      titre: titre && titre.nomtitre,
      d_id: demarche && demarche.id,
      demarche: demarche && demarche.nom,
      id,
      date,
      cod_evt,
      event: evt_nom,
      com,
      ord,
      obs,
      ...docs[0],
    };
  });

  return etapes;
}

async function buildCommunes() {
  let titres = await csv().fromFile('./sources/csv/deb_titres.csv');
  const titresIndex = titres.reduce((r, t) => {
    r[t.id] = t;
    return r;
  });

  let liensCommunes = await csv().fromFile('./sources/csv/deb_liens_communes.csv');

  let communes = liensCommunes.reduce((r, { insee, id_tit }) => {
    const titre = titresIndex[id_tit];

    if (!titre) return r;

    const { nmtit: nom, datmo: date } = titre;

    r.push({
      id_tit,
      nom,
      date,
      insee,
    });

    return r;
  }, []);

  return communes;
}

async function main() {
  const result = await buildTitres();

  const opts = { fields: Object.keys(result[0]) };

  const res = json2csv(result, opts);

  console.log(res);
}

main();
