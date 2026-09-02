# Weflo Creative Commerce Suite — Design

**Date:** 2026-09-02

## Objectif

Transformer l’accueil actuel en véritable espace de production e-commerce : navigation explicite, créations toujours prévisualisables, Studio d’images Fal.ai inspiré des outils créatifs professionnels, et éditeur Shopify alimenté par les modèles et sections Weflo existants.

## Périmètre validé

- Interface intégralement en français.
- Studio consacré uniquement aux images.
- Tous les modèles de pages et toutes les sections existantes restent disponibles.
- La clé `FAL_KEY` ne quitte jamais le serveur.
- Les créations restent de vrais documents Weflo compilables en sections Shopify OS 2.0.
- Les archives de thèmes tierces servent uniquement de référence privée de structure et de niveau de finition.

## Architecture de navigation

La barre latérale devient le point d’entrée stable de quatre espaces :

1. **Accueil** — création rapide et dernières créations.
2. **Mes créations** — bibliothèque complète avec recherche, filtres, aperçu et actions.
3. **Studio images** — génération et retouche Fal.ai, historique et insertion dans une page.
4. **Ma boutique** — connexion Shopify, état du thème, destinations de publication.

**Abonnement**, **Parrainage** et **Réglages** restent accessibles dans le groupe secondaire. Le logo Shopify officiel remplace tous les carrés « S » génériques.

## Mes créations

Chaque carte affiche une vraie image extraite du document, son nom, son type, son statut et sa dernière modification. Les actions sont :

- **Aperçu** : ouvre une modale avec iframe, modes ordinateur/mobile et lien plein écran ;
- **Modifier** : ouvre l’éditeur sur le document ;
- **Dupliquer**, **Renommer**, **Copier le lien**, **Supprimer** ;
- **Publier** : ouvre le parcours Shopify et son paywall Pro si nécessaire.

Une création sans image utilise une couverture typographique cohérente, jamais un bloc vide.

## Studio images

### Modèles

- **Flux Kontext Pro** — photographie produit et retouche fidèle à une référence ;
- **Flux Kontext Max** — composition premium et meilleure adhérence au prompt ;
- **Ideogram V3** — visuels publicitaires contenant du texte ;
- **Recraft V3** — illustrations, identité de marque et graphismes.

Les endpoints Fal.ai sont choisis côté serveur. Une image de référence bascule vers l’endpoint image-to-image compatible. Le prompt serveur rappelle de conserver le produit exact pour les retouches e-commerce.

### Interface

Le Studio utilise trois zones : historique de conversations à gauche, canevas de résultats au centre, panneau modèle/format/référence à droite. Le compositeur reste visible en bas. Formats : carré, paysage 4:3, paysage 16:9, portrait 4:3 et story 9:16. Une génération produit de une à quatre variantes.

Chaque résultat permet : télécharger, réutiliser comme référence, créer une variation et **Ajouter à une page**. Cette dernière action choisit une création puis envoie l’URL à l’éditeur, qui ouvre le sélecteur de section et applique l’image au champ média choisi.

### Données

`ImageGeneration` contient `id`, `workspaceId`, `userId`, `model`, `prompt`, `aspectRatio`, `referenceUrl`, `images`, `status`, `createdAt`. Le dépôt mémoire sert les tests ; PostgreSQL conserve l’historique du compte.

## Ma boutique

La page présente l’état Shopify, le domaine, les thèmes disponibles et les trois stratégies existantes : thème actif, copie sécurisée, nouveau thème Weflo. La publication reste soumise au plan Pro et envoie directement vers Whop si le compte n’est pas éligible.

## Qualité Shopify

La génération part de la vérité produit et de la direction artistique existantes, puis sélectionne une recette de sections propre à la catégorie. Les modèles HTML déjà extraits restent des références visuelles ; ils sont reconstruits en composants éditables, jamais affichés comme une longue image. Chaque section conserve son schéma Shopify, ses réglages, ses blocs, ses états vides et son comportement responsive.

Le contrôle qualité refuse un thème lorsque : le produit principal est absent, les médias sont vides, plusieurs sections répètent le même message, un fichier Liquid/JSON est invalide, ou une section référencée manque.

## Direction visuelle

- Fond `#f7f7f4`, surfaces `#ffffff`, encre `#141310`, texte secondaire `#6f6c65`.
- Jaune Weflo `#fbc531`, vert Shopify `#95bf47`, vert sombre `#004c3f`.
- Syne pour les titres courts ; Inter pour les contrôles et textes.
- Le Studio devient la zone mémorable : canevas sombre, résultats généreux, contrôles compacts et précis.
- Les autres pages restent claires, opérationnelles et sans cartes décoratives répétitives.

## Erreurs et sécurité

- Toutes les API renvoient du JSON, y compris les erreurs Fal.ai.
- Les URLs et data URLs images sont validées ; taille maximale 20 Mo.
- La clé Fal.ai est lue depuis `FAL_KEY` côté serveur seulement.
- Les générations appartiennent au workspace authentifié.
- L’interface conserve le prompt en cas d’échec et propose de relancer.

## Validation

- Tests unitaires des modèles, du client Fal, des routes, des dépôts et des commandes d’insertion.
- Tests de contrat HTML pour les quatre espaces.
- Recette navigateur desktop et mobile : navigation, aperçu, génération, historique, insertion et publication.
- Compilation TypeScript, build Vercel, suite Vitest complète et contrôle production.
