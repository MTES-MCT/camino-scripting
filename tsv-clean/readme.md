# Camino clean tsv

Script pour nettoyer les tsv sur les titres miniers et les trier en ordre de priorité pour la correction manuelle.
Les tsv sont stockées dans 5 dossiers différents:

- OK: le tsv est correct
- Corrige: fichier corrigé automatiquement, correct aussi
- A corriger: Necessite de rentrer les coordonnées de manière manuelle, possede une description
- A verifier: fichier a regarder et a modifier, possibilité de mauvais epsg ou de mauvais points
- Inutilisable: fichier inutilisable, sans description et sans point

```bash
# Lit les tsv
node obtain_epsg.js

# Nettoie les tsv
node modif_epsg.js

# Reecrit les tsv
node write_files.js
```
