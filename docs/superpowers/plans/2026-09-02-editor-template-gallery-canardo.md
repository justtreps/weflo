# Editor Template Gallery and Canardo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional editor entry screen with 18 branded model previews, a persistent blank-page option, and a Canardo flow that updates the current document and exposes every failure to the user.

**Architecture:** Make the catalog the source of model content and visual tokens, then feed the resulting `PageDocument` to one browser-safe renderer used by hosted pages and gallery previews. Keep DOM orchestration in a focused gallery module and centralize adoption of saved or AI-generated documents in the editor hydrator.

**Tech Stack:** TypeScript 5.9, Hono, Vitest, esbuild, browser DOM APIs, OpenAI SDK.

**Spec:** `docs/superpowers/specs/2026-09-02-editor-template-gallery-canardo-design.md`

## Global Constraints

- Preserve publishing, sharing, page settings, and existing editor panels.
- Show all 18 declared models and the blank-page option.
- Use the dashboard system font for Weflo UI; model previews may use their own safe font stacks.
- The OpenAI-backed LLM remains the only successful Canardo generator; missing configuration must be explicit.
- Keep model identifiers in `data-model-id`; never infer identity from visible card text.
- All new behavior follows red-green-refactor and must pass desktop/mobile visual inspection.

---

## File Map

- `src/types.ts`: validated document theme contract.
- `src/lib/catalog.ts`: model metadata, branded content, blank-page factory, model lookup.
- `src/lib/render-document.ts`: browser-safe HTML renderer shared by previews and hosted pages.
- `src/lib/render-page.ts`: hosted page and 404 adapter around the shared renderer.
- `src/hydrate/editor-gallery.ts`: gallery markup, filtering, viewport state, and loading/error states.
- `src/hydrate/editeur.ts`: page persistence, preview orchestration, and Canardo conversation.
- `public/editeur.html`: stable mounts and CSS for the redesigned gallery.
- `src/server/pages.ts`: Canardo input and error response contracts.
- `tests/page-models.test.ts`: model and blank-document behavior.
- `tests/render-page.test.ts`: brand rendering and escaping.
- `tests/editor-gallery.test.ts`: gallery output and filtering.
- `tests/canardo.test.ts`: API validation and error contracts.
- `tests/editeur-state.test.ts`: document adoption and Canardo error mapping.

### Task 1: Branded model and blank-page document contract

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/catalog.ts`
- Modify: `tests/page-models.test.ts`

**Interfaces:**
- Produces: `PageTheme`, `PageModel.themeConfig`, `blankDocument(name)`, `modelById(id)`, and branded `documentFromModel(modelId, pageName)`.
- Consumes: existing `PageType`, `SectionType`, and `PageDocument`.

- [ ] **Step 1: Write failing model tests**

```ts
it("builds every model with its own visual theme and content", () => {
  const docs = PAGE_MODELS.map((model) => documentFromModel(model.id, model.name));
  expect(new Set(docs.map((doc) => doc.theme?.accent)).size).toBeGreaterThanOrEqual(6);
  expect(new Set(docs.map((doc) => doc.sections.find((s) => s.type === "productHero")?.settings.text)).size).toBe(PAGE_MODELS.length);
});

it("creates a blank document that does not reopen the picker", () => {
  const doc = blankDocument("Nouvelle page");
  expect(doc.modelId).toBe("blank");
  expect(doc.sections.map((section) => section.type)).toEqual(["navigation", "hero", "footer"]);
  expect(needsModelPicker(doc)).toBe(false);
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `npm test -- --run tests/page-models.test.ts`

Expected: failure because `blankDocument` and `PageDocument.theme` do not exist and the model documents are not visually distinct.

- [ ] **Step 3: Add the document theme and catalog data**

```ts
export type PageTheme = {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  display: "sans" | "serif" | "condensed";
  radius: "none" | "soft" | "round";
};

export type PageDocument = {
  name: string;
  path: string;
  sections: Section[];
  modelId?: string;
  theme?: PageTheme;
};
```

Extend each catalog entry with a literal `themeConfig`, hero copy, benefit copy, CTA, price, and stable image URL. Implement:

```ts
export function blankDocument(name: string): PageDocument {
  return {
    ...initialDocument(name, "blank"),
    modelId: "blank",
    theme: DEFAULT_PAGE_THEME,
  };
}

export function modelById(id: string): PageModel | undefined {
  return PAGE_MODELS.find((model) => model.id === id);
}
```

- [ ] **Step 4: Run the focused tests and verify green**

Run: `npm test -- --run tests/page-models.test.ts`

Expected: all page-model tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/catalog.ts tests/page-models.test.ts
git commit -m "feat: add branded page model documents"
```

### Task 2: Shared browser-safe page renderer

**Files:**
- Create: `src/lib/render-document.ts`
- Modify: `src/lib/render-page.ts`
- Modify: `tests/render-page.test.ts`

**Interfaces:**
- Consumes: `PageDocument` and its validated `PageTheme`.
- Produces: `renderDocument(doc: PageDocument, options?: { compact?: boolean }): string` and the existing `renderPage(doc)` API.

- [ ] **Step 1: Write failing rendering tests**

```ts
it("renders different model themes through the shared document renderer", () => {
  const beauty = renderDocument(documentFromModel("peau", "Soin"));
  const sport = renderDocument(documentFromModel("proteo", "Sport"));
  expect(beauty).toContain("--wf-accent:");
  expect(sport).toContain("--wf-accent:");
  expect(beauty).not.toBe(sport);
});

it("escapes model content and rejects unsafe theme values", () => {
  const doc = blankDocument("<script>alert(1)</script>");
  doc.theme = { ...doc.theme!, accent: "red;}</style><script>alert(2)</script>" };
  const html = renderDocument(doc);
  expect(html).not.toContain("<script>alert(1)</script>");
  expect(html).not.toContain("alert(2)");
});
```

- [ ] **Step 2: Run the test and verify red**

Run: `npm test -- --run tests/render-page.test.ts`

Expected: failure because `renderDocument` is missing.

- [ ] **Step 3: Extract the pure renderer**

Implement `renderDocument` without Node imports. Validate colors with `/^#[0-9a-f]{6}$/i`, map display/radius enum values to fixed CSS, escape all text and URLs, and render both full and compact markup from the same section switch. Make `renderPage` delegate to it:

```ts
export function renderPage(doc: PageDocument): string {
  return renderDocument(doc);
}
```

Keep `renderNotFound` in `render-page.ts`.

- [ ] **Step 4: Run rendering and hosted-page tests**

Run: `npm test -- --run tests/render-page.test.ts tests/theme-files.test.ts`

Expected: all tests pass and hosted page output remains valid.

- [ ] **Step 5: Commit**

```bash
git add src/lib/render-document.ts src/lib/render-page.ts tests/render-page.test.ts
git commit -m "refactor: share page renderer with model previews"
```

### Task 3: Dynamic gallery with real previews

**Files:**
- Create: `src/hydrate/editor-gallery.ts`
- Create: `tests/editor-gallery.test.ts`
- Modify: `public/editeur.html`
- Modify: `src/hydrate/editeur.ts`

**Interfaces:**
- Consumes: `PAGE_MODELS`, `blankDocument`, `documentFromModel`, and `renderDocument`.
- Produces: `galleryItems(theme)`, `renderGalleryMarkup(items)`, and `mountEditorGallery(options)` where `options.onPick(modelId | "blank")` returns a promise.

- [ ] **Step 1: Write failing gallery tests**

```ts
it("returns the blank card followed by all catalog models", () => {
  const items = galleryItems("Tout");
  expect(items[0].id).toBe("blank");
  expect(items).toHaveLength(PAGE_MODELS.length + 1);
});

it("filters models without removing the blank-page choice", () => {
  const items = galleryItems("Beauté & soin");
  expect(items[0].id).toBe("blank");
  expect(items.slice(1).every((item) => item.theme === "Beauté & soin")).toBe(true);
});

it("renders cards with stable model ids and iframe previews", () => {
  const html = renderGalleryMarkup(galleryItems("Nutrition"));
  expect(html).toContain('data-model-id="blank"');
  expect(html).toContain('data-model-id="graine"');
  expect(html).toContain("data-model-preview");
  expect(html).not.toContain("Aperçu indisponible");
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `npm test -- --run tests/editor-gallery.test.ts`

Expected: module-not-found failure for `editor-gallery`.

- [ ] **Step 3: Implement pure gallery data and markup**

Create a blank item and map all filtered `PAGE_MODELS`. Escape labels, write `data-model-id`, and create a titled preview frame. The blank card uses a purposeful wireframe instead of an unavailable-preview placeholder.

- [ ] **Step 4: Replace the static model block with stable mounts**

In `public/editeur.html`, preserve the outer canvas but replace the hardcoded filters/cards with:

```html
<section class="model-gallery" data-editor-gallery aria-labelledby="model-gallery-title">
  <header class="model-gallery__header">
    <p class="model-gallery__eyebrow">Nouvelle page</p>
    <h1 id="model-gallery-title">Choisis un point de départ</h1>
    <p>Pars d’un modèle pensé pour ton univers, d’une page vierge ou décris ton objectif à Canardo.</p>
  </header>
  <div data-gallery-filters></div>
  <div data-gallery-grid aria-live="polite"></div>
  <p data-gallery-error role="alert" hidden></p>
</section>
```

Add scoped CSS using the Weflo palette, system typography, four desktop columns, two tablet columns, and one mobile column. Add visible `:focus-visible` states and reduced-motion handling.

- [ ] **Step 5: Mount the gallery and real previews**

In `hydrateEditeur`, call `mountEditorGallery`. After inserting markup, set every preview iframe’s `srcdoc` with `renderDocument(documentFromModel(id, model.name), { compact: true })`. Toggle a `data-viewport` attribute for desktop/mobile rather than mutating arbitrary inline widths.

- [ ] **Step 6: Run gallery tests and build**

Run: `npm test -- --run tests/editor-gallery.test.ts tests/page-models.test.ts && npm run build:hydrate`

Expected: tests and browser bundle pass.

- [ ] **Step 7: Commit**

```bash
git add src/hydrate/editor-gallery.ts tests/editor-gallery.test.ts public/editeur.html src/hydrate/editeur.ts
git commit -m "feat: rebuild editor model gallery"
```

### Task 4: Persist model selection and synchronize editor state

**Files:**
- Create: `src/hydrate/editeur-state.ts`
- Create: `tests/editeur-state.test.ts`
- Modify: `src/hydrate/editeur.ts`

**Interfaces:**
- Consumes: a saved `Page`, `needsModelPicker`, panel-fill callback, and preview callback.
- Produces: `editorViewForDocument(doc)` and one internal `adoptPage(updatedPage)` path used by save, model selection, and Canardo.

- [ ] **Step 1: Write failing state tests**

```ts
it("closes the picker for model and blank documents", () => {
  expect(editorViewForDocument(documentFromModel("proteo", "Sport"))).toBe("preview");
  expect(editorViewForDocument(blankDocument("Libre"))).toBe("preview");
  expect(editorViewForDocument(initialDocument("Nouveau", "sell"))).toBe("gallery");
});
```

- [ ] **Step 2: Run the test and verify red**

Run: `npm test -- --run tests/editeur-state.test.ts`

Expected: module-not-found failure for `editeur-state`.

- [ ] **Step 3: Add the state helper and one adoption path**

```ts
export function editorViewForDocument(doc: PageDocument): "gallery" | "preview" {
  return needsModelPicker(doc) ? "gallery" : "preview";
}
```

Inside `hydrateEditeur`, implement one `adoptPage(updated)` function that assigns `current`, refreshes name/slug/panels, and shows either the gallery or preview. Use it after PATCH save, model choice, blank choice, and Canardo response.

- [ ] **Step 4: Add selection loading and retry behavior**

Disable only the selected card while PATCH runs. On failure, restore the card, keep the gallery open, and write `La page n’a pas pu être créée. Réessayer.` into `[data-gallery-error]`.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- --run tests/editeur-state.test.ts tests/editor-gallery.test.ts && npm run build:hydrate`

Expected: tests pass and editor bundle builds.

- [ ] **Step 6: Commit**

```bash
git add src/hydrate/editeur-state.ts tests/editeur-state.test.ts src/hydrate/editeur.ts
git commit -m "feat: persist editor starting point"
```

### Task 5: Make Canardo observable and reliable

**Files:**
- Modify: `src/server/pages.ts`
- Modify: `src/lib/canardo.ts`
- Modify: `src/hydrate/editeur-state.ts`
- Modify: `src/hydrate/editeur.ts`
- Modify: `tests/canardo.test.ts`
- Modify: `tests/editeur-state.test.ts`

**Interfaces:**
- Produces: API errors shaped as `{ error: string; message: string; cta?: string }` and `canardoErrorMessage(status, body)`.
- Consumes: existing `/api/pages/:id/canardo` route and `adoptPage` editor path.

- [ ] **Step 1: Write failing API and client error tests**

```ts
it("rejects an empty Canardo prompt with an actionable message", async () => {
  const res = await app.request(`/api/pages/${page.id}/canardo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "   " }),
  });
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ error: "prompt", message: expect.any(String) });
});

it("maps Canardo failures to visible French messages", () => {
  expect(canardoErrorMessage(402, { error: "credits" })).toMatch(/crédits/i);
  expect(canardoErrorMessage(503, { error: "unavailable" })).toMatch(/configuré/i);
  expect(canardoErrorMessage(400, { error: "catalog" })).toMatch(/conservée/i);
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `npm test -- --run tests/canardo.test.ts tests/editeur-state.test.ts`

Expected: empty prompt reaches the LLM or returns the wrong status, and the client mapper is missing.

- [ ] **Step 3: Implement API validation and stable errors**

Validate `prompt.trim()` before reading credits. Return:

```ts
return c.json({ error: "prompt", message: "Décris la page ou la modification souhaitée." }, 400);
```

Return a visible message for missing LLM configuration and invalid model output. Extend `applyCanardo` to retain the current document if `sections` is absent or contains unknown types.

- [ ] **Step 4: Implement Canardo UI states**

Set `aria-busy`, disable the input and send control, append an activity bubble, parse non-2xx JSON, and append `canardoErrorMessage`. For 402, include the existing billing link. On success, call `adoptPage({ ...current, document: body.document })` and announce that the preview was updated.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- --run tests/canardo.test.ts tests/editeur-state.test.ts && npm run build`

Expected: Canardo tests pass and all bundles build.

- [ ] **Step 6: Commit**

```bash
git add src/server/pages.ts src/lib/canardo.ts src/hydrate/editeur-state.ts src/hydrate/editeur.ts tests/canardo.test.ts tests/editeur-state.test.ts
git commit -m "fix: make Canardo editor flow observable"
```

### Task 6: Full verification and visual critique

**Files:**
- Modify only if verification exposes a scoped defect in files already listed above.

**Interfaces:**
- Consumes: completed gallery, page renderer, persistence, and Canardo flow.
- Produces: verified local editor at `http://localhost:3001/editeur?page=<id>`.

- [ ] **Step 1: Run all automated checks**

Run: `npm test -- --run`

Expected: all test files pass.

Run: `npm run build`

Expected: hydrate and API bundles complete without errors.

- [ ] **Step 2: Verify the real editor in desktop layout**

Open the existing page URL. Confirm 19 starting points, working universe filters, readable previews, selected/loading/error states, model persistence, blank persistence, and a successful Canardo instruction.

- [ ] **Step 3: Verify mobile layout and accessibility**

At 390 px, confirm one-column cards, usable filters, visible Canardo input, keyboard focus, iframe titles, and no horizontal page overflow. Enable reduced motion and confirm transitions no longer animate.

- [ ] **Step 4: Perform design critique**

Compare the result against the supplied screenshot and dashboard language. Remove decorative elements that obscure model content, confirm each brand looks distinct, and preserve the model-preview interaction as the sole signature effect.

- [ ] **Step 5: Re-run checks after any visual correction**

Run: `npm test -- --run && npm run build`

Expected: all tests and builds remain green.

- [ ] **Step 6: Commit verification fixes if any**

```bash
git add src public tests
git commit -m "chore: verify editor creation flow"
```
