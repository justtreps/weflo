# Weflo — générateur IA de boutiques Minimog

Date : 2026-09-03  
Statut : conception proposée pour validation finale

## 1. Décision produit

Weflo devient d’abord un générateur de boutiques Shopify professionnelles, alimenté par l’IA, plutôt qu’un constructeur HTML libre. Minimog 6.0.0, fourni par l’utilisateur et couvert par son autorisation d’utilisation, devient le moteur de thème de référence.

L’IA ne génère pas directement du HTML, du CSS ou du Liquid. Elle analyse un produit, choisit des sections Minimog autorisées, puis produit une configuration structurée et validée. Weflo assemble cette configuration en templates JSON Shopify et conserve les fichiers Liquid, snippets, assets et scripts nécessaires au fonctionnement du thème.

## 2. Périmètre de la reconstruction

### À remplacer

- Le Blueprint v1, qui ne sait pas transporter les blocs internes des sections.
- Le renderer générique qui réduit de nombreuses sections à un titre, une grille et un bouton.
- Le catalogue de sections factices dont l’aperçu ne correspond pas au résultat inséré.
- Le parcours de création fragmenté et les transitions implicites vers l’onboarding.
- Les documents de démonstration qui affichent des placeholders comme s’ils étaient terminés.
- Les exports Shopify Weflo génériques pour les pages construites avec le pack Minimog.

### À conserver

- Authentification et sessions.
- Espaces de travail et données utilisateur.
- Facturation Whop et crédits.
- Connexion Shopify et catalogue produit.
- Import de produit par URL ou image.
- Intégration OpenAI.
- Studio d’images FAL.ai.
- Stockage PostgreSQL/Supabase.
- Historique des créations, avec migration explicite des documents compatibles.

Aucune suppression globale du dépôt ou des données de production n’est autorisée. Les anciens modules sont retirés uniquement lorsqu’un remplacement fonctionnel existe et que les migrations ont été validées.

## 3. Architecture cible

```text
Source produit
  -> fiche produit normalisée
  -> analyse commerciale et direction artistique
  -> génération OpenAI StoreBlueprintV2
  -> validation Zod stricte
  -> résolution des sections Minimog et de leurs dépendances
  -> document Weflo éditable
  -> aperçu rapide Weflo
  -> template JSON + thème Minimog Shopify
  -> aperçu Shopify non publié / publication
```

### 3.1 Pack de thème Minimog

Le thème est importé comme pack versionné et privé :

```text
theme-packs/minimog/6.0.0/
  manifest.json
  sections/
  snippets/
  assets/
  templates/
  layout/
  locales/
  config/
```

Le manifeste contient pour chaque section :

- le fichier Liquid source ;
- le schéma Shopify extrait ;
- les snippets et assets requis ;
- les types de pages compatibles ;
- les capacités nécessaires ;
- les variantes reconnues ;
- une fixture de prévisualisation ;
- une miniature desktop et mobile ;
- la version du pack.

Un analyseur statique construit le graphe de dépendances à partir des appels `render`, des assets et des références connues. L’export copie la fermeture complète des dépendances, pas seulement le fichier de section.

### 3.2 StoreBlueprintV2

Le nouveau Blueprint est le contrat unique entre OpenAI, l’éditeur et Shopify.

```ts
type StoreBlueprintV2 = {
  version: 2;
  themePack: { id: "minimog"; version: "6.0.0" };
  store: {
    name: string;
    language: string;
    market: string;
    currency: string;
  };
  design: {
    preset: string;
    palette: string[];
    headingFont: string;
    bodyFont: string;
    density: "compact" | "balanced" | "editorial";
  };
  pages: Array<{
    id: string;
    kind: "home" | "product" | "landing" | "advertorial" | "quiz";
    title: string;
    handle: string;
    sections: Array<{
      id: string;
      type: string;
      settings: Record<string, unknown>;
      blocks: Array<{
        id: string;
        type: string;
        settings: Record<string, unknown>;
      }>;
      productBinding?: string;
    }>;
  }>;
};
```

Le schéma Zod est dérivé des schémas Shopify du pack. OpenAI utilise Structured Outputs avec `strict: true`. Une section inconnue, un réglage invalide ou un bloc non autorisé provoque un rejet avant modification du projet.

### 3.3 Génération IA

La génération s’effectue en étapes observables :

1. Normalisation du produit et des médias.
2. Extraction des faits vérifiables.
3. Proposition de trois directions commerciales.
4. Choix ou validation par l’utilisateur.
5. Composition de la page avec des sections autorisées.
6. Rédaction des réglages et blocs de chaque section.
7. Sélection des images existantes.
8. Génération FAL.ai des visuels manquants.
9. Validation du Blueprint.
10. Rendu et sauvegarde atomique.

L’interface affiche la progression réelle. Une étape n’est cochée que lorsque son résultat a été persisté. En cas d’échec, l’utilisateur peut reprendre à la dernière étape valide.

### 3.4 Bibliothèque initiale

Le premier pack exposé dans Weflo comprend :

- `header`
- `annoucement`
- `main-product`
- `product-bundles`
- `featured-collection`
- `featured-product-slider`
- `image-with-text`
- `image-with-text-1`
- `image-with-text-2`
- `multiple-image-with-text`
- `image-comparison`
- `testimonials`
- `product-tabs`
- `collapsible-tabs`
- `lookbook`
- `video-hero`
- `banner-with-slider`
- `countdown-timer`
- `product-recommendations`
- `newsletter`
- `footer`

Une section est publiée dans le catalogue seulement si son aperçu, son schéma, ses dépendances et son export Shopify sont opérationnels.

## 4. Expérience de création

### 4.1 Nouveau parcours

1. Choisir le type de page.
2. Importer un lien, une image, un produit Shopify ou une description.
3. Corriger la fiche produit détectée.
4. Répondre à quatre décisions maximum : cible, promesse, offre et direction visuelle.
5. Comparer trois propositions complètes avec aperçu.
6. Lancer la génération.
7. Voir la page se construire section par section.
8. Arriver dans l’éditeur sur une page entièrement remplie.

Une page vierge contourne toutes les questions et ouvre un document vide. Une création lancée depuis le tableau de bord ne retourne jamais dans l’onboarding initial du compte.

### 4.2 Éditeur

L’éditeur manipule la structure Shopify réelle :

- panneau gauche : pages, sections et blocs imbriqués ;
- canvas central : aperçu sélectionnable et responsive ;
- panneau droit : contrôles générés depuis le schéma Liquid ;
- déplacement des sections et blocs par glisser-déposer ;
- duplication, masquage, verrouillage et suppression ;
- remplacement d’une section par une autre compatible ;
- régénération IA d’un texte, d’une image ou d’une section ;
- historique annuler/rétablir ;
- sauvegarde automatique versionnée.

Le premier jalon n’inclut pas le positionnement pixel libre de Replo. Il reproduit son niveau de qualité et de simplicité avec des sections Shopify structurées, ce qui garantit un export maintenable.

## 5. Prévisualisation

### Aperçu rapide

Un renderer Weflo présente la structure de chaque section avec les mêmes réglages et données que Shopify. Les fixtures ne sont utilisées que dans le catalogue ; lors de l’insertion, elles sont remplacées par le produit réel ou clairement marquées comme contenu de démonstration.

### Aperçu exact

Après connexion Shopify, Weflo téléverse une version non publiée du thème et ouvre son URL de prévisualisation. Cet aperçu constitue la référence avant publication.

Une différence structurelle entre l’aperçu rapide et le Liquid exporté est considérée comme une erreur de compilation.

## 6. Export Shopify

L’export produit :

- le pack Minimog complet ou la fermeture de dépendances validée ;
- les templates JSON construits par Weflo ;
- les paramètres et blocs générés ;
- les médias téléversés ;
- un rapport de compatibilité ;
- les avertissements relatifs aux applications externes requises.

Les bundles simples basés sur quantité peuvent utiliser le panier Shopify natif. Les bundles personnalisables, abonnements ou fonctionnalités FoxKit restent désactivés tant que l’application nécessaire n’est pas connectée. Weflo ne présente jamais une capacité simulée comme fonctionnelle.

## 7. Modèle de données et migrations

Chaque projet conserve :

- le Blueprint versionné ;
- la version du pack de thème ;
- les réponses du parcours ;
- la fiche produit source ;
- les générations d’images ;
- les révisions du document ;
- l’état de publication Shopify.

Les documents v1 restent consultables. Une migration v1 vers v2 est proposée uniquement si les types de sections peuvent être associés sans perte. Dans le cas contraire, Weflo propose de régénérer la page à partir du produit source. Aucun document existant n’est remplacé silencieusement.

## 8. Gestion des erreurs

- Chaque appel externe possède un délai maximal et un message en français.
- Une réponse OpenAI non conforme est rejetée sans écraser le document.
- Une image FAL.ai en échec peut être relancée indépendamment.
- Une dépendance Minimog manquante bloque l’export et identifie le fichier concerné.
- Une section nécessitant une application Shopify affiche son statut avant insertion.
- La génération est idempotente : relancer une étape ne crée pas de page en double.
- Les erreurs serveur renvoient toujours du JSON afin d’éviter `Unexpected token 'I'`.

## 9. Validation et qualité

### Tests automatisés

- Validation exhaustive du StoreBlueprintV2.
- Extraction des schémas Minimog.
- Résolution du graphe de dépendances.
- Matérialisation de sections avec réglages et blocs.
- Correspondance entre document Weflo et template JSON Shopify.
- Bundles, variantes et ajout au panier.
- Navigation complète du nouveau parcours.
- Reprise après échec de génération.
- Non-régression sur auth, facturation et projets existants.
- Captures Playwright desktop et mobile pour chaque section publiée.

### Conditions d’acceptation du premier jalon

- Un produit importé génère une page produit de 8 à 12 sections remplies.
- La page ne contient aucun placeholder non signalé.
- Chaque section peut être déplacée, dupliquée, masquée et supprimée.
- Les réglages et blocs principaux sont modifiables.
- Les variantes produit et l’ajout au panier fonctionnent sur Shopify.
- L’export s’installe sur une boutique de test sans fichier manquant.
- L’aperçu exact Shopify correspond au template publié.
- Une erreur à n’importe quelle étape ne détruit pas la dernière version valide.

## 10. Séquence de reconstruction

1. Importer et versionner le pack Minimog sans modifier son comportement.
2. Construire l’extracteur de schémas et le graphe de dépendances.
3. Introduire StoreBlueprintV2 et sa validation.
4. Générer une page produit complète à partir d’un fixture réel.
5. Produire un export Shopify installable et le valider sur une boutique de test.
6. Remplacer le parcours de création par le flux simplifié.
7. Brancher OpenAI et FAL.ai sur le BlueprintV2.
8. Remplacer progressivement le catalogue et le canvas existants.
9. Ajouter les migrations v1 et supprimer les modules remplacés.
10. Étendre aux pages d’accueil, landing pages, advertorials et quiz.

Le premier jalon s’arrête à la page produit générée, éditable et exportable. Les autres formats utilisent ensuite le même moteur au lieu de créer de nouveaux systèmes parallèles.

