# Weflo — checklist d’acceptation

Date : 2026-09-02
Branche : `main`

## Vérifications automatiques

- [x] Suite Vitest complète : 77 fichiers, 285 tests réussis.
- [x] Vérification TypeScript : `npx tsc --noEmit`.
- [x] Build navigateur et API : `npm run build`.
- [x] Le checkout Pro refuse toute URL autre que HTTPS sur `whop.com` avant redirection.
- [x] La publication refuse un export Shopify invalide avant le premier appel réseau.
- [x] Les recettes de boutique changent selon la vérité produit et la direction artistique.
- [x] Les variantes premium conservent galerie, offre, variantes, preuve et CTA mobile dans l’éditeur et dans Liquid.

## Vérifications visuelles locales

- [x] `/maquette-dashboard` vérifiée sur ordinateur.
- [x] `/dashboard` vérifié sur ordinateur avec les projets réels.
- [x] `/dashboard` vérifié à 390 × 844, sans débordement horizontal de la page.
- [x] Un écran de préparation apparaît immédiatement pendant le chargement des projets.

## Vérifications nécessitant un service externe

- [ ] Paiement Whop réel : ne pas déclencher un achat de production pendant la recette automatisée.
- [ ] Publication sur un thème de développement Shopify connecté : requiert une boutique de test et son autorisation OAuth.

## Configuration attendue en production

- `WHOP_PLAN_PRO` doit pointer vers le plan Weflo Pro actif.
- `OPENAI_API_KEY` active la génération et l’analyse réelles ; sans clé, le parcours utilise le moteur de repli.
- `DATABASE_URL` doit être configurée pour la persistance Postgres de production.
