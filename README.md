# Weflo — maquettes

Sept écrans exportés du brainstorm design, servis en statique (aucun build, aucune dépendance externe : tout le JS/CSS est inline dans chaque fichier).

| Route | Fichier |
|---|---|
| `/` | `index.html` (hub de navigation) |
| `/connexion` | `connexion.html` |
| `/dashboard` | `dashboard.html` |
| `/editeur` | `editeur.html` |
| `/direction-artistique` | `direction-artistique.html` |
| `/mascottes` | `mascottes.html` |
| `/facturation` | `facturation.html` |
| `/parrainage` | `parrainage.html` |

## Déploiement

Vercel, sans framework ni build command. `vercel.json` active `cleanUrls` (URLs sans `.html`). Chaque push sur `main` redéploie.
