# Weflo Hybrid Shopify Section Engine — Design

Date: 2026-09-03
Status: proposed for implementation

## 1. Problem

Weflo already has a structured editor document, a section registry, Web and
Liquid renderers, section previews, Canardo commands, and publication into a
Shopify theme. The current output still looks generic because the section
contract describes content and basic settings, but not a complete visual
composition or a real Shopify commerce capability.

Adding more page templates without deepening the section system would repeat
the same layouts with different copy. The product needs a curated component
engine in which OpenAI acts as an art director and composer, while deterministic
code owns rendering, Shopify behavior, validation, and publication.

## 2. Goals

- Produce pages that look intentionally designed for a product, brand, market,
  and campaign rather than recolored generic templates.
- Make editor previews and published Shopify output equivalent in hierarchy,
  responsive behavior, and commerce semantics.
- Let merchants add, preview, reorder, and configure a much larger catalog of
  sections grouped by understandable commercial purposes.
- Let Canardo create a requested composition from approved primitives and, when
  necessary, propose a validated custom section without executing arbitrary
  model output directly.
- Publish either a new Weflo Shopify theme/template or add Weflo sections and a
  resource template to an existing compatible theme.
- Support real Shopify products, variants, cart forms, collections, fixed
  bundles, customizable bundles, subscriptions, and preorders through the
  correct Shopify capability rather than decorative markup.
- Generate localized storefronts whose copy, currency, imagery, and cultural
  direction can differ per country while the Weflo interface remains French.

## 3. Non-goals

- Do not let an LLM upload unreviewed Liquid, JavaScript, or schema directly to
  a merchant theme.
- Do not copy or redistribute proprietary theme code or assets without a license
  that permits it.
- Do not claim that a visual bundle selector creates a Shopify bundle. Commerce
  capabilities must be connected to Shopify data and APIs.
- Do not combine customized bundles with selling plans where Shopify does not
  support that combination.
- Do not replace the existing editor, document validator, autosave, or publish
  strategy. Extend their contracts.

## 4. Architecture decision

Use a hybrid architecture with three layers:

1. **Weflo native section packs** provide original, deterministic sections and
   blocks with Web, Liquid, schema, style, behavior, preview, and test assets.
2. **Theme adapters** translate Weflo design tokens and capabilities into a
   target theme. The Weflo runtime is the fallback; Dawn is the first external
   adapter; licensed premium themes can be added independently.
3. **OpenAI planning** produces validated JSON blueprints. It selects section
   packs, variants, content, bindings, and media directions. It does not own the
   final runtime code.

This preserves creative range while keeping exported themes predictable and
uploadable.

## 5. Canonical section-pack contract

Extend `SectionDefinition` into a versioned `SectionPackDefinition`:

```ts
type SectionPackDefinition = {
  type: string;
  version: number;
  name: string;
  category: SectionCategory;
  family: SectionFamily;
  tags: string[];
  supportedPages: PageKind[];
  supportedMarkets: string[] | "all";
  capabilities: ShopifyCapability[];
  defaults: Record<string, SettingValue>;
  settings: InspectorControl[];
  blocks: BlockDefinition[];
  variants: SectionVariantDefinition[];
  renderWeb(context: SectionRenderContext): string;
  renderLiquid(context: LiquidRenderContext): string;
  renderSchema(context: SchemaContext): ShopifySectionSchema;
  assets?: SectionAssetDefinition[];
  migration?: SectionMigration;
};
```

Each variant is more than a color preset. It specifies:

- layout composition and media ratio;
- typography role and density;
- spacing and responsive transformations;
- supported block arrangement;
- interaction behavior;
- required data and fallback policy;
- preview fixture and desktop/mobile reference images;
- compatible design-system profiles.

Every section instance records `packVersion`, `variantId`, bindings, and design
overrides. Existing documents without these fields migrate to the default
variant of their current section type.

## 6. Catalog taxonomy and editor experience

Replace the six broad filters with a merchant-facing taxonomy:

- **En-têtes et navigation**
- **Héros**
- **Produit et achat**
- **Variantes et options**
- **Bundles et offres**
- **Abonnements et précommandes**
- **Bénéfices et caractéristiques**
- **Démonstration et médias**
- **Avant / après**
- **Avis, UGC et preuve sociale**
- **Comparaison**
- **Ingrédients, matériaux et détails**
- **Collections et recommandations**
- **Histoire de marque**
- **Advertorial et contenu éditorial**
- **Listicle**
- **Quiz et formulaires**
- **FAQ, confiance et garanties**
- **Conversion et capture**
- **Footer et utilitaires**
- **Sur mesure**

The Add Section panel includes search, category chips, capability chips,
desktop/mobile preview switching, and sorting by recommended, newest, or most
used. Each variant card shows a real product fixture and a short capability
label such as “Variantes Shopify”, “Bundle fixe”, or “Bloc d’application”.

Opening a card shows a large continuous preview, its editable settings, required
Shopify data, and any installation requirement. Insertion adds a fully
materialized instance after the selected section. Existing mouse drag-and-drop
continues to control section and block order.

## 7. Initial premium section packs

The first production pack targets the gaps that most affect perceived quality
and conversion:

### Product and purchase

- Product hero: gallery-led, editorial split, clinical proof, video-first.
- Buy box: clean, premium, compact, sticky, mobile drawer.
- Variant selector: pills, color swatches, image cards, dropdown, combined.
- Quantity offer: single/duo/trio, tier table, volume ladder.
- Complementary products and cross-sell.
- Sticky mobile add-to-cart.

### Bundles and purchase options

- Fixed Shopify bundle product.
- Multipack of one product/variant.
- Mix-and-match selector backed by a Weflo theme app block and Cart Transform
  function.
- Subscription selector backed by Shopify selling plans.
- Preorder selector backed by a compatible preorder/purchase-option provider.

Bundle, subscription, and preorder sections expose capability status in the
editor. A section cannot publish as functional when its required Shopify
capability is unavailable; the merchant receives a French setup action instead.

### Proof and storytelling

- UGC filmstrip, masonry, testimonial spotlight, review wall.
- Results grid, before/after slider, press strip, expert quote.
- Comparison table, objection cards, guarantees, FAQ.
- Ingredient/material glossary, process timeline, traceability map.
- Brand manifesto, founder story, editorial chapter, campaign lookbook.

### Page-format primitives

- Advertorial masthead, author line, editorial body, inline product card,
  evidence callout, mid-article and final CTA.
- Listicle index, numbered reason, comparison insert, product recommendation.
- Quiz question, progress, result, recommendation, lead capture.
- Landing hero, mechanism, proof, offer stack, conversion close.

The initial milestone ships these 12 premium pack families with at least three
meaningfully different variants each:

1. product hero;
2. buy box and product form;
3. variant selector;
4. quantity offer;
5. fixed bundle and multipack;
6. benefits and results;
7. product demonstration and media gallery;
8. before/after;
9. reviews, testimonials, and UGC;
10. comparison;
11. FAQ, guarantees, and trust;
12. collection and product recommendations.

“Meaningfully different” requires a composition or interaction change, not only
new copy, colors, or imagery. The registry and catalog must support subsequent
packs without editing core switch statements. Advertorial, listicle, quiz, and
brand-story primitives are the next content pack built on the same contract.

## 8. Design-direction engine

Introduce a versioned `DesignProfile` separate from section content:

```ts
type DesignProfile = {
  id: string;
  market: string;
  archetype: "editorial" | "clinical" | "playful" | "luxury" |
    "technical" | "natural" | "sport" | "utility";
  typography: TypographyTokens;
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  borders: BorderTokens;
  media: MediaDirection;
  motion: MotionTokens;
  density: "airy" | "balanced" | "dense";
};
```

OpenAI selects a profile and compatible section variants. It may propose new
tokens within validated ranges, but cannot inject CSS strings. The editor and
Liquid renderer consume the same token names. Theme adapters translate those
tokens into target-theme variables where possible and otherwise load namespaced
Weflo CSS.

Country adaptation changes language, currency presentation, cultural references,
proof format, measurement units, imagery prompts, and offer conventions. It does
not translate the Weflo application interface.

## 9. AI Store Blueprint

OpenAI returns a strict, versioned `StoreBlueprint`:

```ts
type StoreBlueprint = {
  version: 1;
  format: CreationFormatId;
  market: string;
  language: string;
  brand: BrandStrategy;
  designProfile: DesignProfile;
  pages: BlueprintPage[];
  mediaBriefs: MediaBrief[];
  commercePlan: CommercePlan;
  rationale: BlueprintRationale;
};
```

Each `BlueprintPage` contains an ordered list of known section types and variant
IDs with validated settings, blocks, bindings, and truth references. The server
rejects unknown types, invalid settings, unsupported capabilities, fabricated
product facts, or incompatible page/section combinations. A deterministic
fallback blueprint remains available when OpenAI is unavailable.

Blueprint generation ranks several candidate compositions. Quality scoring
penalizes repeated layouts, insufficient proof, unsupported commerce controls,
poor mobile density, missing objections, excessive text, and repeated visual
rhythm. Only validated candidates reach the editor.

## 10. Step-by-step AI onboarding

The existing single intake form becomes a wizard after product import or format
selection:

1. Product/source confirmation.
2. Audience.
3. Primary problem or desired outcome.
4. Reasons to buy / value proposition.
5. Offer and purchase model.
6. Brand personality and visual references.
7. Market, language, and currency.
8. Page scope and conversion objective.
9. Review and build.

For every question, the server generates three or four suggestions from the
imported product analysis and prior answers. The user can:

- select one or more suggestions where the question allows it;
- reorder selected options when order matters;
- write an “Autre réponse” value;
- ask for new suggestions;
- go backward without losing answers;
- refresh and continue from the same step.

Suggestions are stored as suggestion IDs plus display text; user-authored values
are stored separately. OpenAI receives only the safe product truth sheet and
previously accepted answers. Loading is bounded, failures show a retryable French
message, and deterministic French fallbacks keep the wizard usable without AI.

## 11. Canardo 2.0

Canardo gains two modes behind the same chat:

### Composition mode

For requests that match the catalog, Canardo returns editor commands using
registered sections and variants. Example: “Ajoute un bundle premium avec trois
niveaux et une preuve client dessous.” The response proposes a command set,
shows a visual preview, explains Shopify requirements, and waits for confirmation.

### Custom-section mode

When no registered pack satisfies the request:

1. Canardo produces a declarative custom-section specification.
2. A server compiler maps supported primitives to namespaced HTML, CSS tokens,
   behavior modules, settings, and blocks.
3. Static validation rejects scripts, remote dependencies, unsafe URLs, global
   selectors, unsupported Liquid, and unbounded code.
4. The section renders in an isolated preview with desktop/mobile checks.
5. The merchant confirms insertion.
6. Publication compiles the same specification into a namespaced Liquid section
   with a valid schema.

Raw model-authored JavaScript or Liquid never executes. Unsupported requests are
returned as a clear limitation or a capability-installation action.

Successful custom specifications can be saved privately to the workspace. They
do not become global catalog sections without an internal review and versioned
pack release.

## 12. Shopify runtime and capability model

Define explicit capabilities:

- `product-form`
- `variant-selection`
- `quantity-breaks`
- `collection-binding`
- `recommendations`
- `fixed-bundle`
- `custom-bundle`
- `selling-plan`
- `preorder`
- `cart-drawer`
- `app-blocks`
- `markets`
- `localization`

The renderer uses Shopify global objects and product forms rather than snapshot
prices or variants. Interactive JavaScript is namespaced and reinitializes on
Shopify theme-editor section load/unload events.

Advanced bundles require a Weflo Shopify app extension and Cart Transform
function. Subscriptions and preorders integrate through supported selling-plan
or purchase-option providers. The editor visibly distinguishes native,
app-required, and unavailable behavior.

## 13. Theme adapters

`ThemeAdapter` exposes:

```ts
type ThemeAdapter = {
  id: string;
  detect(files: ThemeFile[]): AdapterConfidence;
  capabilities(files: ThemeFile[]): ThemeCapabilityReport;
  mapTokens(profile: DesignProfile): ThemePatch[];
  compileSection(section: EditorSection): ThemeFile[];
  compileTemplate(page: EditorPage): ThemeFile;
  requiredAssets(document: EditorDocument): ThemeFile[];
  validate(output: ThemeFile[]): ThemeValidationResult;
};
```

Adapters:

1. `weflo-native`: complete theme/template output controlled by Weflo.
2. `dawn`: first existing-theme compatibility target and reference baseline.
3. `minimog`: optional adapter developed only from legally usable inputs and
   kept isolated from the core engine.

The current compiler becomes the Weflo-native adapter. Theme-specific logic must
not leak into section definitions or the editor document.

## 14. Publication modes

### Add to an existing theme

- Duplicate the active theme unless the merchant explicitly chooses direct
  modification.
- Upload namespaced Weflo sections, snippets, and assets.
- Create a resource-specific JSON template.
- Preserve existing settings, sections, and app blocks.
- Return a Shopify preview URL before activation.

### Create a Weflo theme

- Generate or update a valid theme directory containing layout, templates,
  sections, blocks, snippets, assets, config, and locales.
- Package a downloadable ZIP and optionally upload it as an unpublished theme.
- Run theme validation before presenting it as uploadable.

Neither mode activates or overwrites a live theme without an explicit final
merchant confirmation.

## 15. Reference library and legal boundary

Merchant-provided store URLs, screenshots, and licensed theme archives form a
private reference library. Weflo extracts design facts such as hierarchy,
section sequence, media ratios, spacing rhythm, interaction patterns, and
commerce capabilities. It does not reuse third-party brand assets, copy,
reviews, customer photos, or proprietary code unless the merchant owns the
rights and requests that exact use.

Recommended reference package per store:

- public URL and target country;
- page type and product category;
- desktop and mobile captures;
- named sections/interactions worth retaining;
- expected Shopify behavior;
- theme name/version and proof of a usable license when source files are
  supplied.

## 16. Validation and testing

Every section pack must pass:

- schema and document validation;
- Web/Liquid content parity tests;
- Shopify schema parsing;
- Liquid/static Theme Check where available;
- desktop and mobile visual regression;
- keyboard and accessible-name checks;
- theme-editor lifecycle tests for interactive sections;
- product/variant/cart integration tests;
- truth-boundary tests preventing preview fixtures from entering customer pages;
- adapter output tests;
- upload smoke tests against a Shopify development store.

Blueprint and Canardo tests cover unknown section rejection, unsupported
capabilities, malicious custom specifications, missing product facts, country
adaptation, deterministic fallback, preview confirmation, and rollback.

## 17. Delivery phases

### Phase A — section-pack foundation

- Versioned section-pack contract and migrations.
- Expanded catalog taxonomy, search, filters, capability badges, and previews.
- Design profiles and shared Web/Liquid tokens.
- First 12 premium types with three meaningful variants each.
- Canardo composition mode for adding and rearranging registered packs through
  previewable, confirmable commands.

Commerce-dependent variants can be previewed during this phase only when they
carry an explicit “configuration Shopify requise” state. They cannot be
published as functional commerce until the corresponding Phase C capability
adapter passes validation.

### Phase B — AI composition and onboarding

- Step-by-step onboarding with OpenAI suggestions and custom answers.
- Validated Store Blueprint and candidate quality scoring.
- Country/language adaptation and multi-page project generation.

### Phase C — commerce runtime

- Product/variant/cart parity.
- Fixed bundle, multipack, subscription, and preorder capability adapters.
- Weflo theme app extension and customized-bundle Function.

### Phase D — adapters and delivery

- Weflo-native complete theme ZIP.
- Dawn adapter for existing themes.
- Theme upload validation and development-store smoke suite.
- Optional licensed Minimog adapter.

### Phase E — Canardo 2.0 custom sections

- Declarative custom-section compiler and isolated preview.
- Workspace-private saved sections with versioning and rollback.

Each phase must leave the product usable and must not advertise a Shopify
capability before its functional adapter is present.

## 18. Success criteria

- A merchant can find a section by commercial purpose and inspect a real
  desktop/mobile preview before insertion.
- Section variants change composition, not only copy or color.
- Editor output and Shopify preview have the same section order, content,
  responsive hierarchy, and supported interactions.
- Generated pages use product facts and merchant answers without preview/demo
  leakage.
- The same product can be reused in another page or localized project without
  reimporting it.
- A new theme ZIP passes validation and can be uploaded to a development store.
- Existing-theme publication creates a previewable template without destroying
  unrelated theme content.
- Bundle, subscription, and preorder controls either work through Shopify or are
  clearly marked unavailable with a setup action.
- Canardo can add a registered section through chat and can safely propose a
  validated custom composition when the catalog lacks one.

## 19. External references

- Shopify theme architecture: https://shopify.dev/docs/storefronts/themes/architecture
- Shopify sections: https://shopify.dev/docs/storefronts/themes/architecture/sections
- Shopify section schema: https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema
- Shopify blocks: https://shopify.dev/docs/storefronts/themes/architecture/blocks
- Shopify bundles: https://shopify.dev/docs/apps/build/product-merchandising/bundles
- Shopify bundle app: https://shopify.dev/docs/apps/build/product-merchandising/bundles/create-bundle-app
- Theme app extensions: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/build
