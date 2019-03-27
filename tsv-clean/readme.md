# Camino clean tsv

Script pour nettoyer les tsv sur les titres miniers et les trier en ordre de priorité pour la correction manuelle.

- OK: le tsv est correct
- InversionXYDegre: le fichier a des colonnes qui sont inversees. Pour l'instant, inversion manuelle de ces dernières
- aCompleter: Necessite de rentrer les coordonnées de manière manuelle, possede une description
- aVerifier: fichier a regarder et a modifier, possibilité de mauvais epsg ou de mauvais points
- Inutilisable: fichier inutilisable, sans description et sans point

Suite à cela, on peut écrire ces fichiers dans des tsv propres, stockées dans 5 dossiers différents portant les noms ci dessus, mais l'on peut aussi écrire un fichier csv poubant etre integre sur le drive.

- epsg-obtain recupere les fichiers
- epsg-modif les nettoie
- epsg-write les ecrit
- index execute ces trois scripts à la suite


```bash
# Cree un ficier csv pouvant etre integre au dossier google drive
node index.js
```
