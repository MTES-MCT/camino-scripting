tables="contours_initiaux_de_demandes_modifiees
demandes_de_titres_miniers_rejettees
demandes_de_modification_en_cours
titre_minier_en_cours_de_demande
titre_minier_attribues_et_en_cours
titres_miniers_echus
titres_miniers_proroges"

commands=""

for table in $tables
do
    commands=$commands"COPY (
  SELECT
    titre.*,
    ST_AsGeoJSON(geom, 0, 2) :: json as \"references\",
    ST_AsGeoJSON(ST_Transform(geom, 4326), 15) :: json as \"points\"
  FROM $table as titre
) TO '/tmp/onf/onf2_$table.csv' WITH CSV HEADER FORCE QUOTE * ;
"

done

nouvelles_demandes="
COPY (
  SELECT
    titre.*,
    ST_AsGeoJSON(titre.geom, 0, 2) :: json as \"references\",
    ST_AsGeoJSON(ST_Transform(titre.geom, 4326), 15) :: json as \"points\",
    dem.nom_demandeur as \"demandeur_nom\",
    foret.foret as \"foret_nom\"
  FROM nouvelle_demande as titre
  LEFT JOIN liste_demandeur as dem
    ON dem.id_onf :: text = titre.demandeur :: text
  LEFT JOIN foret_onf as foret
    ON foret.code_for :: text = titre.foret :: text
  ORDER BY titre.type_dossier, winref_onf
) TO '/tmp/onf/onf2_nouvelles_demandes.csv' WITH CSV HEADER FORCE QUOTE * ;
"

forets="
COPY (
  SELECT
    foret.*,
    ST_AsGeoJSON(geom, 0, 2) :: json as \"references\",
    ST_AsGeoJSON(ST_Transform(geom, 4326), 15) :: json as \"points\"
  FROM foret_onf as foret
) TO '/tmp/onf/onf2_forets.csv' WITH CSV HEADER FORCE QUOTE * ;
"

psql -d onf2 --username=postgres -h localhost -c "
$nouvelles_demandes
$commands
$forets"
