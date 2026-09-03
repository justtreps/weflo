# Format-Specific Creation Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared generic creation screen with eight functional format-specific flows and at least three real, previewable, structured templates per non-blank format.

**Architecture:** A typed format-flow registry owns template compatibility, intake fields, accepted sources, and resulting page kind. The `/creer` client becomes an explicit `format → template → intake → strategy → build` state machine. Compilation continues to produce the existing `EditorDocument` shape from registered section definitions, and dashboard creation uses the same registry.

**Tech Stack:** TypeScript, Hono, native browser DOM, Vitest, Playwright, existing Weflo editor document/section registries, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-02-shopify-builder-and-format-flows-design.md`

## Global Constraints

- A template is a structured recipe, never a screenshot or opaque HTML blob.
- Demo products, reviews, and metrics are preview-only and never persist in a customer page.
- All visible copy is French.
- Every non-blank format ships with exactly three initial templates.
- `home` never requires a product URL; `blank` opens the editor immediately.
- All created sections resolve through `getSectionDefinition` and pass `validateEditorDocument`.
- No new runtime dependency is introduced in this phase.
- Minimog-inspired composition is allowed; direct theme asset porting belongs to the next plan.

---

### Task 1: Typed Format Flow Registry

**Files:**
- Create: `src/create/format-flow.ts`
- Modify: `src/create/workspace.ts`
- Test: `tests/format-flow.test.ts`

**Interfaces:**
- Consumes: `CreationFormatId` from `src/onboarding/creation-recipe.ts`.
- Produces: `FORMAT_FLOWS`, `flowForFormat(id)`, `templatesForFormat(id)`, `templateById(id)`.

- [ ] **Step 1: Write the failing registry tests**

```ts
import { describe, expect, it } from "vitest";
import { FORMAT_FLOWS, flowForFormat, templateById } from "../src/create/format-flow";

describe("format flow registry", () => {
  it("gives every non-blank format three compatible templates", () => {
    for (const flow of FORMAT_FLOWS) {
      expect(flow.templates.length).toBe(flow.id === "blank" ? 0 : 3);
      expect(flow.templates.every((template) => template.format === flow.id)).toBe(true);
    }
  });

  it("uses brand inputs instead of product import for a homepage", () => {
    const home = flowForFormat("home");
    expect(home.allowedSources).toEqual(["description", "shopify"]);
    expect(home.intake.map((field) => field.id)).toEqual(["brand", "activity", "promise", "collections", "story"]);
  });

  it("resolves templates globally and rejects unknown ids", () => {
    expect(templateById("home-brand-editorial").format).toBe("home");
    expect(() => templateById("missing")).toThrow("Unknown creation template");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/format-flow.test.ts`

Expected: FAIL because `src/create/format-flow.ts` does not exist.

- [ ] **Step 3: Implement the registry**

Define these types:

```ts
export type CreationSource = "link" | "image" | "description" | "shopify";
export type IntakeField = { id:string; label:string; placeholder:string; kind:"text"|"textarea"|"list"; required:boolean };
export type CreationTemplate = {
  id:string; format:CreationFormatId; name:string; description:string;
  artProfile:"editorial"|"conversion"|"minimal";
  sectionVariants:Record<string,string>;
  previewDesktop:string; previewMobile:string;
};
export type FormatFlow = {
  id:CreationFormatId; title:string; description:string; pageType:"sell"|"write"|"blank";
  allowedSources:CreationSource[]; intake:IntakeField[]; templates:CreationTemplate[];
};
```

Register exactly these ids:

```ts
const TEMPLATE_IDS = {
  store: ["store-editorial-commerce", "store-conversion-modern", "store-maison-premium"],
  product: ["product-buybox-premium", "product-demonstration", "product-bundle-first"],
  landing: ["landing-direct-response", "landing-editorial-premium", "landing-visual-demo"],
  advertorial: ["advertorial-journal", "advertorial-founder-story", "advertorial-comparison"],
  quiz: ["quiz-diagnostic", "quiz-routine", "quiz-recommendation"],
  home: ["home-brand-editorial", "home-catalogue-premium", "home-story-first"],
  blog: ["blog-magazine", "blog-guide", "blog-study"],
  blank: [],
} as const;
```

Move the titles and descriptions duplicated in `creationFormats` into `FORMAT_FLOWS`, then derive `creationFormats` from the registry so existing consumers keep working.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/format-flow.test.ts tests/create-workspace.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/create/format-flow.ts src/create/workspace.ts tests/format-flow.test.ts
git commit -m "feat: define format-specific creation flows"
```

---

### Task 2: Dashboard “Nouvelle page” Selector

**Files:**
- Modify: `src/dashboard/home-view.ts`
- Modify: `src/hydrate/dashboard.ts`
- Modify: `src/hydrate/dashboard-home.css`
- Test: `tests/dashboard-home-view.test.ts`
- Test: `tests/dashboard-hydrate.test.ts`

**Interfaces:**
- Consumes: `FORMAT_FLOWS` from Task 1.
- Produces: `[data-new-page]`, `[data-format-dialog]`, and links `/creer?format=<id>`.

- [ ] **Step 1: Add failing dashboard contract tests**

```ts
it("renders an accessible new-page dialog with every format", () => {
  const html = renderDashboardHome(model);
  expect(html).toContain("data-new-page");
  expect(html).toContain("data-format-dialog");
  for (const id of ["store","product","landing","advertorial","quiz","home","blog","blank"]) {
    expect(html).toContain(`/creer?format=${id}`);
  }
  expect(html).toContain("Nouvelle page");
});
```

Add hydrate-source assertions for `showModal`, `data-format-dialog`, and restoring focus to `[data-new-page]` after close.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts`

Expected: FAIL because the trigger and dialog are absent.

- [ ] **Step 3: Render and bind the selector**

Add beside “Passer Pro”:

```html
<button class="new-page-button" data-new-page>＋ Nouvelle page</button>
```

Render a native `<dialog data-format-dialog aria-labelledby="format-dialog-title">`. Generate cards from `FORMAT_FLOWS`; each card is a link to `/creer?format=${flow.id}` and shows the title, description, and template count. Bind open, close, backdrop click, native Escape, and focus restoration.

- [ ] **Step 4: Style desktop and mobile layouts**

Use a maximum width of `1040px`, four columns on desktop, two below `900px`, and one below `560px`. Keep Weflo black/cream/yellow, an 18px radius, visible focus rings, and a scrollable body capped at `90vh`.

- [ ] **Step 5: Run tests and build the hydrate bundle**

Run: `npx vitest run tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts`

Run: `npm run build:hydrate`

Expected: PASS and the generated dashboard bundle contains `Nouvelle page`.

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/home-view.ts src/hydrate/dashboard.ts src/hydrate/dashboard-home.css tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts public/hydrate/dashboard.js public/hydrate/dashboard.css
git commit -m "feat: add dashboard page-format selector"
```

---

### Task 3: Format-Specific Template Gallery

**Files:**
- Create: `src/create/template-gallery.ts`
- Modify: `src/create/workspace.ts`
- Modify: `src/hydrate/creer.css`
- Test: `tests/create-template-gallery.test.ts`

**Interfaces:**
- Consumes: `CreationTemplate[]` from Task 1.
- Produces: `renderTemplateGallery(flow, selectedTemplateId)` and template URLs `/creer?format=<format>&template=<id>`.

- [ ] **Step 1: Write failing gallery tests**

```ts
import { describe, expect, it } from "vitest";
import { flowForFormat } from "../src/create/format-flow";
import { renderTemplateGallery } from "../src/create/template-gallery";

describe("creation template gallery", () => {
  it("shows only homepage templates for the homepage flow", () => {
    const html=renderTemplateGallery(flowForFormat("home"), null);
    expect(html).toContain("home-brand-editorial");
    expect(html).toContain("home-catalogue-premium");
    expect(html).toContain("home-story-first");
    expect(html).not.toContain("product-buybox-premium");
  });

  it("renders desktop and mobile previews for each template", () => {
    const html=renderTemplateGallery(flowForFormat("landing"), null);
    expect(html).toContain("previewDesktop");
    expect(html).toContain("previewMobile");
    expect(html).toContain("data-template-preview");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/create-template-gallery.test.ts`

Expected: FAIL because the gallery module does not exist.

- [ ] **Step 3: Implement the gallery**

Render a heading specific to the format, three large template cards, desktop/mobile toggle buttons, an “Aperçu” button, and a “Choisir ce modèle” link. Do not render source controls until a template is chosen. Use a native dialog for the enlarged preview.

- [ ] **Step 4: Integrate the gallery into `renderCreateWorkspace`**

```ts
type RenderCreateWorkspaceInput = {
  workspaceName:string;
  selectedFormat:CreationFormatId|null;
  selectedTemplateId:string|null;
  source:string|null;
  prompt:string;
  answers:Record<string,string>;
};
```

Render the format picker when no format is selected, the template gallery when the selected format has templates but none is selected, and the format intake afterward. `blank` bypasses gallery and intake.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run tests/create-template-gallery.test.ts tests/create-workspace.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/create/template-gallery.ts src/create/workspace.ts src/hydrate/creer.css tests/create-template-gallery.test.ts tests/create-workspace.test.ts
git commit -m "feat: add format-specific template galleries"
```

---

### Task 4: Format-Specific Intake Forms

**Files:**
- Create: `src/create/format-intake.ts`
- Modify: `src/create/workspace.ts`
- Test: `tests/format-intake.test.ts`

**Interfaces:**
- Consumes: `FormatFlow.intake`, `FormatFlow.allowedSources`.
- Produces: `renderFormatIntake(flow, answers, source)` and `validateFormatIntake(flow, answers)`.

- [ ] **Step 1: Write failing intake tests**

```ts
import { describe, expect, it } from "vitest";
import { flowForFormat } from "../src/create/format-flow";
import { renderFormatIntake, validateFormatIntake } from "../src/create/format-intake";

describe("format-specific intake", () => {
  it("does not ask a homepage to import a product", () => {
    const html=renderFormatIntake(flowForFormat("home"), {}, null);
    expect(html).toContain("Nom de la marque");
    expect(html).toContain("Collections principales");
    expect(html).not.toContain("Amazon");
    expect(html).not.toContain("Ajouter une image");
  });

  it("keeps product sources on a product page", () => {
    const html=renderFormatIntake(flowForFormat("product"), {}, null);
    expect(html).toContain("Importer un lien");
    expect(html).toContain("Ajouter une image");
    expect(html).toContain("Depuis Shopify");
  });

  it("returns exact missing required fields", () => {
    expect(validateFormatIntake(flowForFormat("quiz"), {})).toEqual(["objective","segments","result"]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/format-intake.test.ts`

Expected: FAIL because the intake module does not exist.

- [ ] **Step 3: Implement rendering and validation**

Render registry fields as labeled controls with `name="answers[<id>]"`. Render source buttons only when present in `allowedSources`. Validation trims values and returns missing field ids in registry order. Missing-field errors appear beside labels and every entered value is preserved.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/format-intake.test.ts tests/create-workspace.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/create/format-intake.ts src/create/workspace.ts tests/format-intake.test.ts
git commit -m "feat: add tailored creation intake forms"
```

---

### Task 5: Persistent Creation State Machine

**Files:**
- Create: `src/create/flow-state.ts`
- Modify: `src/hydrate/creer.ts`
- Modify: `src/create/workspace.ts`
- Test: `tests/create-flow-state.test.ts`
- Test: `tests/create-build-view.test.ts`

**Interfaces:**
- Consumes: URL query parameters, `FORMAT_FLOWS`, template ids, and validated intake answers.
- Produces: a serializable `CreationFlowState`, guarded transitions, and `weflo-create-draft-v2` session persistence.

- [ ] **Step 1: Write failing state-machine tests**

```ts
import { describe, expect, it } from "vitest";
import { initialCreationState, transitionCreationFlow } from "../src/create/flow-state";

describe("creation flow state", () => {
  it("starts a homepage at its template gallery", () => {
    expect(initialCreationState(new URL("https://weflo.test/creer?format=home"))).toMatchObject({
      format:"home",
      templateId:null,
      step:"template",
    });
  });

  it("rejects a template belonging to another format", () => {
    expect(() => initialCreationState(new URL("https://weflo.test/creer?format=home&template=product-buybox-premium")))
      .toThrow("Template product-buybox-premium is not compatible with home");
  });

  it("opens a blank page directly in creation", () => {
    const state=initialCreationState(new URL("https://weflo.test/creer?format=blank"));
    expect(transitionCreationFlow(state, { type:"CONTINUE" }).step).toBe("create-blank");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run tests/create-flow-state.test.ts tests/create-build-view.test.ts`

Expected: FAIL because `src/create/flow-state.ts` does not exist and `/creer` still uses implicit DOM state.

- [ ] **Step 3: Implement typed state and guarded transitions**

```ts
export type CreationStep = "format"|"template"|"intake"|"strategy"|"build"|"create-blank";
export type CreationFlowState = {
  format:CreationFormatId|null;
  templateId:string|null;
  source:CreationSource|null;
  prompt:string;
  answers:Record<string,string>;
  step:CreationStep;
};
```

Implement `initialCreationState(url)`, `transitionCreationFlow(state, event)`, `serializeCreationDraft(state)`, and `restoreCreationDraft(raw)`. Guard template compatibility and required intake fields on every transition. `blank` must transition straight to `create-blank`.

- [ ] **Step 4: Replace implicit `/creer` state with the state machine**

Hydrate from the URL first, then merge compatible saved values from `sessionStorage`. Persist after every state change under `weflo-create-draft-v2`; never persist image data URLs, file contents, or credentials. Update the URL with `history.replaceState` so refresh and browser navigation preserve the selected format and template.

Render from state after select, back, continue, source, and answer events. Preserve values when moving backward. Keep current link and image import handlers behind product-compatible flows only.

- [ ] **Step 5: Verify state and browser-render contracts**

Run: `npx vitest run tests/create-flow-state.test.ts tests/create-build-view.test.ts tests/create-workspace.test.ts`

Expected: PASS, including refresh restoration, back-navigation preservation, incompatible-draft rejection, and blank-page bypass.

- [ ] **Step 6: Commit**

```bash
git add src/create/flow-state.ts src/create/workspace.ts src/hydrate/creer.ts tests/create-flow-state.test.ts tests/create-build-view.test.ts
git commit -m "feat: make creation flows stateful"
```

---

### Task 6: Template-Aware Structured Compilation

**Files:**
- Create: `src/onboarding/template-recipe.ts`
- Modify: `src/onboarding/creation-recipe.ts`
- Modify: `src/onboarding/compile-store.ts`
- Modify: `src/onboarding/types.ts`
- Modify: `src/server/onboarding.ts`
- Modify: `src/editor/document.ts`
- Modify: `src/editor/schema.ts`
- Modify: `src/editor/migrate.ts`
- Test: `tests/template-recipes.test.ts`
- Test: `tests/onboarding-build.test.ts`
- Test: `tests/editor-document.test.ts`
- Test: `tests/editor-schema.test.ts`
- Test: `tests/editor-migrate.test.ts`

**Interfaces:**
- Consumes: `templateId`, format-specific answers, product analysis when present, and existing section definitions.
- Produces: deterministic structured `EditorDocument` instances tagged with template provenance.

- [ ] **Step 1: Write failing recipe tests**

```ts
import { describe, expect, it } from "vitest";
import { recipeForTemplate, TEMPLATE_RECIPES } from "../src/onboarding/template-recipe";

describe("template recipes", () => {
  it("registers one recipe for every selectable template", () => {
    expect(TEMPLATE_RECIPES).toHaveLength(21);
  });

  it("builds a brand-editorial homepage from real section definitions", () => {
    expect(recipeForTemplate("home-brand-editorial").sections).toEqual([
      "announcement","navigation","hero","imageText","collectionGrid",
      "testimonials","newsletter","footer",
    ]);
  });

  it("makes the bundle-first product template meaningfully different", () => {
    const recipe=recipeForTemplate("product-bundle-first");
    expect(recipe.sections[0]).toBe("announcement");
    expect(recipe.variants.productMain).toBe("bundle-led");
    expect(recipe.variants.bundle).toBe("quantity-break");
  });
});
```

Add build tests proving that each of the 21 recipes compiles, every section type resolves through `getSectionDefinition`, and every resulting document passes `validateEditorDocument`.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run tests/template-recipes.test.ts tests/onboarding-build.test.ts`

Expected: FAIL because template recipes and provenance fields do not exist.

- [ ] **Step 3: Register 21 explicit recipes**

```ts
export type TemplateRecipe = {
  id:string;
  format:CreationFormatId;
  sections:string[];
  variants:Record<string,string>;
};
```

Create a deliberate section sequence and variant map for every template id from Task 1. Use currently registered section types only. The three homepage recipes must start with these distinct compositions:

```ts
{
  "home-brand-editorial": ["announcement","navigation","hero","imageText","collectionGrid","testimonials","newsletter","footer"],
  "home-catalogue-premium": ["announcement","navigation","hero","collectionGrid","benefits","imageText","newsletter","footer"],
  "home-story-first": ["navigation","hero","richText","imageText","press","collectionGrid","newsletter","footer"],
}
```

- [ ] **Step 4: Extend build input and document provenance**

Add `templateId:string|null` and `answers:Record<string,string>` to the build input. Add optional `templateId` and `templateVersion` fields to `EditorDocument`, schema validation, and migration defaults. Existing documents without provenance must continue to load unchanged.

- [ ] **Step 5: Compile truthful format-specific content**

Use the chosen recipe for section order and variant defaults. Map intake answers into headings, brand story, categories, CTA labels, quiz questions, article metadata, and navigation as appropriate. Use analyzed product content only for product-led formats. If facts are absent, render neutral editable placeholders; do not invent customer reviews, prices, discounts, metrics, certifications, or product imagery.

- [ ] **Step 6: Run compilation and document tests**

Run: `npx vitest run tests/template-recipes.test.ts tests/onboarding-build.test.ts tests/editor-document.test.ts tests/editor-schema.test.ts tests/editor-migrate.test.ts`

Expected: PASS for all 21 recipes, old-document migration, truthful placeholders, and template provenance.

- [ ] **Step 7: Commit**

```bash
git add src/onboarding/template-recipe.ts src/onboarding/creation-recipe.ts src/onboarding/compile-store.ts src/onboarding/types.ts src/server/onboarding.ts src/editor/document.ts src/editor/schema.ts src/editor/migrate.ts tests/template-recipes.test.ts tests/onboarding-build.test.ts tests/editor-document.test.ts tests/editor-schema.test.ts tests/editor-migrate.test.ts
git commit -m "feat: compile structured creation templates"
```

---

### Task 7: Generated Full-Template Previews

**Files:**
- Create: `src/create/template-preview.ts`
- Create: `scripts/generate-template-previews.mjs`
- Create: `public/template-previews/manifest.json`
- Create: `public/template-previews/*.webp`
- Modify: `src/create/format-flow.ts`
- Modify: `package.json`
- Test: `tests/template-preview.test.ts`
- Test: `tests/template-preview-assets.test.ts`

**Interfaces:**
- Consumes: the 21 template recipes and the existing deterministic preview fixture system.
- Produces: one desktop and one mobile WebP plus manifest metadata for every selectable template.

- [ ] **Step 1: Write failing preview-asset tests**

```ts
import { describe, expect, it } from "vitest";
import { FORMAT_FLOWS } from "../src/create/format-flow";
import manifest from "../public/template-previews/manifest.json";

describe("template preview assets", () => {
  it("has desktop and mobile previews for every template", () => {
    const templates=FORMAT_FLOWS.flatMap((flow) => flow.templates);
    expect(templates).toHaveLength(21);
    for (const template of templates) {
      expect(manifest[template.id].desktop).toMatch(/\.webp$/);
      expect(manifest[template.id].mobile).toMatch(/\.webp$/);
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run tests/template-preview.test.ts tests/template-preview-assets.test.ts`

Expected: FAIL because no template preview renderer or manifest exists.

- [ ] **Step 3: Build deterministic preview documents**

Implement `previewDocumentForTemplate(templateId)` with an explicitly labeled fictitious fixture product and brand. The fixture may contain illustrative product photos and reviews because it is preview-only. Stamp preview HTML with `data-preview-fixture="true"` and never expose the fixture through the customer build endpoint.

- [ ] **Step 4: Generate 42 optimized assets**

Add `npm run previews:templates`. The script must render every preview through the real section renderer at `1440×1100` and `390×844`, wait for fonts and images, screenshot the complete composition, convert to WebP, and write deterministic file names plus manifest dimensions and hashes. Fail on missing images, console errors, duplicate ids, or blank screenshots.

- [ ] **Step 5: Wire the gallery to generated assets**

Load preview paths from the generated manifest into the template registry. The enlarged gallery dialog switches between desktop and mobile without stretching either asset. Include visible “Exemple fictif” labeling inside the dialog.

- [ ] **Step 6: Generate, test, and inspect the contact sheet**

Run: `npm run previews:templates`

Run: `npx vitest run tests/template-preview.test.ts tests/template-preview-assets.test.ts tests/create-template-gallery.test.ts`

Expected: PASS and exactly 42 WebP files. Inspect the generated contact sheet at desktop scale and reject clipped navigation, duplicated sections, broken imagery, unreadable text, or layouts that look identical across a format’s three templates.

- [ ] **Step 7: Commit**

```bash
git add src/create/template-preview.ts src/create/format-flow.ts scripts/generate-template-previews.mjs public/template-previews package.json tests/template-preview.test.ts tests/template-preview-assets.test.ts
git commit -m "feat: add full-template preview gallery assets"
```

---

### Task 8: End-to-End Flow Verification and Delivery

**Files:**
- Create: `tests/create-flow-browser.test.ts`
- Modify: `tests/dashboard-hydrate.test.ts`
- Modify: `tests/create-build-view.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: dashboard selector, `/creer` state machine, template compilation, and generated previews.
- Produces: automated browser coverage and documented local verification commands.

- [ ] **Step 1: Write failing browser journeys**

Using Playwright from Vitest against the local Hono server, cover these journeys:

1. Dashboard → “Nouvelle page” → “Page d’accueil” → homepage gallery → `home-brand-editorial` → brand intake, with no Amazon or image-import control.
2. Dashboard → “Nouvelle page” → “Page produit” → product gallery → `product-bundle-first` → link/image/Shopify source choices.
3. Dashboard → “Nouvelle page” → “Page vierge” → editor with a valid empty document and no intermediate intake.
4. Complete homepage intake → strategy → build → editor, then assert provenance and expected section order.
5. Navigate backward from intake to gallery and forward again, then assert answers and selected template are preserved.

- [ ] **Step 2: Run the browser test and verify it fails**

Run: `npx vitest run tests/create-flow-browser.test.ts`

Expected: FAIL until all UI, persistence, and build contracts are connected.

- [ ] **Step 3: Complete missing integration details only**

Fix wiring exposed by the browser journeys without adding new scope. Ensure loading states are bounded, failed builds show a retryable French error, double submission is prevented, native dialogs close cleanly, and every CTA has a working destination.

- [ ] **Step 4: Document local verification**

Add the exact commands for starting the app, generating template previews, running focused creation-flow tests, and running the full suite. Document that template fixtures are previews only and that real customer content is generated from submitted answers and product analysis.

- [ ] **Step 5: Run complete verification**

Run: `npx vitest run`

Run: `npx tsc --noEmit`

Run: `npm run build`

Run: `npm run previews:templates`

Expected: every test passes, type checking passes, production build succeeds, and the preview generator is deterministic on a second run.

- [ ] **Step 6: Verify manually in the local browser**

Start the server, open `/dashboard`, and repeat the homepage, product, and blank journeys at desktop and mobile widths. Confirm the right format-specific gallery and intake appear, preview dialogs switch sizes, refresh preserves progress, and each successful build opens the editor with the selected structured template.

- [ ] **Step 7: Commit and deploy**

```bash
git add tests/create-flow-browser.test.ts tests/dashboard-hydrate.test.ts tests/create-build-view.test.ts README.md
git commit -m "test: verify format-specific creation journeys"
git push origin main
```

Deploy the verified `main` branch through the existing Vercel workflow, then smoke-test `/dashboard`, `/creer?format=home`, `/creer?format=product`, and `/creer?format=blank` on production.
