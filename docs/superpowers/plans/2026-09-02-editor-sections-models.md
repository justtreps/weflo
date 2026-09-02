# Weflo Sections and Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete reusable commerce section library and rebuild all 18 original models as editable documents.

**Architecture:** A single registry owns the schema, default data, Weflo renderer and Shopify renderer for every section type. Models are composition manifests referencing registry types and original extracted assets; visual regression compares their output to the source captures.

**Tech Stack:** TypeScript, Liquid templates, CSS, Vitest, Playwright-backed in-app browser screenshots.

**Spec:** `docs/superpowers/specs/2026-09-02-visual-shopify-editor-design.md`

## Global Constraints

- Requires the document engine and editor shell plans.
- One section type has one definition, editor schema, web renderer and Liquid renderer.
- All repeating content uses blocks rather than numbered setting keys.
- Images from the original files are reused when available; no unrelated stock image substitutions.
- Each model must pass desktop and mobile visual review and remain fully editable.

---

### Task 1: Create the section registry contract

**Files:**
- Create: `src/sections/registry.ts`
- Create: `src/sections/types.ts`
- Create: `src/sections/shared.ts`
- Test: `tests/section-registry.test.ts`

**Interfaces:**
- Produces: `SectionDefinition`, `registerSection`, `getSectionDefinition`, `listSectionDefinitions`.

- [ ] **Step 1: Write failing tests requiring unique ids, category, defaults, settings schema, web renderer and Liquid renderer for every registered section.**
- [ ] **Step 2: Run the focused test and confirm failure.**
- [ ] **Step 3: Implement the registry and shared escaping, media, price, link and responsive helpers.**
- [ ] **Step 4: Run tests and commit with `feat: add unified commerce section registry`.**

### Task 2: Implement navigation, hero and media sections

**Files:**
- Create: `src/sections/navigation.ts`
- Create: `src/sections/announcement.ts`
- Create: `src/sections/hero.ts`
- Create: `src/sections/product-hero.ts`
- Create: `src/sections/video-hero.ts`
- Create: `src/sections/gallery.ts`
- Create: `src/sections/image-text.ts`
- Create: `src/sections/before-after.ts`
- Add matching Liquid files under: `theme/sections/weflo-*.liquid`
- Test: `tests/sections-brand-media.test.ts`

**Interfaces:**
- Registers eight section definitions and their layout variants.

- [ ] **Step 1: Write failing snapshot-free semantic tests for headings, links, alt text, media, variant classes, blocks and schema settings.**
- [ ] **Step 2: Run tests and confirm definitions are missing.**
- [ ] **Step 3: Implement responsive HTML/CSS and Liquid renderers using the same normalized settings.**
- [ ] **Step 4: Verify empty-media states stay editable and never collapse the section.**
- [ ] **Step 5: Run tests and commit with `feat: add navigation hero and media sections`.**

### Task 3: Implement product, collection and bundle sections

**Files:**
- Create: `src/sections/product-main.ts`
- Create: `src/sections/product-grid.ts`
- Create: `src/sections/collection-grid.ts`
- Create: `src/sections/bundle.ts`
- Create: `src/sections/comparison.ts`
- Create: `src/sections/ingredients.ts`
- Add matching Liquid files under: `theme/sections/weflo-*.liquid`
- Test: `tests/sections-commerce.test.ts`

**Interfaces:**
- Consumes optional Shopify bindings; produces product/variant/collection placeholders offline and real Liquid objects after publication.

- [ ] **Step 1: Write failing tests for variants, quantities, sale price, add-to-cart form, dynamic product blocks, bundle selection and empty Shopify bindings.**
- [ ] **Step 2: Implement safe web previews and Shopify Liquid forms without embedding credentials.**
- [ ] **Step 3: Test that bundle totals and comparison blocks update from settings and remain keyboard usable.**
- [ ] **Step 4: Run tests and commit with `feat: add product collection and bundle sections`.**

### Task 4: Implement conversion, trust and content sections

**Files:**
- Create: `src/sections/benefits.ts`
- Create: `src/sections/steps.ts`
- Create: `src/sections/stats.ts`
- Create: `src/sections/testimonials.ts`
- Create: `src/sections/reviews.ts`
- Create: `src/sections/press.ts`
- Create: `src/sections/guarantees.ts`
- Create: `src/sections/shipping.ts`
- Create: `src/sections/faq.ts`
- Create: `src/sections/newsletter.ts`
- Create: `src/sections/form.ts`
- Create: `src/sections/quiz.ts`
- Create: `src/sections/cta.ts`
- Create: `src/sections/rich-text.ts`
- Create: `src/sections/footer.ts`
- Add matching Liquid files under: `theme/sections/weflo-*.liquid`
- Test: `tests/sections-conversion.test.ts`

**Interfaces:**
- Registers conversion and content definitions with repeatable blocks.

- [ ] **Step 1: Write failing tests for add/remove/reorder blocks, rating semantics, FAQ disclosure, form labels, quiz steps and CTA links.**
- [ ] **Step 2: Implement web and Liquid renderers with accessible native controls.**
- [ ] **Step 3: Add reduced-motion behavior and prevent editor mode from submitting forms.**
- [ ] **Step 4: Run tests and commit with `feat: add conversion and trust sections`.**

### Task 5: Implement layout primitives and custom code section

**Files:**
- Create: `src/sections/spacer.ts`
- Create: `src/sections/divider.ts`
- Create: `src/sections/custom-code.ts`
- Create: `src/editor/custom-code-policy.ts`
- Create: `theme/sections/weflo-custom-code.liquid`
- Test: `tests/custom-code-section.test.ts`

**Interfaces:**
- Produces: `validateCustomCode({ html, css, js, allowedDomains })` and isolated renderer output.

- [ ] **Step 1: Write failing tests rejecting script imports, credential APIs, top navigation, unscoped CSS and unsafe Liquid tags while allowing local interactions.**
- [ ] **Step 2: Implement HTML sanitization, CSS selector scoping, iframe sandbox flags and a minimal local JavaScript runtime.**
- [ ] **Step 3: Convert allowed custom markup to a namespaced Shopify section and expose validation errors in the inspector.**
- [ ] **Step 4: Run security and renderer tests; commit with `feat: add sandboxed custom code sections`.**

### Task 6: Rebuild the 18 model manifests

**Files:**
- Create: `src/models/model-manifest.ts`
- Create: `src/models/manifests/*.ts`
- Create: `src/models/assets.ts`
- Modify: `src/lib/catalog.ts`
- Test: `tests/model-manifests.test.ts`

**Interfaces:**
- Produces: `buildModelDocument(modelId, pageName): EditorDocument` for exactly 18 catalog ids.

- [ ] **Step 1: Write a failing table test requiring every gallery model to have a manifest, unique section composition, original asset references, brand tokens and at least one commerce CTA.**
- [ ] **Step 2: Inventory each reference capture into navigation, hero, product/media, trust/conversion and footer sections.**
- [ ] **Step 3: Implement all manifests using the registry; keep model-specific art direction in tokens and section variants rather than duplicated renderers.**
- [ ] **Step 4: Remove `referencePreviews` from selected page documents while retaining `previewDesktop` and `previewMobile` in gallery metadata.**
- [ ] **Step 5: Run tests and commit in three reviewable batches of six models: `feat: rebuild Weflo models batch 1`, batch 2, batch 3.**

### Task 7: Add visual regression and editability acceptance

**Files:**
- Create: `tests/visual/model-baselines.test.ts`
- Create: `scripts/capture-models.mjs`
- Create: `tests/model-editability.test.ts`

**Interfaces:**
- Produces screenshots for 1440px and 390px viewports and a per-model comparison report.

- [ ] **Step 1: Render all manifests locally and capture both breakpoints with deterministic fonts, data and animations disabled.**
- [ ] **Step 2: Compare against original captures with a defined 0.12 pixel-difference ceiling, then manually review typography, section order, images and whitespace.**
- [ ] **Step 3: For every model, change hero copy, replace one image, move one section and reload; assert all edits persist.**
- [ ] **Step 4: Run `npm test`, `npm run build`, and visual capture; commit with `test: verify model fidelity and editability`.**

