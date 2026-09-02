# Section Preview System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast catalogue of premium Shopify section variants with desktop/mobile captures, six fictional product fixtures, an interactive full-screen preview, and safe insertion using the customer’s real product and brand.

**Architecture:** Extend each registered section with a validated preview manifest. A pure fixture and materialization layer creates temporary demonstration documents and converts a chosen variant into a customer-safe `EditorSection`; the catalogue loads generated WebP captures first and mounts the real renderer only for interactive preview. A Playwright script generates and validates capture assets from the same `renderEditorDocument` path used by the editor.

**Tech Stack:** TypeScript 5.9, Vitest 3, existing Weflo editor document/section registry, browser `iframe.srcdoc`, Playwright/Chromium for deterministic screenshots, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-02-section-preview-system-design.md`

## Global Constraints

- Preview and inserted sections must use the same `renderEditorDocument` and registered section renderers.
- Fictional testimonials and commercial proof are preview-only and must never persist into a customer document.
- First delivery contains six fixture brands and at least twelve variants across Hero, Product, Benefits, Reviews, Bundle, and FAQ.
- Initial catalogue display uses static WebP captures; interactive rendering starts only when the user opens the full preview.
- Desktop capture viewport is 1440 px wide; mobile capture viewport is 390 px wide.
- A failure in one variant must not block the rest of the catalogue.
- Do not copy Minimog code, text, media, or identifiable compositions.
- Preserve the existing `_tmp/edge-landing/` and `_tmp/landing-captures/` directories without staging or modifying them.

---

## File Map

- `src/section-preview/types.ts`: public preview, fixture, and materialization types.
- `src/section-preview/fixtures.ts`: six fictional commerce fixtures and lookup functions.
- `src/section-preview/manifests.ts`: twelve initial variant manifests and validation.
- `src/section-preview/materialize.ts`: fixture-to-section and customer-safe insertion logic.
- `src/section-preview/document.ts`: temporary preview document creation.
- `src/editor/ui/section-catalog.ts`: catalogue cards, filters, and markup.
- `src/editor/ui/section-preview-dialog.ts`: interactive dialog and viewport/fixture controls.
- `src/editor/ui/panels/add-section.ts`: mounts the new catalogue instead of generic thumbnails.
- `src/editor/ui/left-rail.ts`: delegates preview/open/insert actions.
- `src/sections/{product-hero,product-main,benefits,testimonials,bundle,faq}.ts`: render initial variant layouts.
- `scripts/generate-section-previews.mjs`: deterministic WebP generation and structural QA.
- `public/assets/section-previews/`: generated preview images and manifest JSON.
- `tests/section-preview-*.test.ts`: unit and integration coverage.

---

### Task 1: Fictional Product Fixture Registry

**Files:**
- Create: `src/section-preview/types.ts`
- Create: `src/section-preview/fixtures.ts`
- Test: `tests/section-preview-fixtures.test.ts`

**Interfaces:**
- Produces: `SectionPreviewFixture`, `SECTION_PREVIEW_FIXTURES`, `fixtureById(id)`, `fixturesForArchetypes(archetypes)`.
- Consumes: `ImportedProduct`, `BrandKit`, and `PageTheme` from the existing onboarding/editor model.

- [ ] **Step 1: Write the failing fixture contract test**

```ts
import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_FIXTURES, fixtureById } from "../src/section-preview/fixtures";

describe("section preview fixtures", () => {
  it("provides six complete, uniquely branded fictional products", () => {
    expect(SECTION_PREVIEW_FIXTURES.map((item) => item.id)).toEqual([
      "aurea-serum", "halo-lamp", "noma-bag", "pulse-recovery", "brume-coffee", "forma-table",
    ]);
    expect(new Set(SECTION_PREVIEW_FIXTURES.map((item) => item.brand.name)).size).toBe(6);
    expect(SECTION_PREVIEW_FIXTURES.every((item) => item.product.images.length >= 3)).toBe(true);
    expect(SECTION_PREVIEW_FIXTURES.every((item) => item.previewOnly.reviews.length >= 3)).toBe(true);
    expect(fixtureById("halo-lamp").product.title).toMatch(/lampe/i);
  });
});
```

- [ ] **Step 2: Run the fixture test and verify the missing-module failure**

Run: `npx vitest run tests/section-preview-fixtures.test.ts`

Expected: FAIL because `src/section-preview/fixtures.ts` does not exist.

- [ ] **Step 3: Define the fixture types and all six fixtures**

```ts
// src/section-preview/types.ts
import type { EditorDocument, EditorSection } from "../editor/document";
import type { BrandKit, ImportedProduct } from "../onboarding/types";
import type { PageTheme } from "../types";

export type PreviewArchetype = "beauty" | "home" | "gadget" | "fashion" | "sport" | "wellness" | "food" | "design";
export type PreviewViewport = "desktop" | "mobile";

export type SectionPreviewFixture = {
  id: string;
  archetypes: PreviewArchetype[];
  brand: BrandKit & { name: string };
  theme: PageTheme;
  product: ImportedProduct;
  previewOnly: {
    benefits: Array<{ title: string; text: string }>;
    reviews: Array<{ author: string; title: string; text: string; rating: number }>;
    faqs: Array<{ question: string; answer: string }>;
    bundles: Array<{ title: string; quantity: number; price: string; badge?: string }>;
  };
};

export type MaterializeInput = {
  document: EditorDocument;
  sectionType: string;
  variantId: string;
  sectionId: string;
};

export type MaterializeResult = { section: EditorSection; missingFields: string[] };
```

Create `SECTION_PREVIEW_FIXTURES` with the exact six IDs asserted by the test. Give every fixture three HTTPS media URLs, a complete palette/font kit, real-looking but fictional product information, and preview-only benefits/reviews/FAQs/bundles. Export strict lookup functions that throw `Unknown preview fixture: <id>` for an invalid ID.

- [ ] **Step 4: Run the fixture tests**

Run: `npx vitest run tests/section-preview-fixtures.test.ts`

Expected: PASS, 1 test.

- [ ] **Step 5: Commit the fixture registry**

```bash
git add src/section-preview/types.ts src/section-preview/fixtures.ts tests/section-preview-fixtures.test.ts
git commit -m "feat: add section preview fixtures"
```

---

### Task 2: Validated Variant Manifest Registry

**Files:**
- Create: `src/section-preview/manifests.ts`
- Modify: `src/sections/types.ts`
- Modify: `src/sections/registry.ts`
- Test: `tests/section-preview-manifests.test.ts`
- Test: `tests/section-registry.test.ts`

**Interfaces:**
- Consumes: `PreviewArchetype`, fixture IDs, existing `SectionDefinition`.
- Produces: `SectionPreviewManifest`, `SECTION_PREVIEW_MANIFESTS`, `previewManifest(type, variantId)`, `previewManifestsForCategory(category)`.

- [ ] **Step 1: Write failing manifest validation tests**

```ts
import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_MANIFESTS, previewManifest } from "../src/section-preview/manifests";

describe("section preview manifests", () => {
  it("ships twelve unique variants across the six required section types", () => {
    expect(SECTION_PREVIEW_MANIFESTS).toHaveLength(12);
    expect(new Set(SECTION_PREVIEW_MANIFESTS.map((item) => `${item.sectionType}:${item.variantId}`)).size).toBe(12);
    expect(new Set(SECTION_PREVIEW_MANIFESTS.map((item) => item.sectionType))).toEqual(
      new Set(["productHero", "productMain", "benefits", "testimonials", "bundle", "faq"]),
    );
  });

  it("resolves every fixture and generates stable asset paths", () => {
    const manifest = previewManifest("productHero", "beauty-editorial");
    expect(manifest.defaultFixtureId).toBe("aurea-serum");
    expect(manifest.preview.desktop).toMatch(/^\/assets\/section-previews\/productHero\//);
    expect(manifest.preview.mobile).toMatch(/-mobile\.webp$/);
  });
});
```

- [ ] **Step 2: Run the manifest tests and verify failure**

Run: `npx vitest run tests/section-preview-manifests.test.ts tests/section-registry.test.ts`

Expected: FAIL because the manifest registry and preview metadata do not exist.

- [ ] **Step 3: Implement the manifest registry**

```ts
export type SectionPreviewManifest = {
  sectionType: string;
  variantId: string;
  title: string;
  conversionGoal: string;
  category: "hero" | "product" | "benefits" | "proof" | "offer" | "faq";
  supportedArchetypes: PreviewArchetype[];
  defaultFixtureId: string;
  compatibleFixtureIds: string[];
  preview: { desktop: string; mobile: string };
  previewVersion: number;
};
```

Register exactly these initial variants:

```ts
[
  ["productHero", "beauty-editorial"], ["productHero", "object-editorial"],
  ["productMain", "conversion-split"], ["productMain", "bundle-led"],
  ["benefits", "ritual-cards"], ["benefits", "technical-grid"],
  ["testimonials", "editorial-stories"], ["testimonials", "ugc-grid"],
  ["bundle", "routine-set"], ["bundle", "quantity-break"],
  ["faq", "editorial-accordion"], ["faq", "support-columns"],
]
```

Build preview paths from `sectionType`, `variantId`, `defaultFixtureId`, and viewport. Validate uniqueness and fixture compatibility at module load. Add optional `previewVariants?: string[]` to `SectionDefinition`; registry validation must verify that each declared variant has a manifest.

- [ ] **Step 4: Run manifest and registry tests**

Run: `npx vitest run tests/section-preview-manifests.test.ts tests/section-registry.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit manifest support**

```bash
git add src/section-preview/manifests.ts src/sections/types.ts src/sections/registry.ts tests/section-preview-manifests.test.ts tests/section-registry.test.ts
git commit -m "feat: register previewable section variants"
```

---

### Task 3: Preview Materialization and Fictional-Proof Guard

**Files:**
- Create: `src/section-preview/materialize.ts`
- Test: `tests/section-preview-materialize.test.ts`

**Interfaces:**
- Consumes: `fixtureById`, `previewManifest`, `getSectionDefinition`, `EditorDocument`.
- Produces: `sectionFromFixture(type, variantId, fixtureId, sectionId)` and `materializeSectionVariant(input): MaterializeResult`.

- [ ] **Step 1: Write failing preview/customer materialization tests**

```ts
import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { materializeSectionVariant, sectionFromFixture } from "../src/section-preview/materialize";

describe("section variant materialization", () => {
  it("marks fictional proof as preview-only", () => {
    const section = sectionFromFixture("testimonials", "ugc-grid", "aurea-serum", "preview-1");
    expect(section.settings.previewFixtureId).toBe("aurea-serum");
    expect(section.settings.previewOnly).toBe(true);
    expect(section.blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("uses customer commerce and removes fictional reviews on insertion", () => {
    const document = migrateDocument(blankDocument("Ma boutique"), "product");
    const result = materializeSectionVariant({ document, sectionType: "testimonials", variantId: "ugc-grid", sectionId: "customer-1" });
    expect(result.section.settings.previewFixtureId).toBeUndefined();
    expect(result.section.settings.previewOnly).toBeUndefined();
    expect(result.section.blocks).toHaveLength(0);
    expect(result.missingFields).toContain("reviews");
  });
});
```

- [ ] **Step 2: Run the materialization test and verify failure**

Run: `npx vitest run tests/section-preview-materialize.test.ts`

Expected: FAIL because the materializer does not exist.

- [ ] **Step 3: Implement pure preview and customer materializers**

`sectionFromFixture` starts from the registered definition defaults, writes `variant`, `previewFixtureId`, and `previewOnly`, then maps fixture data by type. `materializeSectionVariant` starts from the same defaults but only reads `document.commerce`; it must never call `fixtureById`.

```ts
export function materializeSectionVariant(input: MaterializeInput): MaterializeResult {
  const definition = requiredDefinition(input.sectionType);
  const product = input.document.commerce?.sourceProduct;
  const settings = { ...definition.defaults, variant: input.variantId };
  const missingFields: string[] = [];
  if (product?.title) settings.title = product.title; else missingFields.push("product.title");
  if (product?.images[0]) settings.image = product.images[0]; else missingFields.push("product.image");
  const blocks = safeCustomerBlocks(input.sectionType, input.document, missingFields);
  return { section: makeSection(input.sectionId, definition, settings, blocks), missingFields };
}
```

For `testimonials`, `safeCustomerBlocks` returns only reviews present in customer commerce data; otherwise it returns `[]` and adds `reviews`. Add a recursive assertion that rejects `previewFixtureId`, `previewOnly`, and known fictional brand names in customer results.

- [ ] **Step 4: Run materialization tests**

Run: `npx vitest run tests/section-preview-materialize.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit safe materialization**

```bash
git add src/section-preview/materialize.ts tests/section-preview-materialize.test.ts
git commit -m "feat: materialize safe section variants"
```

---

### Task 4: Shared Preview Document Renderer

**Files:**
- Create: `src/section-preview/document.ts`
- Test: `tests/section-preview-document.test.ts`

**Interfaces:**
- Consumes: `sectionFromFixture`, `fixtureById`, `renderEditorDocument`.
- Produces: `previewDocument(input)` and `renderSectionPreview(input)`.

- [ ] **Step 1: Write the failing shared-render-path test**

```ts
import { describe, expect, it } from "vitest";
import { previewDocument, renderSectionPreview } from "../src/section-preview/document";

describe("section preview document", () => {
  it("renders a fixture through the real editor renderer", () => {
    const document = previewDocument({ sectionType: "productHero", variantId: "beauty-editorial", fixtureId: "aurea-serum", context: true });
    expect(document.version).toBe(2);
    expect(document.pages[0].sections.some((section) => section.settings.variant === "beauty-editorial")).toBe(true);
    const html = renderSectionPreview({ sectionType: "productHero", variantId: "beauty-editorial", fixtureId: "aurea-serum", viewport: "mobile", context: false });
    expect(html).toContain('data-wf-breakpoint="mobile"');
    expect(html).toContain("Auréa");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run tests/section-preview-document.test.ts`

Expected: FAIL because the preview document builder does not exist.

- [ ] **Step 3: Implement temporary preview documents**

```ts
export function renderSectionPreview(input: PreviewDocumentInput & { viewport: PreviewViewport }): string {
  const document = previewDocument(input);
  const rendered = renderEditorDocument(document, { mode: "preview", breakpoint: input.viewport });
  return rendered.replace("<body ", `<body data-section-preview="true" data-preview-fixture="${escapeAttribute(input.fixtureId)}" `);
}
```

`previewDocument` creates an `EditorDocument` with fixture theme/commerce and a temporary page. With `context: false`, include only the chosen section. With `context: true`, wrap it in the fixture-compatible navigation and trust/CTA context; all context sections must also carry `previewOnly: true`.

- [ ] **Step 4: Run document tests plus existing renderer tests**

Run: `npx vitest run tests/section-preview-document.test.ts tests/editor-renderer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the preview document renderer**

```bash
git add src/section-preview/document.ts tests/section-preview-document.test.ts
git commit -m "feat: render interactive section previews"
```

---

### Task 5: Twelve Real Section Layout Variants

**Files:**
- Modify: `src/sections/product-hero.ts`
- Modify: `src/sections/product-main.ts`
- Modify: `src/sections/benefits.ts`
- Modify: `src/sections/testimonials.ts`
- Modify: `src/sections/bundle.ts`
- Modify: `src/sections/faq.ts`
- Modify: `src/editor/render/render-document.ts`
- Test: `tests/premium-section-variants.test.ts`

**Interfaces:**
- Consumes: section `settings.variant` values declared in Task 2.
- Produces: distinct semantic Web render for every variant while preserving each section’s existing Liquid renderer contract.

- [ ] **Step 1: Extend the failing variant renderer test**

```ts
it.each([
  ["productHero", "beauty-editorial", "wf-product-hero--beauty-editorial"],
  ["productHero", "object-editorial", "wf-product-hero--object-editorial"],
  ["productMain", "conversion-split", "wf-product-main--conversion-split"],
  ["productMain", "bundle-led", "wf-product-main--bundle-led"],
  ["benefits", "ritual-cards", "wf-benefits--ritual-cards"],
  ["benefits", "technical-grid", "wf-benefits--technical-grid"],
  ["testimonials", "editorial-stories", "wf-testimonials--editorial-stories"],
  ["testimonials", "ugc-grid", "wf-testimonials--ugc-grid"],
  ["bundle", "routine-set", "wf-bundle--routine-set"],
  ["bundle", "quantity-break", "wf-bundle--quantity-break"],
  ["faq", "editorial-accordion", "wf-faq--editorial-accordion"],
  ["faq", "support-columns", "wf-faq--support-columns"],
])("renders %s/%s as a distinct layout", (type, variant, className) => {
  expect(renderVariant(type, variant)).toContain(className);
});
```

- [ ] **Step 2: Run the variant test and verify failure**

Run: `npx vitest run tests/premium-section-variants.test.ts`

Expected: FAIL for the new variant class assertions.

- [ ] **Step 3: Implement explicit variant dispatch in each section**

Use an explicit whitelist, never interpolate an unchecked class name:

```ts
const PRODUCT_HERO_VARIANTS = new Set(["beauty-editorial", "object-editorial"]);
const requested = String(section.settings.variant ?? "");
const variant = PRODUCT_HERO_VARIANTS.has(requested) ? requested : "beauty-editorial";
return `<div class="wf-v2-wrap wf-product-hero wf-product-hero--${variant}">...</div>`;
```

Build visibly different compositions rather than color-only variations: media-first editorial split versus product-object composition; sticky conversion split versus bundle-led buy box; ritual cards versus numbered technical grid; editorial stories versus image-led UGC grid; routine set versus quantity breaks; accordion versus two-column support list. Add shared responsive CSS to `render-document.ts`, keeping mobile single-column and touch targets at least 44 px tall.

- [ ] **Step 4: Run section and renderer tests**

Run: `npx vitest run tests/premium-section-variants.test.ts tests/sections-commerce.test.ts tests/sections-conversion.test.ts tests/editor-renderer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the initial Theme Kernel variants**

```bash
git add src/sections/product-hero.ts src/sections/product-main.ts src/sections/benefits.ts src/sections/testimonials.ts src/sections/bundle.ts src/sections/faq.ts src/editor/render/render-document.ts tests/premium-section-variants.test.ts
git commit -m "feat: add twelve premium section variants"
```

---

### Task 6: Premium Section Catalogue and Interactive Dialog

**Files:**
- Create: `src/editor/ui/section-catalog.ts`
- Create: `src/editor/ui/section-preview-dialog.ts`
- Modify: `src/editor/ui/panels/add-section.ts`
- Modify: `src/editor/ui/left-rail.ts`
- Modify: `src/editor/ui/layout.css`
- Test: `tests/section-preview-catalog.test.ts`
- Test: `tests/editor-left-rail.test.ts`

**Interfaces:**
- Consumes: manifest registry, fixture registry, `renderSectionPreview`, `materializeSectionVariant`, editor store.
- Produces: `sectionCatalogMarkup`, `openSectionPreviewDialog`, catalogue action events `{ action: "previewVariant" | "insertVariant" }`.

- [ ] **Step 1: Write failing catalogue markup tests**

```ts
import { describe, expect, it } from "vitest";
import { sectionCatalogMarkup } from "../src/editor/ui/section-catalog";

describe("section preview catalogue", () => {
  it("uses static captures and exposes preview and insert actions", () => {
    const html = sectionCatalogMarkup({ category: "hero", viewport: "desktop" });
    expect(html).toContain("beauty-editorial");
    expect(html).toContain("/assets/section-previews/productHero/");
    expect(html).toContain('data-section-preview-open="productHero:beauty-editorial"');
    expect(html).toContain('data-section-variant-insert="productHero:beauty-editorial"');
    expect(html).not.toContain("<iframe");
  });
});
```

- [ ] **Step 2: Run catalogue tests and verify failure**

Run: `npx vitest run tests/section-preview-catalog.test.ts tests/editor-left-rail.test.ts`

Expected: FAIL because the catalogue module does not exist and the old panel has no variant actions.

- [ ] **Step 3: Implement static catalogue cards**

```ts
export function sectionCatalogMarkup(input: { category?: string; viewport: PreviewViewport }): string {
  return filteredManifests(input.category).map((manifest) => `
    <article class="section-catalog-card" data-section-variant="${escape(manifest.sectionType)}:${escape(manifest.variantId)}">
      <img src="${escape(manifest.preview[input.viewport])}" alt="Aperçu ${escape(manifest.title)}" loading="lazy">
      <div><small>${escape(manifest.conversionGoal)}</small><strong>${escape(manifest.title)}</strong></div>
      <button type="button" data-section-preview-open="${escape(manifest.sectionType)}:${escape(manifest.variantId)}">Voir en grand</button>
      <button type="button" data-section-variant-insert="${escape(manifest.sectionType)}:${escape(manifest.variantId)}">Ajouter</button>
    </article>`).join("");
}
```

Keep category filters and desktop/mobile controls in the add panel. If an image errors, replace only that card’s media area with a lazy iframe using `renderSectionPreview`.

- [ ] **Step 4: Implement the interactive dialog**

`openSectionPreviewDialog` creates one native `<dialog>`, fills its iframe `srcdoc` only on open, and rebuilds it when fixture, context, or viewport changes. The close button restores focus to the triggering card. The dialog contains labels in French, Escape support, `aria-modal="true"`, and an « Ajouter cette section » action.

```ts
export type SectionPreviewDialogOptions = {
  sectionType: string;
  variantId: string;
  fixtureId: string;
  onInsert(sectionType: string, variantId: string): void;
};
```

Route insert actions through `materializeSectionVariant` and the existing `insertSection` command. Show `missingFields` as a non-blocking inspector notice after insertion.

- [ ] **Step 5: Run catalogue and rail tests**

Run: `npx vitest run tests/section-preview-catalog.test.ts tests/editor-left-rail.test.ts tests/editor-commands.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the catalogue experience**

```bash
git add src/editor/ui/section-catalog.ts src/editor/ui/section-preview-dialog.ts src/editor/ui/panels/add-section.ts src/editor/ui/left-rail.ts src/editor/ui/layout.css tests/section-preview-catalog.test.ts tests/editor-left-rail.test.ts
git commit -m "feat: add interactive section catalogue"
```

---

### Task 7: Deterministic Preview Capture Pipeline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/generate-section-previews.mjs`
- Create: `scripts/section-preview-page.ts`
- Create: `tests/section-preview-assets.test.ts`
- Generate: `public/assets/section-previews/**/*.webp`
- Generate: `public/assets/section-previews/manifest.json`

**Interfaces:**
- Consumes: `SECTION_PREVIEW_MANIFESTS`, `renderSectionPreview`.
- Produces: `npm run previews:sections`, capture assets, asset manifest containing hashes/dimensions.

- [ ] **Step 1: Add Playwright and the capture script command**

Run: `npm install --save-dev playwright`

Add to `package.json`:

```json
"previews:sections": "tsx scripts/generate-section-previews.mjs"
```

- [ ] **Step 2: Write the failing asset contract test**

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_MANIFESTS } from "../src/section-preview/manifests";

describe("generated section preview assets", () => {
  it("contains desktop and mobile captures for every manifest", () => {
    for (const entry of SECTION_PREVIEW_MANIFESTS) {
      expect(existsSync(`public${entry.preview.desktop}`)).toBe(true);
      expect(existsSync(`public${entry.preview.mobile}`)).toBe(true);
    }
    const output = JSON.parse(readFileSync("public/assets/section-previews/manifest.json", "utf8"));
    expect(output.entries).toHaveLength(24);
  });
});
```

- [ ] **Step 3: Run the asset test and verify failure**

Run: `npx vitest run tests/section-preview-assets.test.ts`

Expected: FAIL because capture files and `manifest.json` are absent.

- [ ] **Step 4: Implement deterministic browser capture and structural QA**

The script starts a local HTTP server that accepts only known manifest/fixture combinations and returns `renderSectionPreview`. For each manifest and viewport, launch Chromium with fixed locale `fr-FR`, timezone `Europe/Paris`, reduced motion, and fonts loaded; wait for images and `document.fonts.ready`, then assert:

```js
const qa = await page.evaluate(() => ({
  width: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
  visibleText: document.body.innerText.trim().length,
  unnamedControls: [...document.querySelectorAll("button,a,input,select")].filter((node) => !(node.textContent?.trim() || node.getAttribute("aria-label"))).length,
}));
if (qa.width > qa.clientWidth + 1) throw new Error(`Horizontal overflow: ${qa.width}/${qa.clientWidth}`);
if (qa.brokenImages) throw new Error(`Broken images: ${qa.brokenImages}`);
if (qa.visibleText < 40) throw new Error("Preview is effectively empty");
if (qa.unnamedControls) throw new Error(`Unnamed interactive controls: ${qa.unnamedControls}`);
```

Capture the target section as WebP with `quality: 86`. Hash the HTML plus manifest `previewVersion`; skip writing an unchanged capture. If an existing capture hash changes, exit with `Visual reference changed: <path>` unless the command was launched with `--update`. Write atomic temporary files and rename only after successful QA so one failed variant cannot corrupt existing assets. Evaluate text/background pairs used by headings, body copy, buttons, and form controls with a WCAG contrast helper; fail below 4.5:1 for normal text and 3:1 for text at least 24 px or 18.66 px bold.

- [ ] **Step 5: Generate captures and verify assets**

Run: `npx playwright install chromium`

Run: `npm run previews:sections -- --update`

Run: `npx vitest run tests/section-preview-assets.test.ts`

Expected: 24 WebP files, one manifest JSON, PASS.

- [ ] **Step 6: Commit the capture pipeline and generated assets**

```bash
git add package.json package-lock.json scripts/generate-section-previews.mjs scripts/section-preview-page.ts public/assets/section-previews tests/section-preview-assets.test.ts
git commit -m "feat: generate deterministic section previews"
```

---

### Task 8: End-to-End Safety, Accessibility, and Production Delivery

**Files:**
- Create: `tests/section-preview-integration.test.ts`
- Modify: `src/editor/ui/layout.css`
- Modify generated hydrate files through `npm run build`

**Interfaces:**
- Consumes: the complete preview catalogue and materialization pipeline.
- Produces: production-ready build with no fictional proof leakage and keyboard-operable previews.

- [ ] **Step 1: Write the failing end-to-end integration test**

```ts
import { describe, expect, it } from "vitest";
import { migrateDocument } from "../src/editor/migrate";
import { blankDocument } from "../src/lib/catalog";
import { materializeSectionVariant } from "../src/section-preview/materialize";
import { renderEditorDocument } from "../src/editor/render/render-document";

describe("section preview integration", () => {
  it("inserts a real product section without preview fixture leakage", () => {
    const document = migrateDocument(blankDocument("Client"), "product");
    const result = materializeSectionVariant({ document, sectionType: "productHero", variantId: "beauty-editorial", sectionId: "inserted" });
    document.pages[0].sections.splice(1, 0, result.section);
    const persisted = JSON.stringify(document);
    expect(persisted).not.toMatch(/aurea-serum|halo-lamp|previewOnly|previewFixtureId/);
    expect(renderEditorDocument(document, { mode: "preview", breakpoint: "mobile" })).toContain("beauty-editorial");
  });
});
```

- [ ] **Step 2: Run integration and full unit tests**

Run: `npx vitest run tests/section-preview-integration.test.ts`

Expected: PASS after Tasks 1–7; if it fails, fix the narrow failing boundary before continuing.

Run: `npm test -- --run`

Expected: all test files pass with zero failures.

- [ ] **Step 3: Verify types, generated captures, formatting, and production build**

Run: `npx tsc --noEmit`

Run: `npm run previews:sections`

Run: `npm run build`

Run: `git diff --check`

Expected: every command exits 0; the second preview generation reports all 24 captures unchanged.

- [ ] **Step 4: Perform browser verification**

Start: `npm run dev`

Verify in the editor:

1. « Ajouter une section » shows twelve premium variants with immediate images.
2. Desktop/mobile changes each capture.
3. « Voir en grand » loads the interactive render and switches fixture without closing.
4. Keyboard Tab reaches close, viewport, fixture, and insert controls; Escape closes the dialog.
5. Inserting `ugc-grid` into a document without reviews creates no fictional testimonial and reports the missing review data.
6. Mobile preview has no horizontal scrollbar at 390 px.

- [ ] **Step 5: Commit final integration adjustments**

```bash
git add src/editor/ui/layout.css tests/section-preview-integration.test.ts public/hydrate index.js
git commit -m "test: verify section preview experience"
```

- [ ] **Step 6: Push and deploy**

Run: `git push origin main`

Run: `npx vercel --prod --yes`

Expected: deployment reaches `READY` and aliases `https://buildstore-eta.vercel.app`.
