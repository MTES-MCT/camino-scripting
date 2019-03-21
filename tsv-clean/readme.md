# Camino clean tsv

Script pour nettoyer les tsv sur les titres miniers et les trier en ordre de priorité pour la correction manuelle.
Les tsv sont stockées dans 5 dossiers différents:

- OK: le tsv est correct
- InversionXYDegre: le fichier a des colonnes qui sont inversees. Pour l'instant, inversion manuelle de ces dernières
- aCompleter: Necessite de rentrer les coordonnées de manière manuelle, possede une description
- aVerifier: fichier a regarder et a modifier, possibilité de mauvais epsg ou de mauvais points
- Inutilisable: fichier inutilisable, sans description et sans point

```bash
# Lit les tsv
node epsgObtain.js

# Nettoie les tsv
node epsgModif.js

# Reecrit les tsv
node epsgWrite.js
```
