# Weflo — maquettes fonctionnelles

Date : 2026-08-31  
Statut : validé en session, en revue utilisateur

## Objectif

Rendre les 7 écrans maquettes **100 % fonctionnels** de A à Z, **sans changer le HTML/CSS visuel**. Le look reste pixel-identique. On extrait le markup des bundles actuels, on l’hydrate, on branche un backend réel.

Weflo est un **builder de pages Shopify piloté par Canardo** (barre IA). Le marchand se connecte (e-mail ou Google), gère des espaces et des pages, édite avec Canardo, prévisualise chez nous, publie vers Shopify (domaine + jeton Admin), paie via **Whop**, parraine via **Whop Affiliates**.

## Hors périmètre

- Recoder les écrans en React / autre framework.
- Login ou OAuth **Shopify** (bouton retiré de `connexion.html`).
- Stripe (remplacé par Whop partout).
- `direction-artistique.html` et `mascottes.html` : pages **DA interne** (logos, 12 états du canard). Pas des réglages marchand. Elles restent consultables, non branchées à des données compte.
- Tests A/B et invitation d’équipe : les modales restent visibles ; elles deviennent réelles **après** publish + facturation + parrainage.
- Paiement carte sur le storefront hébergé : le checkout client est celui de **Shopify** une fois publié.

## Contrainte HTML

Les fichiers `connexion.html`, `dashboard.html`, `editeur.html`, `facturation.html`, `parrainage.html` gardent **la même structure visuelle** (classes, layout, copy, Canardo).

Travail autorisé :

- extraire le HTML/CSS hors du bundler Claude (aujourd’hui non éditable) ;
- retirer uniquement le bouton « Continuer avec Shopify » sur la connexion ;
- ajouter des `id` / `data-*` discrets et un JS de liaison ;
- remplacer les `{{ placeholders }}` et le faux « Amir Ben Ettaleb » par des données réelles.

Interdit : nouvelle DA, nouvelle grille, nouveaux écrans marchands.

En production, `/` redirige vers `/dashboard` si session, sinon `/connexion`. Le hub `index.html` n’est pas l’entrée marchand : il est servi sur `/maquettes` (preview interne des écrans).

## Décisions figées

| Sujet | Choix |
|---|---|
| UI | Maquettes HTML telles quelles + backend |
| Entrée | E-mail + mot de passe **et** Google. Pas de Shopify. |
| Shopify | Publish uniquement. Connexion boutique = **domaine + jeton Admin** collés. |
| Canardo | **Vraie IA** (OpenAI) dès que l’éditeur existe. Les changements s’enregistrent. |
| Paiement | **Whop** : abonnements + packs de crédits. |
| Parrainage | **Whop Affiliates** + promo code 20 % / 3 mois. |
| Preview | Hébergée chez nous (`/s/{slug}`), puis push Shopify. |
| Ordre de build | Compte → dashboard → pages → éditeur/Canardo → publish → facturation → parrainage. |

## Architecture

Même déploiement Vercel (`cleanUrls` déjà en place).

| Besoin | Choix |
|---|---|
| HTML/CSS | Fichiers extraits des maquettes |
| Liaison UI | JS léger (fetch API, pas de nouveau design system) |
| API | Routes serverless sur le même site |
| Auth | Supabase Auth (e-mail/mot de passe + Google) |
| Données | Postgres (Supabase) |
| Canardo | OpenAI. Consomme les **crédits Weflo**. |
| Images générées | Incluses dans la génération (pas collées après). **OpenAI Images** en v1, débitées en crédits. Un autre provider peut s’ajouter plus tard sans changer l’UI. |
| Shopify | Admin API. Jeton chiffré au repos. |
| Billing / parrainage | Whop API + webhooks signés |
| Secrets | Variables d’environnement / Vercel. Jamais commités. |

Flux principal :

1. Login Supabase → session cookie.
2. API authentifiée lit/écrit Postgres (espaces, pages, crédits, intégration Shopify).
3. Canardo : prompt + JSON de page → OpenAI → nouveau JSON → save → preview.
4. Publish : preview `/s/…` toujours ; si jeton Shopify valide → thème + images + produit.
5. Whop checkout (HTTPS `redirect_url`) → webhooks → plan / crédits à jour.

## Modèle de données

**User** — id Supabase, e-mail, nom, mot de passe géré par Supabase.

**Workspace (espace)** — nom, slug, owner, created_at. Un user peut en avoir plusieurs. Première inscription : un espace est créé automatiquement.

**Membership workspace** — user, workspace, rôle (`owner` / `member` / `viewer`). Invite e-mail réelle sur Facturation.

**Page** — workspace_id, nom, slug, type (`sell` / `write` / `blank`), statut (`draft` / `published_hosted` / `published_shopify`), document JSON, updated_at.

**Page document** — `{ name, path, sections: [{ id, type, settings }] }`. Canardo ne génère pas de HTML libre : il choisit des **types de sections du catalogue** et remplit `settings` (textes, images, prix).

**ShopifyConnection** — workspace_id, shop_domain, token_encrypted, status (`connected` / `invalid` / `none`). Le jeton n’est jamais renvoyé en clair à l’UI.

**CreditLedger** — workspace_id, monthly_remaining, monthly_reset_at, purchased_remaining. Les crédits mensuels resetent avec le cycle d’abo. Les crédits achetés ne caduquent pas. On consomme d’abord les mensuels.

**WhopLink** — workspace_id, membership_id, plan_id, status, manage_url, affiliate_id.

**ReferralAttribution** — filleul workspace, parrain workspace, promo appliquée, created_at. Un filleul = une attribution. Auto-parrainage interdit.

## Catalogue de sections

L’IA ne dessine pas la page. Catalogue figé, écrit et testé par nous (pas de Liquid / recettes d’un tiers) :

- navigation, productHero, benefits, bundle, guarantees, reviews, faq, cta, footer
- blocs accueil : hero, collection grid, atelier
- blocs contenu : article / texte

Chaque type a un schéma de settings. La preview `/s/…` et le thème Shopify OS 2.0 rendent **les mêmes** sections.

## Écrans

### Connexion — `connexion.html`

Google **ou** e-mail + mot de passe. Bascule login / inscription comme la maquette. Conditions / confidentialité : liens, pas de nouveau layout.

Session absente sur une route app → redirection `/connexion`.  
Session présente sur `/connexion` → `/dashboard`.

### Dashboard — `dashboard.html`

Données réelles de l’espace actif (plus de faux profil).

- Liste des pages : nom, date, type. Tri nom / date / type.
- Actions : ouvrir l’éditeur, dupliquer, renommer, copier le lien d’aperçu, supprimer (confirmation).
- Nouvelle page : **Vendre** / **Écrire** / **Repartir de zéro** → crée la page, ouvre l’éditeur.
- Switch d’espace + « Créer un espace ».
- Canardo dashboard : vrai chat ; peut créer / renommer / orienter une page ; persisté.
- Liens : réglages compte, facturation, parrainage, déconnexion.

### Éditeur — `editeur.html`

Preview centrale, panneaux, barre Canardo : branchés, look inchangé.

Canardo (OpenAI) :

- message dans la barre → réponse dans « Conversation · aujourd’hui » ;
- chaque action muté le JSON et **sauvegarde** ;
- preview mise à jour immédiatement.

Édition manuelle (panneaux) : nom, slug, sections, textes, images — même persistance.

Aperçu : `/s/{workspace}/{page}` + ouvrir onglet + copier le lien.

Publier : d’abord hébergé chez nous ; push Shopify si connexion valide (sinon message clair, pas d’échec silencieux).

Modales A/B et « Partager le projet » : UI conservée, no-op fonctionnel jusqu’à la phase après facturation.

### Facturation — `facturation.html`

Whop uniquement. Pas de canard sur cet écran (règle DA).

**Abonnement** — clic plan → `checkoutConfigurations.create` avec `plan_id`, `metadata` `{ workspace_id, user_id, kind: "subscription" }`, `redirect_url` HTTPS vers `/facturation`. Paiement sur Whop. Droits activés **seulement** après webhooks `payment.succeeded` et `membership.activated` (signature vérifiée, body brut). Pas d’activation au clic.

**Gérer** — `manage_url` de la membership (`https://whop.com/billing/manage/mber_…`).

**Crédits** — Whop n’a pas de wallet crédits. Packs = plans Whop `one_time`. Au `payment.succeeded` (`kind: "credits"`), on crédite `purchased_remaining`. Canardo et images débitent le ledger. Solde 0 → pas d’appel IA, toast + « Add Credits ».

**Sites actifs** — un site compte si un **domaine custom** est lié. La preview `/s/…` ne compte pas. Quota = plan.

**Même page, réel** : nom du site, domaine, intégration Shopify, nom d’espace, membres (invite), profil (nom, e-mail, mot de passe). Danger zone : supprimer projet / espace / compte = suppression réelle + confirmation.

Webhooks : 200 rapide, traitement async. `payment.failed` / membership inactive → plan et droits mis à jour, pas de demi-état inventé.

### Parrainage — `parrainage.html`

À la création d’espace : affilié Whop (`user_identifier` = e-mail) + override **20 %** `all_payments` sur les plans d’abonnement.

Whop ne borne pas à 12 mois. L’UI garde le texte maquette (« 12 mois ») ; le calcul réel est Whop (`all_payments`, chaque renouvellement).

Lien affiché : `{PUBLIC_APP_URL}/r/{code}`. Redirige vers le checkout Whop avec `?a=`. Cookie affilié 30 jours.

Filleul : promo Whop **20 %**, `number_of_intervals: 3` (3 mois), appliquée s’il arrive par le lien.

L’écran affiche les totaux Whop (`total_referral_earnings_usd`, comptes). Pas de webhook affilié : refresh / poll, jamais un faux 0 si Whop a un solde. Remboursement = comm reprise par Whop.

Versements : Whop paie l’affilié (compte Whop requis). « En attente » / « Prochain versement » = solde Whop, pas d’IBAN maison.

Un filleul = une attribution, au premier espace payant. Pas d’auto-parrainage.

### DA — `direction-artistique.html`, `mascottes.html`

Statiques. Servies telles quelles. Pas de session requise.

## Publish Shopify

Formulaire Facturation → Intégrations : `boutique.myshopify.com` + jeton `shpat_…`.

1. Appel Admin API de test.
2. OK → `connected`, jeton chiffré.
3. KO → `invalid`, message, aucun publish.

**Publier** (éditeur) :

- toujours : page en ligne sur `/s/…` ;
- si `connected` : push thème OS 2.0 (nos Liquid + `templates/*.json`) + images + produit ;
- si pas connecté : publié chez nous seulement + message ;
- échec API : message, **aucune** poussée partielle (pas de thème orphelin sans produit, et inversement : transaction logique, rollback / thème unpublished si une étape casse).

Déconnecter : oublie le jeton ; le site `/s/…` reste.

## Erreurs

Toujours dans l’UI existante (toast / texte du mockup), jamais page blanche.

| Cas | Comportement |
|---|---|
| Login / Google refusé | Message sur connexion |
| Session expirée | Canard endormi + retour connexion |
| Plus de crédits | Message + Add Credits, pas d’appel IA |
| Jeton Shopify faux | Badge + texte, pas de publish partiel |
| Webhook Whop invalide / raté | Plan et crédits inchangés |
| 404 storefront | Canard qui pleure, pas un nouvel écran |

## Sécurité

- Routes app (dashboard, éditeur, facturation, parrainage, API pages/publish/billing) : session obligatoire.
- Isolation : un user ne lit/écrit que ses workspaces.
- Jeton Shopify chiffré (`INTEGRATION_ENCRYPTION_KEY`), jamais echo.
- Webhook Whop : HMAC / Standard Webhooks, `WHOP_WEBHOOK_SECRET`, raw body.
- `redirect_url` Whop : **HTTPS seulement** (pas de localhost en prod ; sandbox Whop en local).
- Secrets hors git.

## Tests d’acceptation

Avant de dire « c’est fonctionnel » :

1. Inscription e-mail et login Google ; session persistante ; logout.
2. Créer / renommer / dupliquer / supprimer une page ; reload = données toujours là.
3. Canardo change une section ; reload éditeur = changement toujours là ; crédits débités.
4. Publish : jeton OK → thème+images+produit sur Shopify ; sans jeton → `/s/…` seulement ; jeton faux → erreur, rien de partiel.
5. Checkout Whop sandbox + webhook : plan et crédits à jour ; « Manage » ouvre le portail Whop.
6. Lien `/r/…` : attribution + promo 3 mois au checkout ; pas d’auto-parrainage.
7. Comparaison visuelle : chaque écran marchand vs maquette (layout, typo, couleurs).

## Ordre d’implémentation

Un seul produit, **une spec**, livré par tranches (pas de second design) :

1. Extraire HTML, servir les routes, retirer login Shopify.
2. Auth Supabase (e-mail + Google) + garde de session.
3. Espaces + pages persistantes + dashboard branché.
4. Éditeur + catalogue + preview `/s/…` + Canardo. Jusqu’à Whop, un **allotment d’essai** (crédits offerts une fois) permet à Canardo de tourner ; solde 0 = bloqué.
5. Intégration Shopify + publish.
6. Whop abonnements + packs crédits + webhooks + portail. L’allotment d’essai cède la place aux crédits de plan / packs.
7. Whop Affiliates + promo + écran parrainage.
8. (Plus tard) A/B et invitations d’équipe vraiment branchés.

## Critère de succès

Un marchand peut : créer un compte, créer une page, la faire écrire par Canardo, la voir en preview, payer Whop, connecter Shopify par jeton, publier, et partager un lien de parrainage — **sur les mêmes écrans que les maquettes**.
