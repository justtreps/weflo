# Weflo — checklist d’acceptation

Date : 2026-08-31  
Branche : `feature/weflo-functional-app`

## Automatique (cette session)

- [x] `npm test` — 49 passed, 1 skipped (`postgres-store` sans `DATABASE_URL` dans le process de test)
- [x] `npm run extract` — OK
- [x] `npm run build:hydrate` — OK (connexion, dashboard, éditeur, facturation, parrainage)

## Manuel (à cocher en local / prod)

1. [ ] Inscription e-mail + Google, reload, logout
2. [ ] Créer / renommer / dupliquer / supprimer une page ; reload dashboard
3. [ ] Canardo change une section ; reload éditeur ; crédits baissent ; 0 crédit → 402 + Add Credits
4. [ ] Publish sans jeton → `/s/…` ; jeton faux → invalid, rien sur Shopify ; jeton OK → thème + produit
5. [ ] Checkout Whop sandbox + webhook → plan / crédits ; Manage ouvre le portail
6. [ ] `/r/{slug}` attribut ; self-ref refusé
7. [ ] Connexion / dashboard / éditeur / facturation / parrainage vs maquettes (layout, couleurs, barre Canardo). Pas de bouton Shopify login

## Notes

- `OPENAI_API_KEY` et `DATABASE_URL` sont vides dans le `.env` Production tiré de Vercel. Les mettre à jour pour Canardo réel et Postgres.
- Promo Whop créée : `wefloref20`. Pack crédits : `WHOP_PLAN_CREDITS` dans `.env` local.
- A/B et invitations d’équipe : UI only (hors v1).
