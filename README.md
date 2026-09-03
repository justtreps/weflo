# Weflo

Weflo est un builder Shopify en TypeScript servi par Hono. Le dashboard authentifié permet de choisir un format, un modèle structuré et des informations propres à la page avant d’ouvrir le document dans l’éditeur visuel.

## Lancer l’application localement

Installe les dépendances et reconstruis les bundles navigateur avant le premier lancement :

```powershell
npm install
npm run build:hydrate
$env:PORT=4318
npm run dev
```

Ouvre ensuite `http://localhost:4318/dashboard`. Une session Supabase valide est nécessaire avec la configuration de production locale. Le parcours navigateur automatisé démarre pour sa part un serveur Hono isolé avec une session authentifiée en mémoire ; il ne dépend d’aucun compte externe.

## Générer les aperçus de modèles

```powershell
npm run previews:templates
```

Le générateur écrit les 42 images WebP et leur manifeste dans `public/template-previews`. Pour contrôler le déterminisme, exécute la commande deux fois et vérifie que `git diff -- public/template-previews` reste vide après la seconde exécution.

## Vérifier les parcours de création

Parcours navigateur et contrats directement liés aux formats :

```powershell
npx vitest run tests/create-flow-browser.test.ts tests/dashboard-hydrate.test.ts tests/create-build-view.test.ts tests/create-hydrate.test.ts tests/create-flow-state.test.ts tests/create-workspace.test.ts
```

Vérification complète avant livraison :

```powershell
npx vitest run
npx tsc --noEmit
npm run build
npm run previews:templates
npm run previews:templates
```

## Frontière entre aperçu et contenu client

Les produits, marques, avis, chiffres et images fictifs du générateur servent uniquement aux aperçus du catalogue. Ils sont signalés comme exemples fictifs et ne sont jamais repris par les routes de création client. Un document client est compilé uniquement depuis les réponses soumises, et depuis l’analyse du produit lorsqu’un format orienté produit utilise réellement une source importée.

## Routes principales

| Route | Usage |
|---|---|
| `/dashboard` | Accueil authentifié et sélecteur « Nouvelle page » |
| `/creer` | Galerie, questionnaire, stratégie et construction |
| `/editeur?page=<id>` | Éditeur visuel d’un document structuré |
| `/creations` | Liste des pages |
| `/studio` | Studio images |
| `/boutique` | Connexion et gestion de boutique |
| `/facturation` | Abonnement et réglages de publication |
