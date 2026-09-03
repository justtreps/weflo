# Rapport de correction finale — Weflo Native Commerce Builder

Date : 2026-09-03

## Résultat

La revue globale est traitée en une vague cohérente, avec tests comportementaux écrits avant les corrections. Aucun sous-agent n'a été utilisé.

### Runtime Shopify critique

- `createWefloProductRuntime` est désormais l'unique implémentation ; l'asset publié est sa sérialisation directe, sans extension ou guard divergent.
- Le verrou de checkout est appliqué avant toute branche AJAX/native, et bloque effectivement le submit.
- Le `MutationObserver` n'est installé que sur un formulaire verrouillé et ne réécrit `disabled` que si la valeur doit changer, ce qui supprime la boucle de mutations.
- Les événements `shopify:section:load` / `shopify:section:unload`, l'AbortController, les observers et `destroy()` assurent un montage idempotent et un démontage complet.

### Offre quantité Web, Liquid et CSS

- Web et Liquid partagent le contrat de classes `tiers-layout`, `tier`, `tier-subtitle`, `badge`, `discount` et `variant`.
- Sous-titre, badge, remise, sélecteur de variante, économies et note de livraison sont rendus depuis les réglages.
- Les trois compositions ont des structures CSS réellement distinctes : cartes horizontales, pile premium et table de paliers.
- Le CSS est défini une seule fois dans `quantity-offer-styles.ts`, consommé par le canvas et publié dans `assets/weflo-quantity-offer.css`.
- Une offre vide ou non exploitable reste visiblement indisponible et son bouton est désactivé.

### Variantes, normalisation et migration

- Liquid ne publie jamais directement `block.settings.variant_id` : l'identifiant demandé est recherché dans `tier_product.variants`, échappé après résolution et refusé s'il est absent ou indisponible.
- Le rendu Web n'injecte pas d'identifiant de variante non résolu.
- La normalisation centrale borne la quantité à un entier `1..99`, limite la remise à `none | percentage | fixed`, migre `amount` vers `fixed` et borne sa valeur à zéro minimum.
- Cette normalisation est utilisée par les mutations de l'éditeur, la migration, le rendu Web et la compilation Shopify ; Liquid applique les mêmes bornes à l'exécution.
- La migration matérialise les paliers depuis `quantity_breaks` pour les documents v2 et pré-v2, utilise l'ordinal réel des seuls blocs d'offre, normalise `settings.variant` et `variantId`, et conserve texte, sous-titre, prix et produit hérités.

### Capacités et éditeur

- Les états de capacité sont maintenant `native`, `app-required` ou `unavailable`, avec un booléen `available` séparé.
- Aucune connexion Shopify n'est supposée en l'absence de faits.
- Le multi-produit est dérivé des blocs et exige à la fois l'extension Weflo et une Cart Transform attestée.
- Une remise configurée exige une règle Shopify attestée ; le chemin app n'est considéré disponible qu'avec les métadonnées correspondantes.
- L'API de capacités conserve désormais les réglages/blocs sûrs nécessaires à cette détection, et l'adaptateur natif ne revendique plus les capacités app sans preuve.
- L'éditeur ajoute le sous-titre du palier, l'affichage des économies et la note de livraison ; la suppression demande confirmation et toutes les mutations métier restent undoables.
- `setExclusiveBlockSetting` est borné au type ou aux IDs explicitement fournis ; la sélection section/bloc est réconciliée après mutation, undo et redo.

## Vérification

- `npx vitest run tests/quantity-offer-domain.test.ts tests/shopify-product-runtime.test.ts tests/shopify-capability-report.test.ts tests/quantity-offer-section.test.ts tests/editor-migrate.test.ts tests/editor-offer-editor.test.ts tests/editor-commands.test.ts` : **59/59 tests verts**.
- `npx vitest run tests/shopify-compiler.test.ts -t "publishes quantity|keeps stable discount|normalizes tier|ships the quantity-offer"` : **4/4 tests Shopify ciblés verts**.
- `npm run build` : **vert** (`build:hydrate` et `build:vercel`). Les sorties générées ont ensuite été restaurées octet pour octet à leur état de travail préexistant afin de ne pas écraser `public/hydrate/creer.js`, `public/hydrate/editeur.css` et `public/hydrate/editeur.js`.
- `git diff --check` : **vert** (uniquement les avertissements CRLF du checkout Windows).

## Baseline hors périmètre

La passe complète `npm test` termine avec **552 tests verts et 15 rouges**. Les **9 échecs déjà consignés** restent inchangés dans `section-registry`, `premium-section-variants`, `canardo-context`, `canardo-vibecode`, `shopify-compiler` et `onboarding-api`. La même passe parallèle a aussi produit **6 timeouts Playwright** dans `create-flow-browser` sur l'écran « À qui doit parler cette page ? » ; ce flux et ses bundles publics sales n'ont pas été modifiés par cette correction.

Le typecheck conserve **9 diagnostics baseline** dans `canardo/apply.ts`, `canardo/validate.ts`, `editor/ui/canardo-review.ts`, `hydrate/creer.ts`, `server/pages.ts` et `tests/premium-section-variants.test.ts`. Les diagnostics introduits pendant la correction ont été éliminés.

Les dossiers `_tmp/edge-landing/` et `_tmp/landing-captures/` ainsi que les trois sorties `public/hydrate/*` préexistantes n'ont été ni supprimés ni inclus dans le commit.
