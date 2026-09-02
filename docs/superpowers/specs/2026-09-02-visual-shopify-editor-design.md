# Éditeur visuel Shopify Weflo — Spécification de conception

## 1. Problème

L’éditeur affiche actuellement certains modèles comme des captures statiques. Leur apparence est fidèle aux maquettes d’origine, mais leur contenu n’est ni sélectionnable ni éditable section par section. Le canvas peut aussi adopter une largeur mobile au milieu d’un grand espace vide, tandis que les panneaux flottants recouvrent la page et que plusieurs boutons latéraux n’ont pas de comportement complet.

Weflo doit transformer ces modèles en véritables documents web structurés, permettre leur modification visuelle ou par Canardo, puis produire soit une page hébergée, soit des sections et templates Shopify compatibles avec un thème nouveau ou existant.

## 2. Objectifs

- Transformer les 18 modèles de référence en pages réelles, responsives et modifiables sans perdre leurs images, leur composition ni leur direction artistique.
- Permettre de construire une page complète depuis zéro avec des sections réutilisables.
- Rendre fonctionnels la sélection, l’édition, l’ajout, le déplacement, la duplication, le masquage, le verrouillage et la suppression des sections et blocs.
- Permettre à Canardo de créer ou modifier toute section compatible avec le document Weflo, y compris une section de code personnalisée.
- Publier une page hébergée ou l’intégrer à Shopify avec un choix explicite de destination et sans surprise destructive.
- Garantir que l’aperçu Weflo et le résultat Shopify restent visuellement cohérents sur ordinateur, tablette et mobile.

## 3. Décisions produit

### 3.1 Document structuré comme source de vérité

Une capture ne sera jamais la source d’une page éditable. Chaque page repose sur un document versionné contenant :

- les métadonnées de la page ;
- les tokens de marque ;
- une liste ordonnée de sections ;
- pour chaque section, une liste ordonnée de blocs ;
- les réglages de contenu, de style, de disposition et de visibilité responsive ;
- les liaisons éventuelles aux produits, variantes, collections et menus Shopify ;
- les éventuels fragments de code personnalisés validés.

Les captures originales restent les références visuelles de la galerie. Les documents des modèles sont reconstruits avec les mêmes ressources, proportions et directions artistiques.

### 3.2 Édition visuelle et code libre contrôlé

La majorité des pages utilise des sections typées. Pour les besoins hors catalogue, une section `customCode` accepte du HTML, du CSS et du JavaScript local. Son exécution est isolée dans l’aperçu, son code est sauvegardé dans le document et sa publication Shopify passe par un convertisseur dédié.

Le code personnalisé ne peut pas accéder à l’interface Weflo, aux cookies d’authentification ou aux secrets Shopify. Les scripts externes et domaines distants sont refusés par défaut, avec une liste d’autorisation explicite au niveau du workspace.

### 3.3 Publication Shopify choisie à chaque opération

Après vérification de l’abonnement Pro et de la connexion Shopify, la fenêtre de publication propose :

1. **Thème actif** : modifier directement le thème actuellement publié, après confirmation explicite et création d’une sauvegarde Weflo des fichiers remplacés.
2. **Copie du thème actif** : dupliquer le thème, appliquer la page à la copie et fournir un lien d’aperçu Shopify.
3. **Nouveau thème Weflo** : créer un thème indépendant à partir des composants Weflo.

Le choix est mémorisé pour la page, mais reste modifiable à chaque publication. Une page simple peut être ajoutée à un thème existant sans remplacer sa page d’accueil ni son template produit global.

## 4. Architecture du document

Le `PageDocument` évolue vers une version 2 migrable :

```ts
type EditorDocument = {
  version: 2;
  name: string;
  path: string;
  kind: "landing" | "product" | "collection" | "home";
  modelId?: string;
  theme: BrandTokens;
  pages: EditorPage[];
  assets: AssetReference[];
  shopify?: ShopifyBindings;
};

type EditorPage = {
  id: string;
  name: string;
  slug: string;
  sections: EditorSection[];
};

type EditorSection = {
  id: string;
  type: SectionType;
  name: string;
  hidden: boolean;
  locked: boolean;
  settings: Record<string, SettingValue>;
  style: StyleSettings;
  responsive: ResponsiveSettings;
  blocks: EditorBlock[];
};
```

Toutes les commandes d’édition utilisent des opérations déterministes (`insertSection`, `moveSection`, `updateSetting`, `duplicateSection`, etc.). Les mêmes opérations alimentent l’historique annuler/refaire, l’autosauvegarde, les tests et Canardo.

Une migration ouvre les anciens documents sans perte. Les documents utilisant `referencePreviews` sont convertis vers leur vrai modèle structuré au premier chargement ; la capture n’est conservée que comme référence de comparaison.

## 5. Interface de l’éditeur

### 5.1 Barre supérieure

- retour au dashboard et nom de la page ;
- état de sauvegarde ;
- annuler et refaire ;
- modes ordinateur, tablette et mobile ;
- bascule édition/aperçu ;
- ouverture dans un nouvel onglet ;
- bouton Publier avec paywall Pro.

### 5.2 Sidebar gauche

La barre verticale ouvre un seul panneau à la fois :

- **Structure** : arbre pages → sections → blocs, recherche, déplacement et actions contextuelles ;
- **Ajouter** : catalogue de sections par catégorie, recherche et insertion à l’endroit sélectionné ;
- **Calques** : ordre, visibilité, verrouillage et noms internes ;
- **Pages** : ajout, renommage, duplication, brouillon et suppression ;
- **Médias** : téléversement, bibliothèque, remplacement et recadrage ;
- **Commerce** : produits, variantes, collections et menus Shopify.

Le panneau a une largeur stable et redimensionnable. Il ne flotte jamais au-dessus du canvas. Il peut être replié, et cet état est persisté localement.

### 5.3 Canvas

Le canvas occupe tout l’espace restant et centre la largeur de prévisualisation choisie. Il n’affiche jamais une capture mobile dans un viewport bureau. Les breakpoints sont : bureau `1440`, tablette `834`, mobile `390` pixels, avec zoom ajustable.

Chaque section possède un contour uniquement à la sélection ou au survol. Une barre contextuelle permet déplacer, dupliquer, masquer et supprimer. Des points d’insertion apparaissent entre les sections. Le texte peut être édité directement ; les autres propriétés passent par le panneau droit.

Les interactions du site marchand sont neutralisées en mode édition pour éviter une navigation accidentelle, puis réactivées en mode aperçu.

### 5.4 Panneau droit

Le panneau contextuel comprend :

- **Contenu** : textes, médias, liens, produits et blocs ;
- **Style** : couleurs, typographies, bordures, ombres et rayons ;
- **Disposition** : largeur, grille, alignement, espacements et ordre ;
- **Responsive** : valeurs par breakpoint et visibilité ;
- **Animation** : entrée, survol et vitesse avec respect de `prefers-reduced-motion` ;
- **Code** : uniquement pour `customCode` ou les utilisateurs ayant activé le mode avancé.

Les contrôles sont générés depuis un schéma de réglages propre à chaque type de section. Aucun champ spécifique n’est codé en dur dans le grand fichier d’hydratation.

## 6. Bibliothèque de sections

La première version complète inclut :

- navigation et barre d’annonce ;
- hero éditorial, hero produit et hero vidéo ;
- produit principal avec variantes, quantité et ajout au panier ;
- galerie, avant/après, vidéo et image avec texte ;
- bénéfices, caractéristiques, étapes et chiffres clés ;
- produits recommandés et grille de collection ;
- bundle avec choix des produits et remise ;
- comparaison, tableau et ingrédients/composition ;
- témoignages, avis avec notes et logos de presse ;
- garanties, livraison, retours et réassurance ;
- FAQ accordéon ;
- newsletter, formulaire, quiz et CTA ;
- texte riche, séparation, espace et code personnalisé ;
- footer et éléments légaux.

Chaque section propose plusieurs variantes de composition sans devenir un nouveau type. Les blocs répétables sont ajoutables, supprimables et réordonnables. Chaque type possède un renderer Weflo, un schéma d’édition et un renderer Liquid Shopify.

## 7. Reconstruction des modèles

Les 18 modèles sont recréés manuellement à partir des captures et ressources originales. Pour chaque modèle :

- inventaire des sections et blocs visibles ;
- réutilisation exacte des images originales disponibles ;
- tokens propres à la marque ;
- rendu bureau et mobile ;
- comparaison visuelle automatisée avec la référence ;
- validation de l’édition de chaque section ;
- validation du rendu Shopify.

La galerie continue d’utiliser les captures originales afin que le choix initial reste identique. Après sélection, le document structuré remplace immédiatement la capture dans le canvas.

## 8. Canardo et vibecode

Canardo ne renvoie plus un document complet arbitraire. Il renvoie une liste d’opérations validées sur le document courant. Exemples :

- ajouter une section témoignages après le produit ;
- transformer un hero en variante éditoriale ;
- réécrire le contenu sans changer le style ;
- créer un bundle relié à trois variantes Shopify ;
- générer une section personnalisée à partir d’une instruction de vibecode ;
- corriger une section existante sélectionnée dans le canvas.

Avant application, l’éditeur affiche un résumé des opérations importantes. Les changements restent annulables en une action. Une réponse invalide, un code dangereux ou une référence produit inexistante est refusé sans altérer le document.

Canardo reçoit le contexte ciblé : document, section sélectionnée, tokens, catalogue de sections disponible et liaisons Shopify utiles. Il ne reçoit jamais le token Shopify.

## 9. Sauvegarde, historique et collaboration

- Autosauvegarde locale immédiate et serveur après un délai court.
- Indicateurs `Modifié`, `Enregistrement…`, `Enregistré` et `Erreur`.
- Historique annuler/refaire limité aux opérations de la session.
- Version serveur optimiste pour éviter qu’un onglet ancien écrase une version récente.
- Snapshot avant publication et possibilité de restaurer une version publiée.
- Rechargement sans perte de la section sélectionnée et du breakpoint.

## 10. Publication et intégration Shopify

Le compilateur transforme le document en :

- fichiers de sections Liquid ;
- schémas Shopify pour l’éditeur natif ;
- snippets partagés ;
- CSS et JavaScript namespacés par page ;
- template JSON destiné uniquement à la page ou au produit choisi ;
- ressources média téléversées puis référencées par Shopify CDN.

Pour une intégration dans un thème existant, Weflo écrit uniquement les fichiers portant son namespace et le template cible. Le template global du thème n’est remplacé que si l’utilisateur choisit explicitement cette action.

Avant publication directe sur le thème actif, l’interface présente le thème, les fichiers affectés et la destination. En cas d’échec, Weflo restaure les fichiers sauvegardés. La publication renvoie un rapport fichier par fichier et un lien de contrôle.

## 11. Gestion des erreurs

- Une image manquante affiche un remplacement sélectionnable sans casser la mise en page.
- Une section inconnue reste visible sous forme de bloc récupérable et n’est pas supprimée silencieusement.
- Une sauvegarde en conflit propose recharger ou dupliquer la version locale.
- Un échec Canardo conserve le document et la saisie.
- Un échec Shopify indique l’étape et les fichiers concernés puis déclenche la restauration lorsque nécessaire.
- Une largeur insuffisante replie les panneaux au lieu de superposer l’interface.
- Toute action destructive offre une annulation ou une confirmation adaptée à son impact.

## 12. Tests et critères d’acceptation

- Chaque commande d’édition possède des tests unitaires et est réversible.
- Tous les boutons des sidebars déclenchent leur panneau ou une action testée.
- Ajout, déplacement, duplication, masquage, verrouillage et suppression fonctionnent au clavier et à la souris.
- Les champs du panneau droit modifient immédiatement le renderer puis persistent après rechargement.
- Les 18 modèles n’utilisent plus `referencePreviews` comme rendu de page.
- Les rendus bureau, tablette et mobile occupent correctement le canvas sans débordement ni superposition.
- Canardo peut ajouter une section standard et une section personnalisée, avec annulation.
- Le paywall bloque toute publication gratuite côté interface et serveur.
- Les trois stratégies Shopify sont testées, y compris sauvegarde et rollback du thème actif.
- Le template publié s’ouvre dans Shopify sans erreur Liquid et conserve les liaisons produits.
- La suite de tests, le build et les scénarios navigateur passent avant chaque livraison.

## 13. Découpage de livraison

Le chantier sera exécuté en cinq incréments autonomes :

1. **Moteur document et rendu** : schéma v2, commandes, migration, renderer responsive et historique.
2. **Shell de l’éditeur** : canvas, sidebars, panneau droit, sélection et contrôles fonctionnels.
3. **Sections et modèles** : bibliothèque complète puis reconstruction des 18 modèles.
4. **Canardo/vibecode** : génération d’opérations, code personnalisé isolé et annulation.
5. **Shopify** : compilateur Liquid, intégration au thème choisi, sauvegarde, publication et rollback.

Chaque incrément doit rester utilisable et testable avant le suivant. Le chantier ne sera pas considéré terminé si l’apparence est seulement simulée par une image.

## 14. Hors périmètre de cette refonte

- Marketplace publique de thèmes tiers.
- Édition simultanée multi-utilisateur en temps réel.
- Hébergement de scripts externes non approuvés.
- Remplacement de l’éditeur de checkout Shopify.
- Modification automatique d’un thème Shopify sans confirmation de la destination.
