# Système d’aperçus de sections Weflo

Date : 2 septembre 2026  
Statut : proposition validée oralement, en attente de validation de la spécification

## Objectif

Permettre à un utilisateur de parcourir chaque section Shopify Weflo avec un aperçu immédiatement lisible, premium et fidèle au résultat final. Chaque aperçu doit utiliser un produit fictif cohérent, être disponible en bureau et mobile, puis pouvoir être ouvert dans une démonstration interactive avant insertion dans la page.

Le système ne doit pas afficher une simple image décorative. L’aperçu doit être rendu à partir du même composant, du même schéma et du même moteur que la section insérée dans l’éditeur et exportée vers Shopify.

## Expérience utilisateur

### Catalogue

Le panneau « Ajouter une section » affiche des catégories commerciales : Hero, Produit, Bénéfices, Résultats, Mode d’emploi, Avant/après, Avis, Comparaison, FAQ, Garanties, Offres, Bundles, Histoire de marque, Collections, Navigation et pied de page.

Chaque carte contient :

- une capture de la variante avec un produit fictif ;
- le nom de la variante et son objectif de conversion ;
- les univers compatibles ;
- des boutons Bureau et Mobile ;
- une action « Voir en grand » ;
- une action « Ajouter à la page ».

Le survol peut faire défiler une capture longue, mais il ne remplace jamais l’aperçu interactif.

### Aperçu interactif

« Voir en grand » ouvre une fenêtre couvrant l’espace de travail. Elle rend la vraie section dans un document isolé, sans les contrôles de l’éditeur. L’utilisateur peut :

- passer du bureau au mobile ;
- choisir une des six marques fictives compatibles ;
- afficher la section seule ou avec une section précédente et suivante servant de contexte ;
- tester les interactions réelles : variantes, carrousel, bundle, accordéon et boutons ;
- insérer directement la variante sélectionnée.

### Après insertion

Les données fictives ne sont jamais enregistrées dans la page du client. À l’insertion, le moteur résout les champs dans cet ordre : produit actuel, identité de marque actuelle, contenu généré par Canardo, puis valeurs de repli sûres. Les réglages de présentation propres à la variante sont conservés.

## Marques et produits fictifs

La première version contient six ensembles de données éditoriaux et visuels :

| Identité | Produit | Univers principal |
| --- | --- | --- |
| Auréa | Sérum visage premium | Beauté et soin |
| Halo | Lampe murale magnétique | Maison et gadget |
| Noma | Sac de voyage | Mode et accessoires |
| Pulse | Complément de récupération | Sport et bien-être |
| Brume | Café artisanal | Café et épicerie |
| Forma | Objet de table design | Maison et design |

Chaque ensemble fournit des données crédibles mais explicitement fictives : nom, promesse, prix, variantes, bénéfices, objections, FAQ, avis de démonstration, garanties, bundles et médias aux formats attendus. Les avis fictifs ne doivent jamais être publiés tels quels dans une boutique cliente ; ils sont réservés au mode démonstration.

## Architecture

### Manifeste d’aperçu

Chaque variante de section possède un manifeste indépendant du rendu :

```ts
type SectionPreviewManifest = {
  sectionType: string;
  variantId: string;
  title: string;
  conversionGoal: string;
  supportedArchetypes: string[];
  defaultFixtureId: string;
  compatibleFixtureIds: string[];
  previewDesktop: string;
  previewMobile: string;
  previewVersion: number;
};
```

Le registre refuse une variante sans manifeste complet, sans fixture valide ou sans moteur de rendu Web et Liquid.

### Registre de fixtures

Le registre des fixtures contient les six produits sous forme structurée. Il ne dépend ni du DOM ni de l’éditeur. Une fonction pure transforme une fixture en données de section selon son type. Cela évite de dupliquer les exemples dans chaque composant.

### Document de démonstration

Le générateur crée un petit document Weflo temporaire contenant :

1. les jetons de marque de la fixture ;
2. éventuellement une navigation contextuelle ;
3. la section et sa variante ;
4. éventuellement une section de contexte ;
5. aucune donnée persistante de l’utilisateur.

Ce document passe dans `renderEditorDocument` comme une vraie page. Le rendu interactif et le rendu de capture utilisent donc le même chemin.

### Génération des captures

Un script déterministe parcourt les manifestes, rend chaque document de démonstration dans un navigateur headless et produit :

- une capture WebP bureau en 1440 px ;
- une capture WebP mobile en 390 px ;
- une empreinte du manifeste, de la fixture et du rendu.

Une capture n’est régénérée que si cette empreinte change. Les fichiers sont publiés sous `/assets/section-previews/<type>/<variant>-<fixture>-<viewport>.webp`.

Le catalogue charge d’abord ces images légères. Le rendu interactif n’est créé qu’à l’ouverture de la grande prévisualisation.

### Adaptation au produit client

Une fonction pure `materializeSectionVariant` reçoit la variante, le document client et le produit courant. Elle remplace tous les champs de démonstration par les valeurs réelles sans modifier les règles de composition. Si un média ou un champ indispensable manque, elle emploie un placeholder neutre et signale le champ dans l’inspecteur au lieu d’inventer une preuve commerciale.

## Contrôles qualité

La génération échoue pour une variante si :

- une ressource est cassée ;
- du contenu déborde horizontalement en bureau ou mobile ;
- un élément interactif essentiel est inaccessible au clavier ;
- les textes essentiels ne respectent pas le contraste minimal ;
- les captures sont vides ou trop différentes du rendu de référence ;
- un champ fictif interdit apparaît dans un document client après insertion ;
- le rendu Web et le schéma Shopify divergent sur les réglages disponibles.

Les captures servent aussi de références de régression visuelle. Une modification importante doit être acceptée explicitement au lieu d’écraser silencieusement les références.

## Gestion des erreurs

- Si une capture manque, la carte rend la section en mode compact dans une iframe isolée.
- Si le rendu interactif échoue, la capture statique reste visible et l’utilisateur peut réessayer.
- Si une fixture est incompatible, elle n’est pas proposée.
- Si le produit client est incomplet, l’insertion réussit avec des placeholders signalés dans l’éditeur.
- Une erreur sur une variante ne bloque pas le reste du catalogue.

## Protection du système

Les fixtures publiques ne constituent pas l’avantage propriétaire. Les règles de sélection, la notation visuelle, les recettes de composition et la transformation du produit restent côté serveur. Les manifestes de composants sont versionnés et les exports Shopify ne contiennent que le Liquid, le schéma et les ressources nécessaires au thème.

Les créations fictives doivent utiliser des marques et médias licenciés ou produits spécifiquement pour Weflo. Aucun code, texte, média ou composition identifiable provenant du thème Minimog ne doit être copié. Minimog sert uniquement de référence de niveau de finition et de couverture fonctionnelle.

## Première livraison

La première livraison couvre :

- le registre des fixtures ;
- le manifeste d’aperçu ;
- les aperçus bureau et mobile ;
- la fenêtre interactive ;
- l’insertion avec remplacement des données fictives ;
- la génération automatique des captures ;
- les contrôles fonctionnels et visuels principaux ;
- au moins douze variantes réparties entre Hero, Produit, Bénéfices, Avis, Bundle et FAQ.

Les trente variantes du Theme Kernel restent l’objectif suivant. Le premier lot réduit volontairement le volume afin de valider la qualité du pipeline avant son extension.

## Critères d’acceptation

1. Chaque variante livrée possède une capture bureau et mobile montrant un produit fictif cohérent.
2. Le clic ouvre la vraie section interactive et permet de changer de format.
3. L’utilisateur peut changer de fixture parmi celles compatibles.
4. L’insertion reprend le produit et l’identité de marque du document courant.
5. Aucune donnée fictive interdite n’est persistée dans une page cliente.
6. Une modification d’une section peut régénérer uniquement les captures concernées.
7. Les vérifications détectent images cassées, débordements mobiles et divergences de schéma.
8. Le catalogue reste rapide grâce au chargement initial des captures statiques.

