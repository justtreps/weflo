# Galerie de modèles et Canardo dans l’éditeur Weflo

## Objectif

Reconstruire l’état initial de l’éditeur afin qu’un utilisateur puisse démarrer avec l’un des modèles Weflo ou avec une page vierge, voir un aperçu fidèle avant de choisir, puis construire et modifier sa page avec Canardo sans quitter l’éditeur.

Le changement couvre la galerie initiale, le catalogue des modèles, l’application d’un modèle, le document vierge, le rendu de prévisualisation et l’expérience Canardo. Les fonctions de publication, de partage et les panneaux existants restent en place.

## Expérience utilisateur

### Galerie initiale

Une page sans modèle ouvre une galerie centrale lisible, indépendante des panneaux de réglages. Elle contient :

- une carte « Partir d’une page vierge » placée en premier ;
- les 18 modèles actuellement déclarés dans le catalogue ;
- des filtres par univers : Tout, Nutrition, Café & épicerie, Beauté & soin, Maison & céramique, Mode & accessoires, Sport & plein air ;
- un aperçu réel et distinct pour chaque modèle ;
- un sélecteur bureau/mobile qui modifie les proportions de toutes les miniatures ;
- le nom du modèle, sa marque et son univers.

La carte sélectionnée reçoit un état visuel clair. Un clic enregistre le document correspondant, ferme la galerie et charge le véritable aperçu de la page. Une erreur d’enregistrement laisse la galerie ouverte et affiche une action de reprise.

### Page vierge

La carte « Partir d’une page vierge » crée un document volontairement minimal : navigation, section hero vide et pied de page. Ce document porte un identifiant de modèle réservé afin que l’éditeur ne rouvre pas la galerie après l’enregistrement.

L’aperçu doit afficher un état de départ utile, avec des zones modifiables, plutôt qu’une page vide ou cassée.

### Canardo

Canardo reste accessible dans la barre inférieure pendant la galerie et après sélection d’un modèle.

Depuis la galerie, une instruction peut construire la page directement. Depuis l’éditeur, une instruction modifie le document courant. Dans les deux cas :

1. le message utilisateur apparaît immédiatement ;
2. le champ et le bouton passent en état occupé ;
3. la réponse de Canardo est affichée ;
4. le document retourné devient la source de l’aperçu ;
5. les panneaux sont resynchronisés ;
6. la galerie se ferme si la page contient désormais du contenu ;
7. les erreurs d’authentification, de crédits, de configuration ou de génération sont expliquées dans la conversation.

L’API OpenAI configurée reste le moteur de génération. En son absence, l’interface annonce clairement que Canardo n’est pas configuré ; elle ne simule pas une réponse réussie.

## Architecture

### Catalogue unique

`src/lib/catalog.ts` devient la source unique pour chaque modèle. Un modèle contient :

- son identifiant, son nom, sa marque, son univers et son type de page ;
- une direction visuelle (couleurs, typographie, densité, traitement d’image) ;
- son contenu et sa composition de sections ;
- les métadonnées nécessaires à sa miniature.

`documentFromModel` génère un document réellement distinct à partir de ces données. Aucun nom de modèle ne doit être recherché dans le texte du DOM pour déterminer l’action à exécuter.

### Rendu partagé

Le rendu complet et les miniatures consomment le même `PageDocument`. Le rendu expose une version compacte destinée aux cartes de la galerie, sans dupliquer la structure des modèles dans le HTML statique.

La direction visuelle du modèle est conservée dans le document sous une propriété de thème validée. `renderPage` transforme cette propriété en variables CSS sûres. Les modèles restent compatibles avec les sections Shopify existantes.

### Interface de galerie

`public/editeur.html` reçoit un conteneur sémantique stable pour la galerie, la conversation et les notifications. `src/hydrate/editeur.ts` construit les filtres et les cartes à partir du catalogue, utilise des attributs `data-model-id`, gère les états chargement/erreur/sélection et orchestre l’application d’un modèle.

Les cartes utilisent des `iframe` avec `srcdoc` ou un équivalent isolé afin que chaque aperçu emploie le vrai rendu sans contaminer les styles de l’éditeur.

### Canardo et synchronisation

Le client centralise l’adoption d’un document dans une seule opération : mise à jour de `current`, remplissage des panneaux, fermeture éventuelle de la galerie et rafraîchissement de l’iframe. Cette opération est utilisée après sélection d’un modèle, sauvegarde manuelle et réponse Canardo.

L’API valide le prompt non vide, les sections retournées et les propriétés de thème avant d’enregistrer. Les erreurs renvoient un code et un message exploitables par l’interface.

## Direction visuelle

L’éditeur reste dans l’univers sobre du dashboard Weflo :

- Encre `#141310`, papier `#FAFAF8`, blanc `#FFFFFF`, lignes `#E6E5E0`, jaune Weflo `#FBC531`, gris secondaire `#75736C` ;
- typographie système du dashboard pour l’interface ;
- galerie large, filtres horizontaux et cartes régulières ;
- accent mémorable : les miniatures sont de vraies pages vivantes et changent ensemble du format bureau au format mobile ;
- animations limitées au survol, à la sélection et à la transition galerie → aperçu ;
- focus clavier visible et mouvement réduit respecté.

Chaque miniature reprend en revanche l’identité de sa marque : les couleurs, les proportions et la typographie du modèle ne sont pas celles de l’interface Weflo.

## Gestion des erreurs

- Échec de chargement d’une miniature : carte conservée avec un message spécifique et le modèle reste sélectionnable.
- Échec d’application : sélection réactivée et message avec bouton « Réessayer ».
- Crédits épuisés : réponse Canardo avec lien vers la facturation.
- Canardo non configuré : réponse explicite dans la conversation.
- Réponse invalide du modèle : document actuel conservé et message de correction.
- Déconnexion : redirection vers la connexion, comme dans les autres flux protégés.

## Tests et validation

Le développement suit des cycles de tests rouges puis verts :

1. le catalogue produit 18 documents distincts et un document vierge stable ;
2. les styles des modèles sont validés et rendus sans injection ;
3. la galerie affiche toutes les cartes depuis le catalogue et filtre par univers ;
4. la sélection d’un modèle enregistre le bon `modelId` et affiche l’aperçu ;
5. la page vierge ferme définitivement la galerie et reste modifiable ;
6. Canardo adopte et affiche un document valide ;
7. les erreurs 400, 402, 503 et réseau restent visibles ;
8. les tests existants, le build et une vérification visuelle bureau/mobile passent.

## Hors périmètre

- création d’un nouveau moteur de paiement ou de publication ;
- remplacement du modèle OpenAI configuré ;
- ajout d’un marketplace de modèles externes ;
- modification des autres pages du dashboard sans nécessité directe pour ce parcours.
