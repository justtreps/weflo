# Task 2 — Offre quantité native

## Livré

- Remplacement du pack générique `quantity-offer` par une définition dédiée avec des blocs `offer-tier`.
- Chaque palier porte `title`, `subtitle`, `badge`, `quantity`, `discount_type`, `discount_value`, `product_handle`, `variant_id`, `preselected` et `show_variant_picker`.
- Le canvas et le Liquid rendent un groupe de radios accessible, avec `name="quantity"`, les identifiants de bloc et une sélection par défaut déterministe.
- Le Liquid s’appuie sur les objets produit et variante Shopify (`selected_product`, `tier_product`, `tier_variant`) et ne publie aucun prix de fixture. Les offres multi-produits rendent explicitement l’état application Shopify requise.
- Trois compositions sont enregistrées : `horizontal-cards`, `stacked-premium`, `tier-table`, avec styles `.wf-quantity-offer` et repli mobile.
- Les anciens blocs `offer` restent affichables afin que les documents v2 précédents ne perdent pas leur contenu de palier.

## TDD

Les tests de parité ont été ajoutés avant le code de production puis observés en échec : absence de la valeur de quantité, de `block.settings.quantity` et des nouvelles compositions. Après implémentation, les trois tests de `quantity-offer-section` passent et le test de publication vérifie les blocs Shopify et l’absence de prix de preview.

## Vérification

- `npx vitest run tests/quantity-offer-section.test.ts tests/shopify-compiler.test.ts tests/section-registry.test.ts`
  - 10 assertions/tests passent, 2 échecs préexistants hors tâche : l’attente CSS `.wf-product__gallery` dans le compilateur et l’attente d’identité brute dans le registre.
- `npm run build:hydrate` passe.

## Correctif de revue — round 2

- Le Liquid d’offre quantité ne contient plus de conditions `if` avec parenthèses; les choix préselectionnés sont résolus avec des conditions Liquid imbriquées valides.
- Le sous-titre et le texte de section sont à nouveau rendus dans la publication Liquid, à parité avec le canvas.
- Le runtime expose `isNativeCheckoutLocked`; ses mises à jour de disponibilité et sa finalisation Ajax préservent le verrou lorsqu’il est actif.
- L’asset publié installe également un garde d’offre mixte : il ajoute le flag `data-wf-native-checkout-locked`, désactive le bouton et le réapplique via `MutationObserver` si un runtime tiers tente de le réactiver.
- Les tests couvrent l’absence de parenthèses dans les tags Liquid, la parité intro, le flag de verrou et sa présence dans l’asset compilé.

## Correctif de revue — round 3

- La publication échappe explicitement `subtitle`, `title` et `text` en Liquid.
- Le Liquid charge désormais `weflo-product-form.js` avec `asset_url`, afin que la synchronisation de variante et le garde d’offre mixte s’exécutent sur la section.
- La classe Liquid porte la variante échappée et le schéma du pack retourne les réglages de section au lieu d’un tableau vide.
- Les tests du fichier compilé vérifient l’échappement, la classe, le script, le garde runtime et les réglages finaux du schéma.
- `npx tsc --noEmit --pretty false` conserve des erreurs préexistantes hors tâche (Canardo, hydration, serveur et un test de variantes) ; aucune erreur ne vise `quantity-offer.ts`.
- `git diff --check` ne signale pas d’erreur de whitespace.

## Correctif de revue

- Le runtime produit synchronise désormais explicitement le `data-wf-variant-id` du radio sélectionné vers le champ Shopify `data-wf-variant-input`; l’extension embarquée dans l’asset publié fait de même après chargement et à chaque changement.
- La migration centrale v2 appelle désormais la migration du pack. Les anciens blocs `offer` deviennent des `offer-tier`, avec conservation de `title`, `text`, `price` et mapping prudent de `subtitle`, quantité, handle et variante.
- Un état unique de sélection choisit le premier palier `preselected` admissible, sinon le premier palier, dans le canvas comme en Liquid. Les blocs non-paliers sont ignorés.
- Les handles sont comparés globalement. Une offre multi-produit montre le même message français dans les deux rendus et désactive radios et ajout panier natif.
- Le Liquid préserve `data-wf-block-id="{{ block.id }}"`; les libellés Shopify de remise sont en français tout en gardant `percentage`, `amount`, `none` comme valeurs stables.

### Vérification du correctif

- Les 6 tests `quantity-offer-section`, les 6 tests `editor-migrate` et les nouvelles assertions du compilateur passent.
- La commande regroupée atteint 20/22 tests; les deux échecs restants sont les mêmes baselines indépendantes du travail (registre et CSS premium global).
- `npm run build:hydrate` passe.

## Correctif de revue — round 4

- Les alertes d’offre multi-produits des rendus Web et Liquid exposent à nouveau la classe `.wf-quantity-offer__app-required`, utilisée par `mixedOfferRuntimeGuardSource` pour maintenir le verrou du checkout natif.
- Le test d’intégration récupère le sélecteur exact depuis le garde runtime puis vérifie que les deux markups rendent la classe correspondante, afin qu’une nouvelle dérive du contrat markup/runtime soit détectée.
- Le test a d’abord échoué sur l’absence de la classe dans le rendu Web, puis les 7 tests `quantity-offer-section` ont passé après le correctif minimal.

### Vérification du correctif round 4

- `npx vitest run tests/quantity-offer-section.test.ts` passe : 7/7.
- `npx vitest run tests/quantity-offer-section.test.ts tests/shopify-compiler.test.ts` atteint 13/14; seul l’échec baseline déjà documenté sur `.wf-product__gallery` reste présent, hors de ce correctif.
