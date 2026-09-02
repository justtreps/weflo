# Product Import, AI Onboarding and Store Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete pre-auth product-import onboarding, generate a real section-based Shopify store, claim it after authentication, and replace the generic editor with the commerce-first builder shown in the approved references.

**Architecture:** Add a versioned onboarding domain with a repository-backed job lifecycle, guarded URL extraction adapters and structured AI enrichment. Compile the resulting analysis into the existing `EditorDocument`/section registry, then edit it through a redesigned commerce-first shell while preserving the existing command history, autosave and Shopify compiler. Anonymous state uses a single-use claim token; authenticated claim creates one page idempotently.

**Tech Stack:** TypeScript 5.9, Hono, Vitest, PostgreSQL/MemoryStore, OpenAI structured outputs, esbuild, existing Weflo `EditorDocument` and Shopify publication pipeline.

**Spec:** `docs/superpowers/specs/2026-09-02-product-import-onboarding-store-builder-design.md`

## Global Constraints

- Onboarding and editor interface copy remain English; the French landing CTA remains “Générer une boutique,” and the chosen language affects storefront copy only.
- Imported product facts and product identity must never be invented or replaced.
- Every server response containing AI output is structurally validated before persistence.
- Anonymous claim tokens are single-use and stored only as hashes server-side.
- Generated stores use registered `EditorSection` records, never a screenshot or monolithic HTML section.
- Free publication always opens Weflo Pro; hosted publication does not exist.
- Image editing is image-to-image for product media and preserves the original asset for undo.
- All implementation work lands on `main` through small verified commits.

---

### Task 1: Versioned onboarding domain and persistence

**Files:**
- Create: `src/onboarding/types.ts`
- Create: `src/onboarding/schema.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/memory.ts`
- Modify: `src/repos/postgres.ts`
- Test: `tests/onboarding-store.test.ts`
- Test: `tests/postgres-onboarding.test.ts`

**Interfaces:**
- Produces: `OnboardingDraft`, `ImportedProduct`, `BuyerPersona`, `MarketingAngle`, `BrandKit`, `BuildStage`.
- Produces: `Store.createOnboardingDraft`, `Store.getOnboardingDraft`, `Store.updateOnboardingDraft`, `Store.claimOnboardingDraft`.

- [ ] **Step 1: Write failing domain and memory repository tests**

```ts
it("persists an anonymous onboarding draft and claims it once", async () => {
  const store = new MemoryStore();
  const draft = await store.createOnboardingDraft({
    claimTokenHash: "hash-1",
    sourceUrl: "https://shop.example/products/lamp",
  });
  await store.updateOnboardingDraft(draft.id, { language: "fr", brandName: "LumiWall" });
  const claimed = await store.claimOnboardingDraft(draft.id, "hash-1", "user-1", "page-1");
  expect(claimed).toMatchObject({ language: "fr", brandName: "LumiWall", claimedPageId: "page-1" });
  await expect(store.claimOnboardingDraft(draft.id, "wrong", "user-2", "page-2")).rejects.toThrow("invalid claim token");
});
```

- [ ] **Step 2: Run the focused test and verify the missing repository methods fail**

Run: `npm test -- tests/onboarding-store.test.ts`

Expected: TypeScript/runtime failure because `createOnboardingDraft` is not implemented.

- [ ] **Step 3: Define the exact onboarding model**

```ts
export type OnboardingStatus = "extracting" | "analysing" | "questions" | "building" | "ready" | "claimed" | "failed";
export type BuildStageState = "waiting" | "running" | "complete" | "failed";
export type BuildStage = { id: string; label: string; state: BuildStageState };
export type ImportedProduct = {
  sourceUrl: string; title: string; description: string; vendor: string;
  currency: string; price: number | null; compareAtPrice: number | null;
  images: string[]; variants: Array<{ id: string; title: string; price: number | null; image?: string }>;
  rating: number | null; reviewCount: number | null;
  reviews: Array<{ author: string; rating: number | null; title: string; text: string; image?: string }>;
};
export type BuyerPersona = { id: string; title: string; insight: string; icon: string; tags: string[]; selected: boolean };
export type MarketingAngle = { id: string; title: string; description: string; icon: string; tags: string[]; selected: boolean };
export type BrandKit = { palette: string[]; headingFont: string; bodyFont: string; schemes: Array<{ name: string; background: string; text: string; accent: string }> };
export type OnboardingDraft = {
  version: 1; id: string; status: OnboardingStatus; claimTokenHash: string; sourceUrl: string;
  product: ImportedProduct | null; language: string; modelId: string | null;
  brandNames: string[]; brandName: string; personas: BuyerPersona[]; angles: MarketingAngle[];
  brandKit: BrandKit | null; stages: BuildStage[]; document: EditorDocument | null;
  error: string | null; claimedUserId: string | null; claimedPageId: string | null;
  createdAt: string; updatedAt: string;
};
```

- [ ] **Step 4: Implement memory and PostgreSQL persistence**

Add the repository methods to `Store`, implement copy-on-read behavior in `MemoryStore`, and create `onboarding_drafts` lazily in `PostgresStore.ensureSchema()` with JSONB payload plus indexed `status`, `claimed_user_id` and timestamps. `claimOnboardingDraft` must compare the stored token hash and return the existing claimed page for an idempotent retry.

- [ ] **Step 5: Run repository tests**

Run: `npm test -- tests/onboarding-store.test.ts tests/postgres-onboarding.test.ts`

Expected: both test files pass; PostgreSQL tests may skip only when `DATABASE_URL` is absent, matching existing repository test policy.

- [ ] **Step 6: Commit**

```bash
git add src/onboarding src/repos tests/onboarding-store.test.ts tests/postgres-onboarding.test.ts
git commit -m "feat: persist anonymous onboarding drafts"
```

### Task 2: Safe product URL extraction

**Files:**
- Create: `src/import/url-policy.ts`
- Create: `src/import/product-extractor.ts`
- Create: `src/import/html-product-parser.ts`
- Create: `tests/fixtures/product-shopify.html`
- Test: `tests/product-import.test.ts`
- Modify: `src/types.ts`
- Modify: `src/server/app.ts`

**Interfaces:**
- Produces: `ProductFetchPort.fetch(url: URL): Promise<{ finalUrl: string; html: string }>`.
- Produces: `assertPublicProductUrl(raw: string): Promise<URL>`.
- Produces: `extractProductFromHtml(html: string, sourceUrl: string): ImportedProduct`.

- [ ] **Step 1: Write failing parser and URL-policy tests**

```ts
it("extracts all Shopify JSON-LD product images and variants", () => {
  const html = readFileSync(fixture("product-shopify.html"), "utf8");
  const product = extractProductFromHtml(html, "https://lamp.example/products/infinity");
  expect(product.title).toBe("Infinity Wireless Wall Lamp");
  expect(product.images).toEqual([
    "https://cdn.example/lamp-main.jpg",
    "https://cdn.example/lamp-white.jpg",
    "https://cdn.example/lamp-black.jpg",
  ]);
  expect(product.variants).toHaveLength(3);
});

it.each(["http://127.0.0.1/a", "https://localhost/a", "file:///etc/passwd"])("rejects unsafe source %s", async (url) => {
  await expect(assertPublicProductUrl(url)).rejects.toThrow("public HTTPS product page");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/product-import.test.ts`

Expected: imports fail because the extraction modules do not exist.

- [ ] **Step 3: Implement guarded URL validation**

Accept only `https:` URLs without credentials. Resolve DNS through an injected resolver and reject loopback, link-local, private IPv4 ranges, unique-local IPv6 and metadata addresses. Revalidate every redirect URL before following it.

- [ ] **Step 4: Implement deterministic HTML extraction**

Parse `application/ld+json` Product nodes before Open Graph fallbacks. Normalize arrays and nested `@graph`, decode HTML entities, resolve relative images, deduplicate by normalized URL, and ignore data/blob URLs. Throw `ProductExtractionError("no_product")` when title plus at least one product fact cannot be recovered.

- [ ] **Step 5: Add the fetch port and application dependency**

```ts
export type ProductFetchPort = {
  fetch(url: URL): Promise<{ finalUrl: string; html: string }>;
};

export type AppDeps = {
  // existing dependencies
  productFetch?: ProductFetchPort;
};
```

The production adapter uses `SCRAPING_API_URL` and `SCRAPING_API_KEY` when configured; otherwise it performs a guarded server fetch with a 15-second timeout and a 5 MB response limit.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- tests/product-import.test.ts`

```bash
git add src/import src/types.ts src/server/app.ts tests/product-import.test.ts tests/fixtures/product-shopify.html
git commit -m "feat: extract products from guarded public urls"
```

### Task 3: Structured product analysis and question generation

**Files:**
- Create: `src/onboarding/analyser.ts`
- Create: `src/onboarding/fallback-analysis.ts`
- Create: `src/onboarding/openai-analysis.ts`
- Modify: `src/types.ts`
- Modify: `src/server/prod.ts`
- Test: `tests/onboarding-analysis.test.ts`

**Interfaces:**
- Produces: `OnboardingAiPort.analyse(input): Promise<OnboardingAnalysis>`.
- Produces: `validateOnboardingAnalysis(value, product): OnboardingAnalysis`.
- Produces: `fallbackOnboardingAnalysis(product, language): OnboardingAnalysis`.

- [ ] **Step 1: Write the failing validation test**

```ts
it("rejects invented product facts while accepting editable strategy proposals", () => {
  const result = validateOnboardingAnalysis({
    brandNames: ["LumiWall", "AuraMount", "HaloBeam", "GlowMount", "Everlight", "Radiant Wall", "Beam & Base", "Zenith Glow"],
    personas: fourPersonas,
    angles: fourAngles,
    facts: { price: 1 },
  }, importedLamp);
  expect(result.brandNames).toHaveLength(8);
  expect(result).not.toHaveProperty("facts");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/onboarding-analysis.test.ts`

Expected: failure because `validateOnboardingAnalysis` is missing.

- [ ] **Step 3: Extend the LLM boundary**

```ts
export type OnboardingAnalysis = {
  brandNames: string[];
  personas: BuyerPersona[];
  angles: MarketingAngle[];
};
export type OnboardingAiPort = {
  analyse(input: { product: ImportedProduct; language: string }): Promise<OnboardingAnalysis>;
  build(input: StoreBuildInput): Promise<StoreBuildBlueprint>;
};
```

- [ ] **Step 4: Implement structured OpenAI analysis**

Use one JSON-schema response request containing only normalized product data and extracted reviews. Require exactly eight unique brand names, four personas and four angles. Strip unknown properties, clamp text lengths, normalize ids and validate that generated copy does not introduce numeric product facts absent from the source.

- [ ] **Step 5: Implement deterministic fallback proposals**

Derive personas and angles from product category words, price band and observed review language. The fallback must return the same validated interface and mark no review as verified.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/onboarding-analysis.test.ts`

```bash
git add src/onboarding src/types.ts src/server/prod.ts tests/onboarding-analysis.test.ts
git commit -m "feat: generate product-specific onboarding questions"
```

### Task 4: Public onboarding API and resumable job lifecycle

**Files:**
- Create: `src/server/onboarding.ts`
- Create: `src/onboarding/service.ts`
- Create: `src/onboarding/token.ts`
- Modify: `src/server/app.ts`
- Test: `tests/onboarding-api.test.ts`

**Interfaces:**
- Produces the import, get, patch, analyse, build and claim endpoints from the spec.
- Consumes `ProductFetchPort`, `OnboardingAiPort`, `Store`, `EditorDocument` compiler.

- [ ] **Step 1: Write failing API lifecycle tests**

```ts
it("imports, analyses, updates and resumes an anonymous draft", async () => {
  const created = await app.request("/api/onboarding/import", post({ url: "https://lamp.example/products/infinity" }));
  expect(created.status).toBe(202);
  const { id, claimToken } = await created.json();
  const analysed = await app.request(`/api/onboarding/${id}/analyse`, post({}, claimToken));
  expect(analysed.status).toBe(200);
  const updated = await app.request(`/api/onboarding/${id}`, patch({ language: "fr", brandName: "LumiWall" }, claimToken));
  expect(await updated.json()).toMatchObject({ language: "fr", brandName: "LumiWall" });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/onboarding-api.test.ts`

Expected: 404 responses for the onboarding routes.

- [ ] **Step 3: Implement claim-token handling**

Generate 32 random bytes, expose base64url once, store `sha256(token)` and compare hashes with `timingSafeEqual`. Accept the token through `Authorization: Onboarding <token>`; never accept it in query strings or logs.

- [ ] **Step 4: Implement route transitions**

Validate allowed transitions: `extracting → analysing → questions → building → ready → claimed`. PATCH accepts only `language`, `modelId`, `brandName`, `personas` and `angles`, and revalidates complete arrays. Return `409` for invalid transitions and the current draft for safe client reconciliation.

- [ ] **Step 5: Add idempotent authenticated claim**

The claim route requires `requireUser`, ensures a workspace, creates a `sell` page using the generated `EditorDocument`, then records `claimedPageId`. A retry returns the same page id without creating another page.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/onboarding-api.test.ts tests/onboarding-store.test.ts`

```bash
git add src/server/onboarding.ts src/onboarding/service.ts src/onboarding/token.ts src/server/app.ts tests/onboarding-api.test.ts
git commit -m "feat: add resumable public onboarding api"
```

### Task 5: Product-aware store blueprint and section-by-section compiler

**Files:**
- Create: `src/onboarding/build-stages.ts`
- Create: `src/onboarding/store-blueprint.ts`
- Create: `src/onboarding/compile-store.ts`
- Modify: `src/editor/document.ts`
- Modify: `src/models/model-manifest.ts`
- Modify: `src/sections/product-main.ts`
- Modify: `src/sections/bundle.ts`
- Modify: `src/sections/reviews.ts`
- Test: `tests/onboarding-build.test.ts`

**Interfaces:**
- Produces: `buildStoreDocument(input: StoreBuildInput): EditorDocument`.
- Produces: `BUILD_STAGES: BuildStage[]` with the exact 17 French labels from the spec.
- Produces product metadata fields used by commerce editor panels.

- [ ] **Step 1: Write the failing compilation test**

```ts
it("builds a premium multi-section store around the imported product", () => {
  const document = buildStoreDocument({
    product: importedLamp,
    language: "fr",
    brandName: "LumiWall",
    modelId: "proteo",
    personas: selectedPersonas,
    angles: selectedAngles,
    brandKit,
    copy: generatedCopy,
  });
  const sections = document.pages[0].sections;
  expect(sections.map((section) => section.type)).toEqual(expect.arrayContaining([
    "navigation", "productHero", "productMain", "bundle", "benefits", "reviews", "shipping", "faq", "cta", "footer",
  ]));
  expect(document.assets.map((asset) => asset.url)).toEqual(expect.arrayContaining(importedLamp.images));
  expect(JSON.stringify(document)).toContain("LumiWall");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/onboarding-build.test.ts`

Expected: failure because `buildStoreDocument` does not exist.

- [ ] **Step 3: Add product and strategy metadata to the document**

```ts
export type EditorDocument = {
  // existing fields
  commerce?: {
    sourceProduct: ImportedProduct;
    personas: BuyerPersona[];
    angles: MarketingAngle[];
    brandKit: BrandKit;
    storefrontLanguage: string;
  };
};
```

- [ ] **Step 4: Compile real commerce sections**

Create each section from its registered definition defaults, assign imported media and factual product settings, add single/duo/home-set bundle blocks, place selected persona copy in benefits/use-case sections, and place selected angle copy in hero/CTA sections. Insert only evidence-supported comparison, review and claim content.

- [ ] **Step 5: Connect build stages to server operations**

`startBuild` updates each stage to running/complete around analysis validation, brand kit creation, copy generation, section composition, media assignment, offer assembly and document validation. A failure records the first incomplete stage and preserves all completed data.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/onboarding-build.test.ts tests/editor-document.test.ts tests/editor-renderer.test.ts`

```bash
git add src/onboarding src/editor/document.ts src/models/model-manifest.ts src/sections tests/onboarding-build.test.ts
git commit -m "feat: build imported products into commerce sections"
```

### Task 6: Full-screen interactive onboarding UI

**Files:**
- Create: `public/start.html`
- Create: `src/hydrate/start.ts`
- Create: `src/onboarding/client-state.ts`
- Create: `src/onboarding/start.css`
- Modify: `src/server/app.ts`
- Modify: `package.json`
- Modify: `public/accueil.html`
- Modify: `src/hydrate/accueil.ts`
- Test: `tests/start-flow.test.ts`
- Test: `tests/landing.test.ts`

**Interfaces:**
- Produces `/start` and `hydrate/start.js`.
- Produces `OnboardingClientState`, `saveResumeState`, `loadResumeState`, `nextOnboardingStep`.

- [ ] **Step 1: Write failing landing and state-machine tests**

```ts
it("routes the secondary hero action to the public store generator", () => {
  const html = readFileSync("public/accueil.html", "utf8");
  expect(html).toContain('href="/start">Générer une boutique');
});

it("does not allow claim before the build is ready", () => {
  expect(nextOnboardingStep({ ...state, draftStatus: "questions" }, "claim")).toBe("angles");
  expect(nextOnboardingStep({ ...state, draftStatus: "ready" }, "claim")).toBe("claim");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/start-flow.test.ts tests/landing.test.ts`

Expected: missing `/start` UI/state imports and old landing CTA text.

- [ ] **Step 3: Build the accessible wizard shell**

Implement screens for product URL, import progress, storefront language, visual direction, brand name, personas, marketing angles, build progress, brand kit/ready and claim modal. Use semantic buttons with `aria-pressed`, a progressbar for long jobs, polite live regions and a focus-trapped modal.

- [ ] **Step 4: Implement anonymous resume**

Store `{ draftId, claimToken, step }` in `localStorage` under `weflo:onboarding:v1`. On load, fetch the authoritative draft with the token, discard local data only after a successful claim, and keep all selected/edited values synchronized through PATCH.

- [ ] **Step 5: Implement approved blackroom design**

Add the exact palette from the spec, dashboard sans typography, subtle dot field, responsive card grids and reduced-motion variants. Use the existing model WebP previews and imported product images; do not use generic gradient cards.

- [ ] **Step 6: Wire the landing CTA and server route**

Add `/start` to `htmlRoutes`, add `src/hydrate/start.ts` to `build:hydrate`, and change the circled secondary hero action to “Générer une boutique” pointing to `/start`.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- tests/start-flow.test.ts tests/landing.test.ts tests/server-routes.test.ts`

```bash
git add public/start.html public/accueil.html src/hydrate/start.ts src/hydrate/accueil.ts src/onboarding/client-state.ts src/onboarding/start.css src/server/app.ts package.json tests/start-flow.test.ts tests/landing.test.ts
git commit -m "feat: add public ai store generation flow"
```

### Task 7: Authentication modal and draft claim handoff

**Files:**
- Create: `src/onboarding/auth-modal.ts`
- Modify: `src/hydrate/start.ts`
- Modify: `src/server/auth.ts`
- Modify: `src/server/prod.ts`
- Test: `tests/onboarding-claim.test.ts`

**Interfaces:**
- Produces: `openClaimModal({ mode, onAuthenticated })`.
- Consumes existing `/api/auth/signup`, `/api/auth/login`, `/api/auth/google`.
- Calls `POST /api/onboarding/:id/claim` after session establishment.

- [ ] **Step 1: Write failing claim-order and idempotency tests**

```ts
it("creates one editor page after authentication and preserves the generated document", async () => {
  const first = await claimReadyDraft(app, draft, userSession);
  const second = await claimReadyDraft(app, draft, userSession);
  expect(first.pageId).toBe(second.pageId);
  expect((await store.getPage(first.pageId))?.document).toEqual(draft.document);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/onboarding-claim.test.ts`

Expected: claim endpoint or idempotent page result is missing.

- [ ] **Step 3: Build signup/login modal**

Signup requires display name, valid email and at least eight password characters. Login requires email/password. Google auth uses a return path of `/start?resume=1`; after OAuth, the resume state claims the draft. Failed authentication leaves the modal and local draft intact.

- [ ] **Step 4: Redirect only after successful claim**

On `{ pageId }`, remove `weflo:onboarding:v1` and call `location.assign('/editeur?page=' + encodeURIComponent(pageId))`. Never route a ready anonymous draft to dashboard first.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/onboarding-claim.test.ts tests/auth-api.test.ts`

```bash
git add src/onboarding/auth-modal.ts src/hydrate/start.ts src/server/auth.ts src/server/prod.ts tests/onboarding-claim.test.ts
git commit -m "feat: claim generated stores after authentication"
```

### Task 8: Commerce-first editor navigation and section browser

**Files:**
- Create: `src/editor/ui/commerce-nav.ts`
- Create: `src/editor/ui/section-browser.ts`
- Create: `src/editor/ui/section-thumbnails.ts`
- Modify: `src/editor/ui/store.ts`
- Modify: `src/editor/ui/shell.ts`
- Modify: `src/editor/ui/left-rail.ts`
- Modify: `src/editor/ui/layout.css`
- Test: `tests/editor-commerce-shell.test.ts`

**Interfaces:**
- Replaces `EditorPanel` with `EditorMode = "add" | "product" | "offers" | "persona" | "angle" | "brand" | "pages" | "media"`.
- Produces `commerceNavMarkup`, `sectionBrowserMarkup`, `sectionThumbnailDocument`.

- [ ] **Step 1: Write the failing editor shell contract test**

```ts
it("shows commerce tasks and removes the generic structure/layers navigation", () => {
  const html = editorShellMarkup(editorState);
  expect(html).toContain("Add section");
  expect(html).toContain("Product");
  expect(html).toContain("Bundles & offers");
  expect(html).toContain("Target persona");
  expect(html).toContain("Marketing angle");
  expect(html).not.toContain(">Structure<");
  expect(html).not.toContain(">Calques<");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/editor-commerce-shell.test.ts`

Expected: old generic labels remain and the commerce panels are absent.

- [ ] **Step 3: Replace shell navigation and layout**

Create the supplied dark three-zone builder: compact icon rail, 300 px functional sidebar and uncropped store canvas. Keep undo, redo, viewport, Preview and Publish in the top bar. On narrow screens, open the sidebar as an overlay.

- [ ] **Step 4: Build category and thumbnail browsing**

Map registry section types into the approved commerce categories. Render deterministic live thumbnails from actual section definitions in a sandboxed miniature document. Clicking a thumbnail inserts a real section through the existing command engine and selects it.

- [ ] **Step 5: Connect product, offer, persona, angle and brand panels**

Each panel reads/writes `document.commerce` and section settings through commands. Selecting a persona or angle updates its selected state without overwriting user-edited section copy automatically; an explicit “Apply to page” action generates reviewed commands.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/editor-commerce-shell.test.ts tests/editor-shell.test.ts tests/editor-left-rail.test.ts tests/editor-commands.test.ts`

```bash
git add src/editor/ui tests/editor-commerce-shell.test.ts
git commit -m "feat: replace generic editor with commerce builder"
```

### Task 9: Element-level editing, typography and brand kit

**Files:**
- Create: `src/editor/selection-path.ts`
- Create: `src/editor/ui/context-toolbar.ts`
- Create: `src/editor/ui/brand-kit-panel.ts`
- Modify: `src/editor/ui/canvas-runtime.ts`
- Modify: `src/editor/ui/canvas-bridge.ts`
- Modify: `src/editor/commands.ts`
- Modify: `src/editor/render/render-document.ts`
- Modify: `src/editor/ui/layout.css`
- Test: `tests/editor-context-toolbar.test.ts`
- Test: `tests/editor-brand-kit.test.ts`

**Interfaces:**
- Produces: `EditorSelectionPath = { sectionId: string; blockId?: string; settingKey?: string }`.
- Adds commands `updateBlockSetting`, `updateTheme`, `updateCommerce`.
- Produces floating contextual toolbars anchored to the selected canvas rectangle.

- [ ] **Step 1: Write failing command and toolbar tests**

```ts
it("updates a nested bundle label and can undo it as one command", () => {
  const next = applyCommand(document, { type: "updateBlockSetting", sectionId: "bundle-1", blockId: "duo", key: "title", value: "Duo essentiel" });
  expect(next.pages[0].sections[0].blocks[0].settings.title).toBe("Duo essentiel");
  expect(applyCommand(next, inverseCommand(document, command))).toEqual(document);
});

it("applies heading and body fonts through document theme tokens", () => {
  const next = applyCommand(document, { type: "updateTheme", patch: { headingFont: "Inter", bodyFont: "Inter" } });
  expect(renderEditorDocument(next, preview)).toContain("--wf-heading-font:Inter");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/editor-context-toolbar.test.ts tests/editor-brand-kit.test.ts`

Expected: new commands and contextual toolbar are missing.

- [ ] **Step 3: Add element selection messages**

Canvas elements expose section, block and setting data attributes. The runtime posts selection path plus `getBoundingClientRect()`. The parent positions one toolbar without changing iframe scaling.

- [ ] **Step 4: Implement contextual controls**

Text toolbar: size, weight, font, alignment, text color, duplicate and delete. Section toolbar: spacing, background scheme, duplicate, hide and delete. Controls dispatch commands; `contenteditable` commits sanitized plain text on blur/Enter and cancels on Escape.

- [ ] **Step 5: Implement global brand kit controls**

Support bundled font families only, named palette swatches and three reusable schemes. Update CSS variables in the renderer and Shopify compiler so preview and published theme match.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/editor-context-toolbar.test.ts tests/editor-brand-kit.test.ts tests/editor-history.test.ts tests/editor-renderer.test.ts`

```bash
git add src/editor tests/editor-context-toolbar.test.ts tests/editor-brand-kit.test.ts
git commit -m "feat: edit store elements and brand tokens directly"
```

### Task 10: Media popover and true image-to-image editing

**Files:**
- Create: `src/media/types.ts`
- Create: `src/media/image-edit.ts`
- Create: `src/server/assets.ts`
- Create: `src/editor/ui/media-popover.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/prod.ts`
- Modify: `src/types.ts`
- Modify: `src/editor/ui/shell.ts`
- Test: `tests/image-edit.test.ts`
- Test: `tests/editor-media-popover.test.ts`

**Interfaces:**
- Produces: `ImageEditPort.edit({ sourceUrl, instruction, mask? }): Promise<{ url: string; width: number; height: number }>`.
- Produces authenticated `POST /api/assets/:id/edit`.
- Produces `mediaPopoverMarkup(selection, asset)` and command-backed replacement.

- [ ] **Step 1: Write failing image identity and API tests**

```ts
it("always sends the selected product image as the image-edit source", async () => {
  await app.request("/api/assets/asset-lamp/edit", post({ instruction: "Place-la dans un salon minimaliste" }, session));
  expect(imageEdit.calls[0]).toMatchObject({
    sourceUrl: "https://cdn.example/lamp-main.jpg",
    instruction: "Place-la dans un salon minimaliste",
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/image-edit.test.ts tests/editor-media-popover.test.ts`

Expected: asset edit route and popover do not exist.

- [ ] **Step 3: Implement the authenticated image-edit adapter**

Resolve the selected asset from the owned page, require its URL as the model input image, reject instructions longer than 1,000 characters and validate the returned image. Persist the result through the configured media storage adapter; never store temporary OpenAI URLs as permanent Shopify assets.

- [ ] **Step 4: Build the media popover**

Provide Choose media, Upload, Edit with AI, aspect ratio, fit and focal point. Show a before/after confirmation; accepting adds a new asset and dispatches `updateSetting`, while canceling leaves the document unchanged.

- [ ] **Step 5: Preserve undo and source assets**

Do not delete the original asset when replacing a setting. Group new asset plus setting replacement into one history transaction so one Undo restores the source.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/image-edit.test.ts tests/editor-media-popover.test.ts tests/editor-history.test.ts`

```bash
git add src/media src/server/assets.ts src/server/app.ts src/server/prod.ts src/types.ts src/editor/ui tests/image-edit.test.ts tests/editor-media-popover.test.ts
git commit -m "feat: add source-preserving ai image editing"
```

### Task 11: Shopify-only Pro publication

**Files:**
- Modify: `src/editor/ui/publish-dialog.ts`
- Modify: `src/hydrate/editor-v2.ts`
- Modify: `src/server/pages.ts`
- Modify: `src/lib/publishing.ts`
- Modify: `public/accueil.html`
- Test: `tests/publish-access.test.ts`
- Test: `tests/publish-strategies-api.test.ts`
- Delete: `tests/publish-hosted.test.ts`

**Interfaces:**
- `publish-options` returns `{ pro, shopify }` without a hosted destination.
- `POST /pages/:id/publish` accepts only `{ destination: "shopify", strategy, themeId?, confirmLive?, expectedVersion }`.

- [ ] **Step 1: Replace hosted-publication tests with failing Shopify-only rules**

```ts
it("rejects hosted publication even for Pro", async () => {
  const response = await proApp.request(`/api/pages/${page.id}/publish`, post({ destination: "hosted" }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: "shopify_required" });
});

it("shows the Pro paywall before rendering any destination for a free user", async () => {
  expect(publishEntry({ pro: false, shopify: { connected: true, shopDomain: "x", themes: [] } })).toBe("paywall");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/publish-access.test.ts tests/publish-strategies-api.test.ts`

Expected: hosted publication still returns success and appears in dialog markup.

- [ ] **Step 3: Enforce the rule in the client**

After autosave, fetch options. If `pro === false`, open `renderPublishPaywall()` immediately. If Pro and disconnected, show only Connect Shopify. If Pro and connected, show new-theme, duplicate-active and confirmed-active strategies.

- [ ] **Step 4: Enforce the rule on the server**

Return `402 pro_required` before other publication work for free accounts. Return `400 shopify_required` when destination is not exactly `shopify`, or when Shopify is disconnected. Remove hosted status transitions and do not generate Weflo public storefront URLs.

- [ ] **Step 5: Remove hosted-publication claims from landing copy**

Replace “Preview hébergée” and similar claims with editor preview language. Keep preview inside Weflo as an editing feature, not a public publication destination.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/publish-access.test.ts tests/publish-strategies-api.test.ts tests/shopify-publisher.test.ts tests/landing.test.ts`

```bash
git add src/editor/ui/publish-dialog.ts src/hydrate/editor-v2.ts src/server/pages.ts src/lib/publishing.ts public/accueil.html tests
git commit -m "feat: require Weflo Pro and Shopify for publication"
```

### Task 12: End-to-end browser acceptance, production verification and delivery

**Files:**
- Modify: `tests/acceptance-checklist.md`
- Modify generated bundles: `public/hydrate/*`

**Interfaces:**
- Verifies the complete public-to-editor flow and production delivery.

- [ ] **Step 1: Run static verification**

Run: `npx tsc --noEmit`

Expected: exit code 0 and no diagnostics.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test -- --reporter=dot`

Expected: all test files and all tests pass with zero failures.

- [ ] **Step 3: Build production bundles**

Run: `npm run build`

Expected: `hydrate/start.js`, the editor bundle and `api/index.js` are generated successfully.

- [ ] **Step 4: Exercise the browser flow**

Use a fixture/sample product and verify in the in-app browser:

1. Landing “Générer une boutique” opens `/start` while signed out.
2. Product import displays source facts and all source images.
3. French storefront language leaves the Weflo UI in English.
4. Edited name/persona/angle survives a reload.
5. Build progress completes the 17 stages and visibly adds sections.
6. Claim modal requires password and successful claim opens the editor.
7. The editor uses commerce navigation, thumbnails and contextual toolbars.
8. Text, font, palette, bundle and image changes autosave and undo correctly.
9. Free Publish opens Weflo Pro immediately with no hosted choice.
10. Desktop, tablet and mobile previews have no overlap or horizontal clipping.

- [ ] **Step 5: Record acceptance evidence**

Update `tests/acceptance-checklist.md` with the tested URL, browser viewport, sample product, observed page id, test command counts and any external capability not exercised because credentials were unavailable.

- [ ] **Step 6: Commit generated output and acceptance evidence**

```bash
git add public/hydrate tests/acceptance-checklist.md
git commit -m "test: verify generated store onboarding end to end"
```

- [ ] **Step 7: Push and deploy**

Run: `git push origin main`

Run: `npx vercel --prod --yes`

Expected: GitHub accepts `main`, Vercel reports `readyState: READY`, and `https://buildstore-eta.vercel.app/start` returns HTTP 200.
