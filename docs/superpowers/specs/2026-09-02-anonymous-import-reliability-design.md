# Import anonyme fiable par lien ou image

## Objectif

Rendre l’entrée de l’onboarding Weflo réellement fonctionnelle sans authentification. Un visiteur peut fournir une URL produit ou une image, parcourir les questions, générer sa boutique, puis se connecter uniquement pour la récupérer dans son espace.

## Cause corrigée

Le code enregistrait les brouillons dans `onboarding_drafts`, mais cette table n’existe pas dans la base de production et le rôle PostgreSQL applicatif ne possède pas le droit de créer de nouvelles tables. Les appels échouaient donc avant l’extraction du produit. L’importeur pouvait également suivre une chaîne de redirections sans limite globale et le navigateur n’avait aucun délai d’abandon.

## Persistance

Les brouillons anonymes seront stockés dans la table `pages`, déjà disponible et accessible à l’application, sous un espace réservé `ws_weflo_onboarding`. Cet espace n’aura aucune adhésion utilisateur et restera donc invisible dans tous les dashboards.

Chaque brouillon conservera son identifiant `ob_*`, son statut et son document JSON complet. Les méthodes publiques du `Store` ne changent pas : seule l’implémentation PostgreSQL de `createOnboardingDraft`, `getOnboardingDraft` et `updateOnboardingDraft` utilisera ce stockage interne. Le jeton de réclamation continuera d’être haché et vérifié avant chaque lecture ou modification. Après connexion, la boutique construite sera copiée vers l’espace réel de l’utilisateur comme aujourd’hui.

## Import par URL

- Timeout serveur global sur l’extraction.
- Maximum de cinq redirections, avec validation de sécurité à chaque destination.
- Timeout indépendant sur l’analyse OpenAI ; l’analyse déterministe de secours prend automatiquement le relais.
- Timeout navigateur et restauration systématique du bouton après réussite ou erreur.
- Réponses d’erreur JSON en français.

## Import par image

La première étape propose une zone PNG, JPG ou WebP. Le navigateur accepte un fichier jusqu’à 12 Mo, le redimensionne et le compresse avant l’envoi afin de rester sous les limites du navigateur, de Vercel et du stockage JSON. Le serveur vérifie réellement le type et la taille encodée.

OpenAI Vision identifie le type de produit et produit le titre, la description prudente, huit noms de marque, quatre audiences et quatre angles. Aucun prix, avis, matériau, certification ou bénéfice invisible ne doit être inventé. Si l’IA est indisponible ou trop lente, le nom du fichier et l’analyse déterministe permettent tout de même de poursuivre immédiatement l’onboarding.

## Sécurité et limites

- Seules les URL HTTPS publiques sont acceptées.
- Les redirections sont revalidées contre les accès privés et locaux.
- Les images sont limitées à PNG, JPEG et WebP et optimisées sous 450 Ko avant persistance.
- L’espace technique n’est jamais associé à un utilisateur et n’apparaît pas dans les listes de pages.
- La connexion reste obligatoire uniquement pour réclamer la boutique finale.

## Vérification

Les tests couvrent la boucle de redirection, le dépassement de délai, l’abandon côté navigateur et l’import image. La validation finale comprend la suite Vitest complète, TypeScript, le build de production, un import réel par image, un import URL en erreur contrôlée, puis un contrôle visuel de l’onboarding déployé.
