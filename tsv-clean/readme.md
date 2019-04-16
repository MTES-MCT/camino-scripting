# Camino clean tsv

Script pour nettoyer les tsv sur les titres miniers et les trier pour la correction manuelle et l'import dans Camino.

On regroupe les tsvs de chaque domaine dans des fichiers csv permettant l'import dans Camino.
Création d'un log des erreurs permettant d'identifier si le tsv est intégrable dans Camino, si le point existe déjà dans Camino, si le tsv reste à compléter manuellement ou si le tsv ne contient pas de points ou est inutilisable 

```bash
# Cree un ficier csv pour chaque domaine pouvant etre integre au dossier partagé de Camino
node index.js
```
