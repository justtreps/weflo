# Weflo Creative Commerce Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer la navigation Weflo complète, les aperçus de créations, un Studio d’images Fal.ai et leur insertion dans les pages Shopify.

**Architecture:** Les nouvelles pages sont des shells HTML hydratés par TypeScript et partagent un chrome Weflo. Les générations d’images passent par un port serveur Fal.ai et un dépôt persistant, tandis que les créations continuent d’utiliser le document/compilateur Shopify existant.

**Tech Stack:** TypeScript, Hono, PostgreSQL, Fal.ai REST, HTML/CSS, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-02-weflo-creative-commerce-suite-design.md`

## Global Constraints

- Interface utilisateur en français ; langue boutique indépendante.
- `FAL_KEY` reste côté serveur.
- Conserver tous les modèles et toutes les sections existants.
- Travailler directement sur `main`, conformément à la demande utilisateur.
- Les archives Shopify tierces ne sont ni copiées ni commitées.

---

### Task 1: Navigation et icônes de marque

**Files:**
- Create: `src/dashboard/brand-icons.ts`
- Modify: `src/dashboard/home-view.ts`
- Modify: `src/hydrate/dashboard-home.css`
- Modify: `public/maquette-dashboard.html`
- Test: `tests/dashboard-home-view.test.ts`

**Interfaces:**
- Produces: `shopifyLogo(variant?: "mark" | "full"): string`.

- [ ] Écrire un test vérifiant un SVG Shopify accessible et les liens `/creations`, `/studio`, `/boutique`.
- [ ] Exécuter `npx vitest run tests/dashboard-home-view.test.ts` et constater l’échec.
- [ ] Ajouter le SVG Shopify officiel local et les quatre destinations de navigation.
- [ ] Rejouer le test et vérifier le responsive visuellement.
- [ ] Commiter avec `feat: add commerce workspace navigation`.

### Task 2: Bibliothèque de créations et aperçu

**Files:**
- Create: `public/creations.html`
- Create: `src/hydrate/creations.ts`
- Create: `src/hydrate/creations.css`
- Create: `src/dashboard/preview-dialog.ts`
- Modify: `src/server/app.ts`
- Modify: `package.json`
- Test: `tests/creations-view.test.ts`

**Interfaces:**
- Consumes: `GET /api/pages`, `DashboardProject`.
- Produces: `renderPreviewDialog(input: { url: string; name: string }): string`.

- [ ] Tester les vraies miniatures, les couvertures de repli et les commandes aperçu/modifier/dupliquer/supprimer.
- [ ] Ajouter la route statique `/creations` et son entrée d’hydratation.
- [ ] Construire la grille, la recherche, les filtres et la modale iframe avec bascule desktop/mobile.
- [ ] Vérifier que la fermeture restaure le focus et que `Échap` ferme la modale.
- [ ] Commiter avec `feat: add visual creations library`.

### Task 3: Port Fal.ai et persistance Studio

**Files:**
- Create: `src/studio/types.ts`
- Create: `src/studio/models.ts`
- Create: `src/studio/fal.ts`
- Modify: `src/types.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/memory.ts`
- Modify: `src/repos/postgres.ts`
- Modify: `src/server/app.ts`
- Create: `src/server/studio.ts`
- Test: `tests/fal-image.test.ts`
- Test: `tests/studio-api.test.ts`

**Interfaces:**
- Produces: `ImageStudioPort.generate(input): Promise<ImageGenerationResult>`.
- Produces: `GET /api/studio/generations`, `POST /api/studio/generate`.

- [ ] Tester la table des modèles, le mapping format/endpoint et la conservation du produit avec référence.
- [ ] Tester les réponses 401, 400, 503 et la réponse JSON d’une génération réussie.
- [ ] Implémenter le client REST avec `Authorization: Key ${FAL_KEY}` et timeout.
- [ ] Ajouter `listImageGenerations` et `saveImageGeneration` aux dépôts mémoire/PostgreSQL.
- [ ] Brancher `FAL_KEY` dans `prodDeps` sans l’exposer au client.
- [ ] Commiter avec `feat: add persistent Fal image generation API`.

### Task 4: Interface Studio images

**Files:**
- Create: `public/studio.html`
- Create: `src/hydrate/studio.ts`
- Create: `src/hydrate/studio.css`
- Modify: `src/server/app.ts`
- Modify: `package.json`
- Test: `tests/studio-view.test.ts`

**Interfaces:**
- Consumes: `GET /api/studio/generations`, `POST /api/studio/generate`, `GET /api/pages`.

- [ ] Tester la présence des quatre modèles, formats, référence, galerie, historique et action d’insertion.
- [ ] Construire le shell trois zones et son état mobile.
- [ ] Brancher génération, progression, erreurs, téléchargement et réutilisation comme référence.
- [ ] Ajouter le dialogue « Ajouter à une page » qui stocke la sélection dans `sessionStorage` puis ouvre l’éditeur.
- [ ] Commiter avec `feat: add Higgsfield-style image studio`.

### Task 5: Boutique Shopify et insertion dans l’éditeur

**Files:**
- Create: `public/boutique.html`
- Create: `src/hydrate/boutique.ts`
- Create: `src/hydrate/boutique.css`
- Modify: `src/hydrate/editeur.ts`
- Modify: `src/editor/ui/inspector.ts`
- Modify: `src/server/app.ts`
- Modify: `package.json`
- Test: `tests/studio-editor-insert.test.ts`
- Test: `tests/boutique-view.test.ts`

**Interfaces:**
- Consumes: `weflo-studio-insert = { pageId, imageUrl }` dans `sessionStorage`.
- Consumes: API Shopify et publication existantes.

- [ ] Tester que l’image Studio devient un média de section éditable avec sauvegarde/version.
- [ ] Tester les états Shopify déconnecté, connecté et invalide.
- [ ] Construire la page boutique et réutiliser le dialogue de publication existant.
- [ ] Brancher l’insertion Studio dans le premier champ image compatible sélectionné par l’utilisateur.
- [ ] Commiter avec `feat: connect studio assets to Shopify editor`.

### Task 6: Recettes Shopify et recette finale

**Files:**
- Modify: `src/onboarding/store-recipe.ts`
- Modify: `src/onboarding/compile-store.ts`
- Modify: `src/shopify/validate-theme-output.ts`
- Test: `tests/store-recipe.test.ts`
- Test: `tests/shopify-theme-output.test.ts`
- Modify: `tests/acceptance-checklist.md`

**Interfaces:**
- Consumes: `ProductTruth`, `ArtDirectionProfile`.
- Produces: une page contenant produit principal, preuve, narration, offre, objections, FAQ et CTA sans répétition.

- [ ] Ajouter des tests de recettes premium par catégorie et de diversité des variantes.
- [ ] Renforcer le séquençage, les médias et les contrôles anti-répétition.
- [ ] Exécuter `npm test -- --run`, `npx tsc --noEmit`, `npm run build` et `git diff --check`.
- [ ] Vérifier les quatre pages et l’éditeur en navigateur desktop/mobile.
- [ ] Pousser `main`, déployer Vercel et vérifier les API JSON de production.
