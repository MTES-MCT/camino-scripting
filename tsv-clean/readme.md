# Camino clean tsv

Script pour nettoyer les tsv sur les titres miniers et les trier pour la correction manuelle et l'import dans Camino.

On regroupe les tsvs de chaque domaine dans des fichiers csv permettant l'import dans Camino.
Création d'un log des erreurs permettant d'identifier si le tsv est intégrable dans Camino, si le point existe déjà dans Camino, si le tsv reste à compléter manuellement ou si le tsv ne contient pas de points ou est inutilisable

Avant de lancer le script, il faut lancer l'api graphQL de camino-api et y faire tourner la query mis à dispotion dans `query.graphql`
Modifier le fichier `graphiql-point-etape-demarche.json.exemple` en `graphiql-point-etape-demarche.json` et y ajouter le résultat de la query

A la suite de cela, mettre dans les dossiers c, g, h, m, w les tsv que l'on souhaitent importer

Des paramètres de sélection des tsv à importer peuvent être modifiés. Actuellement, tous les tsvs sont importable sans recherche de l'existence dudit tsv dans la base de données.

Pour finir, lancer un terminal et exécuter les commandes suivantes

```bash
#Importe les modules
npm i

# Cree un ficier csv pour chaque domaine pouvant etre integre au dossier partagé de Camino
node index.js
```
