# Weflo — parcours par format et véritable builder Shopify

Date : 2 septembre 2026  
Statut : proposition à valider

## Problème

Le choix d’un format ne modifie aujourd’hui que quelques libellés. Une page d’accueil, un advertorial ou un quiz retombent sur le même écran générique « importe un produit ». L’éditeur sait stocker et déplacer des sections, mais l’expérience visible reste pauvre : petites cartes, rendu générique, drag-and-drop peu lisible et modèles qui ne ressemblent pas à un vrai thème Shopify.

Le résultat attendu est double :

1. chaque format possède un parcours de création cohérent ;
2. le résultat s’ouvre dans un builder visuel où chaque élément reste une vraie section Shopify éditable, déplaçable et publiable.

## Principes

- Un modèle est une recette structurée, jamais une capture d’écran ni un bloc HTML opaque.
- Une section Weflo possède un schéma de réglages, des blocs, un rendu web et un rendu Liquid Shopify.
- Les données fictives servent uniquement aux previews. Elles ne sont jamais persistées dans la page du client.
- Le thème Minimog fourni sert de référence et de matière source pour les structures, variantes et comportements. Weflo conserve son propre modèle de données afin de pouvoir publier vers un thème neuf ou intégrer une page à un thème Shopify existant.
- Le canvas, la liste de sections et l’export Shopify manipulent la même structure de document.

## Parcours de création

### 1. Sélection du format

Le dashboard affiche un bouton principal « Nouvelle page ». Il ouvre un sélecteur visuel avec huit formats :

- Boutique complète
- Page produit
- Landing page
- Advertorial
- Quiz & funnel
- Page d’accueil
- Article de blog
- Page vierge

Chaque format possède une illustration, une description, les pages produites et un exemple ouvrable en grand.

### 2. Galerie de modèles adaptée

Après le format, Weflo montre uniquement les modèles compatibles. Les previews utilisent un produit et une marque fictifs cohérents. Chaque carte indique le style, les sections incluses, le comportement mobile et l’objectif de conversion.

Première bibliothèque :

| Format | Modèles initiaux | Structure principale |
|---|---|---|
| Boutique complète | Editorial commerce, Conversion moderne, Maison premium | accueil, produit, collections, navigation, footer |
| Page produit | Buy box premium, Démonstration produit, Bundle-first | galerie, variantes, prix, offre, preuves, FAQ, sticky ATC |
| Landing page | Direct response, Editorial premium, Démonstration visuelle | hero, douleur, mécanisme, bénéfices, preuves, offre, CTA |
| Advertorial | Journal, Témoignage fondateur, Comparatif | article, auteur, preuves, produit, CTA |
| Quiz & funnel | Diagnostic, Routine, Recommandation | questions, logique, résultat, capture, produit |
| Page d’accueil | Brand editorial, Catalogue premium, Story-first | navigation, hero, collections, produits, histoire, newsletter |
| Article de blog | Magazine, Guide, Étude | article, sommaire, médias, produits liés |
| Page vierge | Aucun modèle imposé | document vide avec ajout de section |

### 3. Questions propres au format

- Boutique complète : activité, positionnement, collections, nombre de produits, identité et objectifs.
- Page produit : lien/image/Shopify, bénéfices, objections, offre, variantes et preuves disponibles.
- Landing page : campagne, audience, promesse, source du trafic et CTA.
- Advertorial : angle narratif, auteur, niveau de preuve et produit final.
- Quiz : objectif, nombre d’étapes, segments, recommandations et destination des réponses.
- Page d’accueil : activité, collections, histoire, promesse, navigation et identité de marque. Elle ne demande pas obligatoirement un lien produit.
- Blog : sujet, intention de recherche, angle et produits liés.
- Page vierge : aucune question ; ouverture directe de l’éditeur.

Les réponses et le modèle choisi alimentent la recette de génération. Canardo adapte les textes et les réglages, mais ne change pas arbitrairement de format.

## Bibliothèque de vraies sections Shopify

### Source Minimog

Le fichier fourni contient notamment `main-product`, `slider`, `banner-with-slider`, `featured-collection`, `collection-showcase`, `image-with-text`, `video-hero`, `lookbook`, `hotspots-image`, `product-bundles`, `testimonials`, `collapsible-tabs`, `countdown-timer`, `newsletter`, `header` et `footer`.

Ces familles deviennent des définitions Weflo normalisées. Chaque définition fournit :

- un identifiant stable ;
- une catégorie et des variantes visuelles ;
- un schéma de réglages typés ;
- des blocs imbriqués réordonnables ;
- des valeurs par défaut sûres ;
- un rendu preview responsive ;
- un compilateur Liquid et un schema Shopify ;
- les dépendances éventuelles en assets CSS/JS.

### Première vague de portage

1. Header et barre d’annonce
2. Hero image, hero vidéo et banner slider
3. Featured collection et collection showcase
4. Main product et featured product
5. Image with text, multi-image et comparison
6. Benefits/icon boxes et rich text
7. Product bundles, countdown et promotion
8. Testimonials, reviews et press logos
9. FAQ/collapsible tabs
10. Newsletter, footer et sticky add-to-cart

Chaque famille reçoit plusieurs compositions réellement différentes, construites à partir des patterns du thème fourni et des variantes Weflo déjà créées.

## Builder visuel

### Structure générale

- Barre supérieure : nom de page, undo/redo, breakpoint, aperçu, publier.
- Colonne gauche : arbre des sections et blocs, recherche, bouton « Ajouter une section ».
- Canvas central : page rendue à sa vraie largeur, zoom, desktop/tablette/mobile.
- Inspecteur droit contextuel : contenu, médias, mise en page, couleurs, typographie, animations et réglages Shopify.
- Canardo reste disponible comme commande globale ou contextuelle sur la section sélectionnée.

### Drag-and-drop

- Une poignée visible apparaît au survol de chaque section dans le canvas et dans l’arbre.
- Le déplacement montre une copie fantôme et une ligne d’insertion pleine largeur.
- Le canvas défile automatiquement quand la souris approche du haut ou du bas.
- Le drop est annulable avec `Échap` et suivi par undo/redo.
- Les blocs internes (slides, témoignages, icônes, FAQ, produits) utilisent le même système dans leur section.
- Le clavier permet aussi de déplacer une section vers le haut ou le bas.
- Les sections verrouillées ne sont ni supprimables ni déplaçables.

### Manipulation directe

- Clic sur un texte : édition directe avec barre typographique.
- Clic sur une image : remplacer, recadrer, générer ou modifier avec l’IA.
- Clic sur un bouton : libellé, lien, style et action Shopify.
- Clic sur une galerie/slider : ajouter, retirer, réordonner les slides et régler autoplay/navigation.
- Clic sur une section : dupliquer, masquer, supprimer, déplacer et ouvrir ses réglages.

### Catalogue de sections

Le catalogue occupe un véritable panneau large, pas une petite liste. Il propose :

- recherche et catégories ;
- grandes previews desktop/mobile ;
- changement de produit fictif ;
- aperçu interactif en contexte ;
- variantes issues du thème fourni ;
- insertion en un clic à la position de drop courante.

## Modèle de données

Le document existant reste la source de vérité, avec les extensions suivantes :

- `templateId` et `templateVersion` sur le document ;
- `variant` et `shopifyType` sur chaque section ;
- réglages responsive typés par breakpoint ;
- blocs hiérarchiques avec ordre stable ;
- métadonnées de dépendances Shopify ;
- provenance d’un réglage (`user`, `import`, `ai`, `template`) pour éviter qu’une régénération écrase les modifications manuelles.

Toutes les opérations du builder passent par des commandes transactionnelles : ajouter, déplacer, dupliquer, supprimer, modifier un réglage, ajouter/déplacer un bloc. Chaque commande produit une entrée d’historique et déclenche l’autosave.

## Génération et compilation Shopify

La recette choisie crée un document Weflo composé de sections réelles. Le compilateur génère :

- les fichiers Liquid nécessaires ;
- les schemas de réglages Shopify ;
- le template JSON correspondant au format ;
- les assets CSS/JS utilisés par les sections ;
- un manifeste de publication et de retour arrière.

Pour un thème existant, Weflo crée des sections préfixées et un template isolé afin de limiter les collisions. Pour une boutique complète, Weflo peut produire un thème séparé avant publication. Le choix final reste dans la fenêtre de publication.

## Préviews et qualité visuelle

- Chaque variante possède une capture desktop et mobile générée automatiquement.
- Les previews utilisent six à huit marques fictives couvrant beauté, maison, mode, sport, food et électronique.
- Le pipeline vérifie débordements, images manquantes, contraste, contrôles sans nom et dimensions minimales.
- Une revue visuelle compare le rendu editor, preview web et Liquid Shopify sur un jeu de recettes de référence.

## Gestion des erreurs

- Un import incomplet conserve les réponses et permet de remplacer la source.
- Une section dont les données sont absentes affiche dans l’éditeur un état guidé, jamais un faux avis ou un faux chiffre.
- Un échec de génération d’image ne bloque pas la création du document.
- Un drop invalide restaure la position précédente.
- Une compilation Shopify invalide bloque la publication et affiche le fichier et la section responsables.

## Tests

- Tests unitaires des recettes propres à chaque format.
- Tests de contrat pour tous les schemas de sections.
- Tests de commandes et d’historique du drag-and-drop.
- Tests navigateur desktop/mobile du sélecteur, du catalogue et du canvas.
- Tests anti-fuite des fixtures fictives.
- Tests de compilation Liquid/JSON avec validation Shopify.
- Tests de publication vers thème neuf, copie du thème actif et thème actif.
- Captures de référence pour chaque section et chaque modèle complet.

## Découpage de livraison

### Phase 1 — parcours et modèles

Sélecteur « Nouvelle page », galeries propres à chaque format, questionnaires adaptés et recettes initiales.

### Phase 2 — moteur de sections Shopify

Portage des vingt familles prioritaires depuis Minimog, schemas typés, preview et compilation Liquid.

### Phase 3 — builder visuel

Nouvelle disposition, drag-and-drop robuste, blocs imbriqués, inspecteur complet et manipulation directe.

### Phase 4 — publication et durcissement

Parité preview/Shopify, validation, rollback, tests end-to-end et optimisation mobile/performance.

## Définition de terminé

- Choisir « Page d’accueil » ne montre plus le parcours d’import d’une page produit.
- Chaque format propose au moins trois vrais modèles distincts.
- Un modèle produit uniquement des sections structurées et éditables.
- Les sections et leurs blocs se déplacent réellement à la souris et au clavier.
- Les textes, images, polices, couleurs, sliders, produits, bundles et CTA sont modifiables.
- Le rendu desktop/mobile ne déborde pas et ressemble à la preview du catalogue.
- La publication génère un template Shopify valide et réversible.
- Aucune donnée fictive n’atteint une boutique client.

## Hors périmètre initial

- Réimplémenter toutes les applications tierces propriétaires utilisées par Minimog.
- Garantir une compatibilité automatique avec chaque application Shopify du marché.
- Copier aveuglément tous les assets du thème ; seules les sections nécessaires et leurs dépendances explicites sont portées.
