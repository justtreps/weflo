# Weflo Dashboard, Whop Checkout, and Shopify Theme Quality Design

**Date:** 2026-09-02

## Goal

Replace the administrative “Pages” screen with an immediately understandable Weflo home, send Pro users straight from the publishing paywall to Whop checkout, and raise generated stores from generic page compositions to coherent Shopify OS 2.0 themes built section by section.

## Reference Theme Findings

The supplied `themeforest-v2FC6aOA-minimog-the-high-converting-shopify-theme.zip` is a private quality reference. It must never be committed, copied into Weflo output, or redistributed.

The nested Minimog 6.0 archive contains:

- 94 Shopify Liquid sections;
- 124 reusable snippets;
- 50 JSON or Liquid templates;
- 164 theme assets;
- a product template composed from native breadcrumb, product information, product tabs, image/text, recommendations, recently viewed products, and icon-box sections;
- specialized conversion sections including bundles, mobile sticky cart, countdown, reviews, comparison, lookbook, galleries, and promotion banners;
- 26 configurable block types in its main product section.

These counts are not a target to copy. They demonstrate the required architectural depth: reusable Shopify-native sections, multiple layout variants, theme-wide settings, and deliberate product-page recipes.

## Product Boundaries

- Weflo remains the source of all generated Liquid, CSS, JavaScript, copy, and images.
- Third-party theme archives are used only for private structural analysis and visual benchmarking.
- A generated page can be installed into the active Shopify theme, a duplicate of that theme, or a separate unpublished Weflo theme.
- Publishing remains a Pro feature.
- The interface remains French. The customer language affects storefront copy only.

## New Dashboard Home

### Information architecture

The primary navigation label becomes **Accueil**. The current list moves into a secondary **Mes créations** view. Opening `/dashboard` shows the user what to do next rather than starting with filters and a table.

### Visual direction

Weflo keeps its recognizable black, white, and yellow identity, but the screen becomes image-led rather than table-led.

- **Canvas:** `#F7F7F4`
- **Surface:** `#FFFFFF`
- **Ink:** `#141310`
- **Muted ink:** `#6F6C65`
- **Weflo yellow:** `#FBC531`
- **Success:** `#259B67`
- **Typography:** Syne for short display headings; Inter for navigation, controls, and readable UI text.
- **Geometry:** restrained 12–16 px radii; large visual project frames; small radii for controls; borders communicate state.

The memorable element is a wide “creation desk” at the top: Canardo, one clear prompt, and four concrete starting inputs. The rest of the interface is quiet and operational.

### Desktop layout

```text
┌──────────────┬─────────────────────────────────────────────────────────┐
│ Weflo        │ Bonjour Théo                         Aide   Profil      │
│              │                                                         │
│ ● Accueil    │ ┌─────────────────────────────────────────────────────┐ │
│ Mes créations│ │ Que veux-tu vendre ?                 [Canardo]      │ │
│ Shopify      │ │ [Coller un lien ou décrire la boutique…] [Générer] │ │
│ Abonnement   │ │ Lien produit · Image · Shopify · Page vierge        │ │
│ Parrainage   │ └─────────────────────────────────────────────────────┘ │
│ Réglages     │                                                         │
│              │ Tes boutiques                            Tout afficher │
│ Shopify      │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ connecté     │ │ vraie preview│ │ vraie preview│ │ Nouvelle     │    │
│              │ │ Vanity Chic  │ │ LumiWall     │ │ boutique     │    │
│              │ │ Brouillon  • │ │ Shopify   ●  │ │      +       │    │
│              │ └──────────────┘ └──────────────┘ └──────────────┘    │
│              │                                                         │
│              │ À terminer             Activité Shopify                │
│              │ 2 actions concrètes    thème, publication, domaine     │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### Core interactions

- **Générer une boutique** opens the existing anonymous/product onboarding flow.
- **Lien produit** focuses the URL input.
- **Image** opens the image picker.
- **Shopify** opens connection or product selection, depending on connection state.
- **Page vierge** creates a blank editor document.
- Project cards use actual storefront previews, not placeholder thumbnails.
- Card actions are: continue editing, preview, duplicate, rename, delete.
- Status is explicit: Brouillon, Prête, Publiée sur Shopify, or Action requise.
- Empty state keeps the same creation desk and explains the first useful action.
- On mobile, the sidebar becomes a compact bottom navigation and project cards become a horizontal shelf.

## Direct Whop Checkout

The editor publishing paywall must have one primary action: **Passer à Weflo Pro**.

1. The client fetches billing data to obtain the current workspace and configured Pro plan.
2. Clicking the CTA posts directly to `/api/billing/checkout` with `kind: "subscription"` and the Pro plan ID.
3. Weflo replaces the CTA label with **Ouverture du paiement…** and prevents double submission.
4. On success, the browser navigates directly to the returned Whop purchase URL.
5. There is no intermediate `/facturation` page in this publishing flow.
6. If checkout creation fails, the modal stays open and displays a precise French retry message.
7. After Whop returns, the webhook remains the authority that activates Pro access.

The standalone billing page remains available for comparing plans, managing an existing subscription, and buying credits.

## Shopify Theme Generation Architecture

### Why the current output looks generic

The current compiler can emit native section files, but the generated document relies on one broad visual skeleton and repeated generic grids/cards. Changing colors and fonts does not create a distinct commerce art direction.

### New generation pipeline

```text
Product import
    ↓
Product truth sheet
    ↓
Audience + offer + objections
    ↓
Art-direction profile
    ↓
Store recipe (ordered section variants)
    ↓
Editable Weflo document
    ↓
Shopify-native Liquid compiler
    ↓
Active theme / duplicated theme / new Weflo theme
```

### Product truth sheet

Only observed product facts are treated as factual: title, variants, price, materials, dimensions, imagery, reviews, and supplier claims. Missing claims stay missing. The analysis separately stores inferred positioning, buyer objections, and proposed copy so the UI can distinguish facts from suggestions.

### Art-direction profiles

Weflo selects an art direction from the product and audience rather than from a generic color preset. Initial profiles:

- editorial beauty;
- clinical wellness;
- technical performance;
- warm home and decor;
- playful gifting;
- premium accessories;
- food and craft;
- problem/solution direct response.

Each profile defines typography behavior, spacing rhythm, media crops, button treatment, surface hierarchy, proof style, and allowed section variants. Colors alone never define a profile.

### Store recipes

A recipe chooses the sequence and variant of each section. A problem-solving product may use problem agitation, demonstration, comparison, benefits, reviews, bundle, FAQ, and sticky cart. A premium accessory may use editorial hero, material story, close-up gallery, craftsmanship, styling, restrained proof, product details, and a minimal buy box.

The same section type supports materially different compositions. For example, testimonials can be an editorial quote, UGC wall, review ledger, before/after proof, or compact buy-box proof.

### Native section library

The first quality library targets 30 Weflo-owned sections across:

- navigation and announcements;
- editorial, split, video, and product heroes;
- advanced product gallery and buy box;
- variants, bundles, quantity breaks, subscriptions, and sticky cart;
- benefits, specifications, comparison, before/after, and how-it-works;
- reviews, UGC, press, trust, guarantees, and FAQ;
- brand story, ingredients/materials, lookbook, and image-text narratives;
- recommendations, recently viewed products, collection merchandising, and footer.

Every section requires a complete Shopify schema, blocks, responsive behavior, empty states, theme-editor labels, and compatibility with Shopify product forms. Interactive behaviors are small Weflo-owned assets loaded only when required.

### Publishing into an existing theme

- **Active theme:** install namespaced Weflo sections and one assigned JSON template; modifying global templates requires explicit confirmation.
- **Duplicate active theme:** duplicate the merchant’s current theme and install into the copy.
- **New Weflo theme:** publish a complete unpublished Weflo shell with header, footer, settings, and generated templates.

All assets and section handles are namespaced. The compiler records every created or updated asset for rollback. Existing merchant assets are never overwritten unless they are Weflo-owned and the user confirms an update.

## Editor Impact

The editor continues to edit a structured document, not a screenshot or a raw HTML blob. Each generated section can be reordered, hidden, duplicated, deleted, or replaced by another variant. Text, images, fonts, colors, spacing, product bindings, and responsive settings remain editable. Canardo modifies the same structured settings and can add a section from the approved registry.

## Prototype and Rollout

1. Build a standalone interactive HTML prototype of the new dashboard home using realistic project previews and all major responsive states.
2. Review the prototype visually before replacing `/dashboard`.
3. Implement direct Whop checkout from the editor paywall.
4. Add the product truth sheet, art-direction profiles, and recipe selector.
5. Build the first premium section families and upgrade the renderer/compiler together.
6. Validate installation into a Shopify development theme before enabling active-theme publication.

## Testing and Acceptance

- Dashboard actions work with keyboard and pointer input at desktop and mobile widths.
- Real pages populate project cards and preserve rename, duplicate, preview, and delete actions.
- The paywall performs one checkout request and redirects directly to a Whop URL.
- Failed checkout remains recoverable and never falsely unlocks publishing.
- At least three unrelated products generate visibly different section recipes and art directions.
- Generated Liquid passes Shopify theme validation.
- Product forms, variants, bundles, cart actions, sticky cart, and app blocks work in a Shopify development store.
- Installing into an existing theme affects only namespaced Weflo assets and the selected template.
- Rollback removes or restores only assets recorded by the publication operation.
