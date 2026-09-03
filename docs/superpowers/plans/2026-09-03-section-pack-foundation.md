# Section Pack Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shallow section registry with versioned, searchable premium section packs whose Web and Liquid variants share the same data, tokens, previews, and capability requirements.

**Architecture:** Normalize legacy section definitions into a strict `SectionPackDefinition` at the registry boundary, then upgrade the first 12 pack families. A separate design-profile layer supplies validated visual tokens; the editor catalog reads pack metadata and fixtures, never hard-coded switch statements.

**Tech Stack:** TypeScript 5.9, Vitest, server-rendered HTML/CSS, existing immutable editor commands and native pointer/drag events.

**Spec:** `docs/superpowers/specs/2026-09-03-hybrid-shopify-section-engine-design.md`

## Global Constraints

- Customer documents must never contain `previewOnly`, `previewFixtureId`, fixture IDs, or fixture brand names.
- A variant changes composition or interaction, not only copy, color, or imagery.
- Model-authored CSS, JavaScript, and Liquid are not accepted by this plan.
- Existing editor documents remain readable through deterministic migration.
- French is the default UI language; Shopify resource identifiers remain stable ASCII handles.
- Do not advertise a commerce capability as functional before its adapter reports `available`.

---

### Task 1: Versioned section-pack contract

**Files:**
- Modify: `src/sections/types.ts`
- Modify: `src/sections/registry.ts`
- Create: `src/sections/capabilities.ts`
- Test: `tests/section-pack-contract.test.ts`

**Interfaces:**
- Produces: `SectionPackDefinition`, `SectionVariantDefinition`, `SectionCapability`, `normalizeSectionPack()`, `getSectionPack()`, `listSectionPacks()`.
- Consumes: existing `SectionDefinition`, `EditorPageKind`, and render functions.

- [ ] **Step 1: Write the failing normalization tests**

```ts
it("normalizes a legacy definition into pack version 1", () => {
  const pack = normalizeSectionPack(legacyHero);
  expect(pack.packVersion).toBe(1);
  expect(pack.families).toEqual(["heroes"]);
  expect(pack.variants.map((item) => item.id)).toEqual(["default"]);
});

it("rejects a duplicate variant id", () => {
  expect(() => normalizeSectionPack({ ...legacyHero, variants: [variant, variant] }))
    .toThrow("Duplicate section variant");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run tests/section-pack-contract.test.ts`

Expected: FAIL because `normalizeSectionPack` and the pack types do not exist.

- [ ] **Step 3: Implement the normalized contract**

```ts
export type SectionCapability =
  | "product-form" | "variant-selection" | "quantity-breaks"
  | "collection-binding" | "recommendations" | "fixed-bundle"
  | "custom-bundle" | "selling-plan" | "preorder" | "cart-drawer"
  | "app-blocks" | "markets" | "localization";

export type SectionFamily =
  | "headers-navigation" | "heroes" | "product-purchase"
  | "variants-options" | "bundles-offers" | "subscriptions-preorders"
  | "benefits" | "demo-media" | "before-after" | "reviews-ugc"
  | "comparison" | "ingredients-materials" | "collections-recommendations"
  | "brand-story" | "advertorial" | "listicle" | "quiz-forms"
  | "faq-trust" | "conversion-capture" | "footer-utilities" | "custom";

export type SectionVariantDefinition = {
  id: string; name: string; description: string;
  composition: string; previewFixtureId: string;
  defaults: Record<string, SettingValue>;
};

export type SectionPackDefinition = SectionDefinition & {
  packVersion: 1;
  families: SectionFamily[];
  tags: string[];
  supportedPages: EditorPageKind[];
  supportedMarkets: string[];
  capabilities: SectionCapability[];
  variants: SectionVariantDefinition[];
  assets: string[];
  renderSchema(section: EditorSection): Record<string, unknown>;
  migrate(section: EditorSection, fromPackVersion: number): EditorSection;
};
```

Make `registerSection()` normalize once and store only `SectionPackDefinition`.
Map legacy categories to one deterministic family and synthesize a `default`
variant only for sections not yet in the premium catalog.

- [ ] **Step 4: Run registry regression tests**

Run: `npx vitest run tests/section-pack-contract.test.ts tests/section-registry.test.ts tests/editor-renderer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add src/sections/types.ts src/sections/registry.ts src/sections/capabilities.ts tests/section-pack-contract.test.ts
git commit -m "feat: add versioned section pack contract"
```

### Task 2: Validated design profiles and document migration

**Files:**
- Create: `src/design/profile.ts`
- Create: `src/design/tokens.ts`
- Modify: `src/editor/document.ts`
- Modify: `src/editor/migrate.ts`
- Modify: `src/editor/render/render-document.ts`
- Test: `tests/design-profile.test.ts`
- Test: `tests/editor-migrate.test.ts`

**Interfaces:**
- Consumes: `ArtDirectionProfile`, `EditorDocument`.
- Produces: `DesignProfile`, `validateDesignProfile(value)`, `profileFromArtDirection(profile)`, `designTokenStyle(profile)`.

- [ ] **Step 1: Write failing validation and migration tests**

```ts
it("rejects an unsafe font and clamps no values silently", () => {
  const result = validateDesignProfile({ ...validProfile, typography: { ...validProfile.typography, heading: "url(x)" } });
  expect(result).toEqual({ ok: false, errors: ["Police de titre invalide."] });
});

it("derives a stable design profile for a v2 document", () => {
  expect(migrateEditorDocument(v2Document).designProfile?.archetype).toBe("natural");
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx vitest run tests/design-profile.test.ts tests/editor-migrate.test.ts`

Expected: FAIL on missing `designProfile` and validator.

- [ ] **Step 3: Implement bounded tokens**

```ts
export type DesignProfile = {
  id: string;
  market: string;
  archetype: "editorial" | "clinical" | "playful" | "luxury" | "technical" | "natural" | "sport" | "utility";
  typography: { heading: string; body: string; scale: number };
  colors: { background: string; surface: string; ink: string; accent: string };
  spacing: { section: number; gap: number };
  radius: { card: number; button: number };
  borders: { width: number; color: string };
  media: { ratio: "portrait" | "square" | "landscape"; treatment: "clean" | "editorial" | "immersive" };
  motion: { reveal: "none" | "fade" | "slide"; durationMs: number };
  density: "airy" | "balanced" | "dense";
};
```

Allow only configured font names, hex colors, scale `0.8..1.4`, spacing
`0..160`, radius `0..48`, and motion `0..800`. Migration derives tokens from
the existing art direction without changing document version.

- [ ] **Step 4: Run design, migration, and renderer tests**

Run: `npx vitest run tests/design-profile.test.ts tests/editor-migrate.test.ts tests/editor-renderer.test.ts`

Expected: PASS and no snapshot contains `[object Object]` or unsafe CSS.

- [ ] **Step 5: Commit**

```bash
git add src/design src/editor/document.ts src/editor/migrate.ts src/editor/render/render-document.ts tests/design-profile.test.ts tests/editor-migrate.test.ts
git commit -m "feat: add shared design profiles"
```

### Task 3: Purpose-led catalog and realistic previews

**Files:**
- Modify: `src/section-preview/types.ts`
- Modify: `src/section-preview/manifests.ts`
- Modify: `src/section-preview/materialize.ts`
- Modify: `src/editor/ui/section-catalog.ts`
- Modify: `src/editor/ui/section-catalog.css`
- Modify: `src/editor/ui/section-preview-dialog.ts`
- Test: `tests/section-preview-catalog.test.ts`
- Test: `tests/section-preview-materialize.test.ts`

**Interfaces:**
- Consumes: `listSectionPacks()`, `SectionVariantDefinition`, fixtures.
- Produces: `SectionCatalogQuery`, `querySectionCatalog(query)`, capability badge markup.

- [ ] **Step 1: Write failing taxonomy and truth-boundary tests**

```ts
expect(querySectionCatalog({ family: "bundles-offers", search: "quantité", pageKind: "product" })
  .some((item) => item.variantId === "quantity-ladder")).toBe(true);

const inserted = materializeSectionVariant(input);
expect(JSON.stringify(inserted.section)).not.toMatch(/previewOnly|halo-lamp|LumiWall/);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/section-preview-catalog.test.ts tests/section-preview-materialize.test.ts`

Expected: FAIL because the expanded query API and variants are absent.

- [ ] **Step 3: Implement catalog querying and preview metadata**

```ts
export type SectionCatalogQuery = {
  family?: SectionFamily;
  search?: string;
  pageKind?: EditorPageKind;
  market?: string;
  capability?: SectionCapability;
  sort?: "recommended" | "newest" | "popular";
};
```

Render French family tabs, search, desktop/mobile toggles, large preview,
required Shopify data, and `native`, `application requise`, or `indisponible`
badges. Build results from registry metadata; do not duplicate manifest arrays.

- [ ] **Step 4: Run preview and editor catalog tests**

Run: `npx vitest run tests/section-preview-*.test.ts tests/editor-left-rail.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/section-preview src/editor/ui/section-catalog.ts src/editor/ui/section-catalog.css src/editor/ui/section-preview-dialog.ts tests/section-preview-catalog.test.ts tests/section-preview-materialize.test.ts
git commit -m "feat: add purpose-led section catalog"
```

### Task 4: First 12 premium pack families

**Files:**
- Create: `src/sections/packs/product-packs.ts`
- Create: `src/sections/packs/offer-packs.ts`
- Create: `src/sections/packs/proof-packs.ts`
- Create: `src/sections/packs/discovery-packs.ts`
- Modify: `src/sections/index.ts`
- Modify: `src/sections/shared.ts`
- Test: `tests/premium-section-packs.test.ts`
- Test: `tests/shopify-compiler.test.ts`

**Interfaces:**
- Consumes: `SectionPackDefinition`, `DesignProfile`, standard `product` Liquid object.
- Produces: 12 registered families and 36 named variants; no external runtime yet.

- [ ] **Step 1: Write the failing inventory test**

```ts
const required = ["product-hero", "buy-box", "variant-selector", "quantity-offer", "fixed-bundle", "benefits-results", "product-media", "before-after", "reviews-ugc", "comparison", "faq-trust", "recommendations"];
for (const family of required) {
  const variants = listSectionPacks().flatMap((pack) => pack.families.includes(family as SectionFamily) ? pack.variants : []);
  expect(new Set(variants.map((item) => item.composition)).size).toBeGreaterThanOrEqual(3);
}
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/premium-section-packs.test.ts`

Expected: FAIL with missing families and fewer than 36 compositions.

- [ ] **Step 3: Implement the packs using shared primitives**

Use stable settings (`heading`, `body`, `image`, `product`, `collection`) and
stable block types (`media`, `benefit`, `offer`, `review`, `row`, `faq`). Each
renderer branches on `section.settings.variant`, emits namespaced `wf-*`
classes, and Liquid purchase controls use `{% form 'product', product %}`.
Capability-dependent controls render an editor setup card unless available.

- [ ] **Step 4: Verify Web/Liquid parity**

Run: `npx vitest run tests/premium-section-packs.test.ts tests/sections-*.test.ts tests/shopify-compiler.test.ts`

Expected: PASS; every pack has schema settings, presets, and a customer-safe Web rendering.

- [ ] **Step 5: Commit**

```bash
git add src/sections/packs src/sections/index.ts src/sections/shared.ts tests/premium-section-packs.test.ts tests/shopify-compiler.test.ts
git commit -m "feat: add premium Shopify section packs"
```

### Task 5: Page-format content packs

**Files:**
- Create: `src/sections/packs/advertorial-packs.ts`
- Create: `src/sections/packs/listicle-packs.ts`
- Create: `src/sections/packs/quiz-packs.ts`
- Create: `src/sections/packs/brand-story-packs.ts`
- Modify: `src/sections/index.ts`
- Modify: `src/onboarding/template-recipe.ts`
- Test: `tests/page-format-section-packs.test.ts`

**Interfaces:**
- Consumes: `SectionPackDefinition`, stable block types, registered product card.
- Produces: complete section sequences for advertorial, listicle, quiz/funnel,
  landing close, and brand-story pages.

- [ ] **Step 1: Write the failing format-completeness tests**

```ts
expect(packTypesFor("advertorial")).toEqual(expect.arrayContaining(["advertorialMasthead", "editorialBody", "evidenceCallout", "inlineProduct", "conversionClose"]));
expect(packTypesFor("quiz")).toEqual(expect.arrayContaining(["quizProgress", "quizQuestion", "quizResult", "productRecommendation", "leadCapture"]));
for (const recipe of ["advertorial", "listicle", "quiz", "landing"]) expect(validateRecipe(recipe).missing).toEqual([]);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/page-format-section-packs.test.ts tests/template-recipes.test.ts`

Expected: FAIL because complete page-format sequences are absent.

- [ ] **Step 3: Implement the content primitives and recipes**

Advertorial includes masthead, author line, editorial chapters, evidence
callouts, inline product cards, and mid/final CTAs. Listicle includes index,
numbered reasons, comparison inserts, and recommendations. Quiz includes
progress, single/multiple choice blocks, deterministic result mapping, product
recommendation, and consent-aware lead capture. Each format has at least three
design-profile-compatible compositions and compiles to Liquid blocks/settings.

- [ ] **Step 4: Run format, renderer, and compiler tests**

Run: `npx vitest run tests/page-format-section-packs.test.ts tests/template-recipes.test.ts tests/editor-renderer.test.ts tests/shopify-compiler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sections/packs src/sections/index.ts src/onboarding/template-recipe.ts tests/page-format-section-packs.test.ts
git commit -m "feat: add premium page format section packs"
```

### Task 6: Drag, insert, preview, and Canardo composition

**Files:**
- Modify: `src/editor/ui/drag-sections.ts`
- Modify: `src/editor/ui/left-rail.ts`
- Modify: `src/canardo/context.ts`
- Modify: `src/canardo/local-planner.ts`
- Modify: `src/canardo/protocol.ts`
- Modify: `src/editor/ui/canardo-review.ts`
- Test: `tests/editor-direct-manipulation.test.ts`
- Test: `tests/canardo-composition.test.ts`

**Interfaces:**
- Consumes: `querySectionCatalog()`, `materializeSectionVariant()`, `EditorCommand[]`.
- Produces: `proposeCatalogComposition(prompt, context): CanardoResponse` containing only registered variants and confirmable commands.

- [ ] **Step 1: Write failing drag and Canardo proposal tests**

```ts
expect(proposeCatalogComposition("Ajoute un bundle premium puis trois avis", context).operations)
  .toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "insertSection" }),
    expect.objectContaining({ type: "insertSection" }),
  ]));
expect(response.requiresConfirmation).toBe(true);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/editor-direct-manipulation.test.ts tests/canardo-composition.test.ts`

Expected: FAIL on the missing composition planner.

- [ ] **Step 3: Implement registered-pack composition only**

Pass compact pack IDs, variant IDs, purposes, and capability states to Canardo.
Validate every returned `sectionType:variantId`, materialize with customer data,
show the proposed section previews in the review panel, and dispatch commands
only after confirmation. Keep pointer drag keyboard-accessible with move-up and
move-down commands as equivalent controls.

- [ ] **Step 4: Run the editor acceptance set**

Run: `npx vitest run tests/editor-*.test.ts tests/canardo-*.test.ts tests/section-preview-*.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the phase gate and commit**

Run: `npm test && npm run build`

```bash
git add src/editor/ui src/canardo tests/editor-direct-manipulation.test.ts tests/canardo-composition.test.ts
git commit -m "feat: compose premium sections with Canardo"
```
