# Weflo Product Import, AI Onboarding and Store Builder Design

## Objective

Weflo must let a visitor generate a conversion-focused Shopify store before creating an account. The visitor imports a real product, answers AI-generated positioning questions, watches the store being assembled section by section, then claims the finished draft through authentication. The resulting store opens in a purpose-built commerce editor where every meaningful element can be changed directly.

## Non-negotiable product rules

- The onboarding and editor interfaces remain English; the existing French landing page keeps its language and uses the CTA “Générer une boutique.”
- The language selected during onboarding controls only customer-facing store copy.
- Product imagery must continue to depict the imported product. AI image work may recompose or annotate the source product, but must not substitute a different product.
- The visitor must be able to edit every AI proposal before building.
- Anonymous onboarding state survives refresh and authentication in the same browser.
- Account creation requires name, email and password; Google remains available.
- A free user clicking Publish always sees the Weflo Pro paywall immediately.
- Weflo-hosted publication is removed from the product and API. Pro publication targets Shopify only.
- The store is a real `EditorDocument` composed of registered editable sections, not a screenshot or one large HTML block.
- The current generic Structure/Add/Layers rail is replaced by a commerce-first builder matching the supplied references.

## End-to-end flow

### 1. Landing page entry

The secondary hero action reads “Generate a store” and links to `/start`. Other creation CTAs may keep their current labels, but public generation begins at `/start`, before authentication.

### 2. Product source

The first screen accepts an HTTPS URL from Amazon, AliExpress, Shopify storefronts and ordinary product pages. It also exposes curated sample products so the flow can be tested without an external URL.

The server performs guarded extraction:

1. Validate HTTPS and reject credentials, localhost, private/reserved IP destinations and non-HTTP protocols.
2. Fetch through the configured scraping adapter when present, otherwise use the native fetch adapter.
3. Parse Product JSON-LD first, then Open Graph and product-page fallbacks.
4. Normalize title, description, vendor, currency, current price, compare-at price, variants, rating, review count, reviews and image URLs.
5. Deduplicate images and retain source URLs and source attribution.
6. Return an explicit blocked/unsupported response when the source cannot be extracted. Never fabricate a product as a successful import.

### 3. Analysis progress

The UI displays real job progress while the product is processed. The first phase reports scraping, page reading, image collection, review collection and product analysis. The job API is polled and returns a stable status record so refresh can resume the same phase.

### 4. Customer language

The user selects the target language for storefront copy. English, French, German, Spanish, Italian, Portuguese, Dutch and Polish are first-class options, with an additional language selector. Changing this choice never changes Weflo interface copy.

### 5. Visual direction

The user selects one of the existing Weflo models or “Let AI decide.” Cards show a real responsive preview using the existing model preview assets. The imported source store can appear as a “Clone this look” choice only when its visual tokens were extracted successfully.

### 6. Brand name

OpenAI proposes eight product-specific brand names. The user may select a suggestion or type any other name. The chosen name is the canonical `EditorDocument.name` and remains editable in the builder.

### 7. Product-informed questions

OpenAI derives questions from the normalized product and available reviews. Two required screens appear before the claim/build phase:

- “Who is this for?”: four editable buyer-persona cards, multiple selection, add custom and “Decide for me.”
- “What are the main reasons to buy?”: four editable marketing-angle cards, multiple selection, add custom and “Decide for me.”

Each card contains a title, an insight or quote, an icon and short strategy tags. The first selected card determines the lead angle while the others supply secondary sections.

### 8. Store build

After “Start building,” the job advances through these French customer-visible stages while the Weflo shell remains English:

1. Analyse des avis
2. Identification des douleurs clients
3. Analyse des concurrents
4. Compréhension du client idéal
5. Création de l’identité de marque
6. Rédaction du copywriting de conversion
7. Génération des visuels de conversion
8. Structuration de l’offre
9. Construction de la buy box
10. Ajout des éléments de confiance et de preuve sociale
11. Mise en avant des meilleurs avis
12. Renforcement de la proposition de valeur
13. Optimisation du panier moyen
14. Réduction des frictions avant achat
15. Optimisation pour les acheteurs mobiles
16. Optimisation de chaque détail pour la conversion
17. Création du brand kit

Job progress represents completed server operations rather than an independent decorative timer. The preview updates as sections become available.

### 9. Generated store composition

The generator produces a complete `EditorDocument` using registered sections. At minimum it includes:

- announcement and navigation;
- product media gallery;
- product hero/buy box with rating, price and compare-at price;
- variant and quantity selectors;
- single, duo and high-AOV bundle offers;
- add-to-cart action and payment/trust row;
- product benefits and use cases;
- image/text narrative sections;
- comparison or before/after when supported by product evidence;
- verified-review summary and review grid;
- shipping, returns and guarantees;
- product-specific FAQ;
- final conversion call to action;
- footer.

Unsupported claims are excluded. Reviews are quoted only when they were extracted; otherwise the generator produces clearly labeled editable sample testimonials without presenting them as verified.

### 10. Brand kit and claim

The completed brand kit contains the selected name, palette, heading font, body font and reusable color schemes. The ready screen shows the generated store, brand kit, product imagery and section count. Only then does “Claim my store” open the authentication modal.

Authentication never discards the anonymous onboarding draft. Successful signup/login calls a claim endpoint that creates the page in the user workspace, stores the generated `EditorDocument`, marks the onboarding job claimed and redirects to `/editeur?page=<id>`.

## Commerce-first editor

### Information architecture

The editor adopts the supplied dark builder shell. A compact icon rail provides global modes; the main sidebar displays commerce categories instead of generic document concepts:

- Add section
- Product
- Bundles & offers
- Target persona
- Marketing angle
- Brand kit
- Pages
- Media

When Add section is active, the first column lists categories such as Hero, Product Hero, Benefits & Features, Stats & Results, How It Works, Before / After, Reviews & Social Proof, Comparison, Product Details, FAQ, Trust & Guarantees, Offers & Urgency, Brand Story, Collections and Header / Footer. The adjacent browser shows live thumbnails for every available section layout.

### Direct editing

Clicking a section or element in the canvas opens a floating contextual toolbar near the selection. Text is editable inline. The toolbar exposes typography, alignment, color, spacing, duplicate, delete and close controls appropriate to the selected element.

Clicking media opens a media popover with:

- choose existing media;
- upload replacement;
- crop/aspect controls;
- object fit and focal point;
- “Edit with AI.”

“Edit with AI” sends the selected source asset plus a text instruction to the image-editing adapter. The result is added as a new asset and replaces only the selected setting after confirmation. The original asset remains recoverable through undo.

### Typography and brand editing

Brand kit controls expose heading font, body font, font weights, palette and named color schemes. Changes update document theme tokens and render immediately across all compatible sections. Font choices are restricted to bundled or explicitly configured web fonts so Shopify output remains deterministic.

### Sections and buy box

Sections remain independently selectable, reorderable, duplicable, hideable and deletable. Blocks inside buy boxes, FAQs, reviews, bundles and galleries support the same operations. Product settings include Shopify bindings, variants, bundle pricing, badges, trust copy and checkout behavior.

### Canardo

Canardo receives the selected section, element path and current page context. Text instructions become validated editor commands. Image instructions use the image-editing adapter. Consequential multi-section changes still require review and remain undoable as one history action.

## Visual direction

The onboarding uses a disciplined “blackroom” presentation derived from the references:

- Ink: `#080807`
- Raised panel: `#1D1A18`
- Panel hover: `#292522`
- Primary text: `#F7F7F5`
- Muted text: `#9B9691`
- Action blue: `#1683FF`
- Weflo yellow: `#FBC531`
- Success green: `#87D300`

The interface uses the dashboard’s bundled sans-serif family. The memorable element is the live store construction: sections materialize in the preview as corresponding build stages complete. Motion is driven by state changes, honors `prefers-reduced-motion`, and never replaces progress semantics.

The editor uses the same dark chrome but the store canvas remains color-accurate. Desktop, tablet and mobile modes share one document and preserve selections.

## Data model

`OnboardingDraft` is a versioned payload with:

- id and status;
- product URL and normalized product snapshot;
- extraction status and errors;
- selected storefront language;
- visual direction/model id;
- proposed and selected brand names;
- proposed and selected personas;
- proposed and selected marketing angles;
- brand kit;
- build-stage states;
- generated `EditorDocument`;
- anonymous browser claim token hash;
- claimed user/page identifiers and timestamps.

Anonymous browser persistence stores only the draft id, claim token and non-sensitive UI state. The authoritative job result is stored server-side. A claim token is single-use and never returned after the draft is claimed.

## Server interfaces

- `POST /api/onboarding/import` creates a guarded extraction job.
- `GET /api/onboarding/:id?token=...` returns progress and current draft data.
- `PATCH /api/onboarding/:id` validates and stores language, model, name, personas or angles.
- `POST /api/onboarding/:id/analyse` generates product-specific names, personas and angles.
- `POST /api/onboarding/:id/build` starts document/brand/image generation.
- `POST /api/onboarding/:id/claim` requires authentication, consumes the claim token and creates the page.
- `POST /api/assets/:id/edit` requires authentication and applies an image-to-image instruction to a selected asset.

All mutations validate the claim token before authentication and workspace membership after authentication. Rate limits apply by token, IP and authenticated user.

## OpenAI boundaries

OpenAI receives normalized product facts, selected language and selected strategy inputs. Structured outputs are validated before storage. It may generate names, personas, angles, store copy, a brand kit and section composition. It must not invent product specifications, discounts, ratings, review counts or certifications.

Image editing always includes the selected product image as input. Text-to-image generation without a product reference is allowed only for non-product decorative assets and must not be used as the principal product image.

If OpenAI is unavailable, deterministic local suggestions and section composition keep the flow usable; the UI labels fallback content as editable suggestions.

## Publication

`publish-options` returns Pro access and Shopify connection state. The editor behavior is:

- non-Pro: render the Weflo Pro paywall immediately;
- Pro without Shopify: show Shopify connection action;
- Pro with Shopify: show theme strategy selection.

The publish endpoint rejects `hosted`, requires an active Pro plan and requires a connected Shopify store. Existing safe strategies remain: new Weflo theme, duplicate active theme or explicitly confirmed active theme.

## Error behavior

- Invalid/unsafe URL: explain that only public HTTPS product pages are accepted.
- Blocked marketplace: retain the URL and allow retry or scraping-adapter configuration.
- No usable product data: offer sample products or manual product entry.
- OpenAI error: retain extracted data and allow retry or deterministic suggestions.
- Authentication error: keep the claim modal and draft intact.
- Claim conflict: return the already-created page id when the same token is retried.
- Build error: preserve completed stages and retry from the first incomplete stage.
- Image edit error: keep the original selected image.

## Accessibility and responsive behavior

- Every wizard step has a heading, progress semantics and keyboard-operable cards.
- Multi-select cards expose `aria-pressed`; dialogs trap focus and close with Escape.
- Status changes use a polite live region.
- Focus is visible against the dark palette.
- Onboarding cards become a single-column stack on narrow screens.
- The editor sidebar becomes an overlay on tablets and phones while the canvas keeps explicit viewport controls.
- Reduced-motion users receive immediate state changes without animated traversal.

## Verification criteria

The feature is accepted when automated tests and browser checks demonstrate:

1. Public onboarding starts from the landing CTA without authentication.
2. A Shopify-style Product JSON-LD fixture imports correct product facts and all images.
3. Unsafe URLs and private IP destinations are rejected.
4. Language selection changes generated storefront copy but not Weflo UI copy.
5. Names, personas and angles are product-specific, editable and persisted.
6. Refresh and authentication preserve the onboarding draft.
7. Build stages produce a multi-section `EditorDocument` with source product images.
8. Claim creates exactly one page and opens the editor.
9. Commerce-first editor categories, section thumbnails and contextual editing work.
10. Typography, palette, media replacement and AI image editing update and autosave the document.
11. Free Publish opens the Pro paywall without offering hosted publication.
12. Pro Publish exposes only Shopify destinations.
13. Desktop, tablet and mobile previews render without overlap.
14. TypeScript, the full Vitest suite and the production build pass.
