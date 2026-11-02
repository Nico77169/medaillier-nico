# Médaillier de Nico

Appli installable (PWA) de suivi de collection de jetons touristiques Monnaie de Paris.

- **Appli** : `index.html`, `app.js`, `config.js`, `sw.js` (hors ligne), `manifest.webmanifest`.
- **Catalogue** : `catalogue.json` (thèmes, jetons, variantes, photos libres de droits).
- **Collection de Nico** : stockée dans son projet Supabase (table `collection`, bucket privé `photos`), protégée par son compte.
- **Nouveautés** : le robot `.github/workflows/numista.yml` interroge l'API Numista chaque 1er du mois
  (Disney et Beauval en priorité, puis les autres nouveautés estampillées Monnaie de Paris) et met `catalogue.json` à jour.
  La clé est dans le secret GitHub `NUMISTA_API_KEY`.

Données et photos : [Numista](https://fr.numista.com) (photos sous licences Creative Commons, auteur crédité sur chaque fiche).
Liste Disney : tableau personnel de Nico.
