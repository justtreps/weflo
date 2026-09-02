# Dashboard, Direct Checkout, and Premium Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the “Pages” table-first experience with a visual Weflo home, redirect the publishing paywall directly to Whop checkout, and generate visibly distinct Shopify-native store compositions from product context.

**Architecture:** Keep the existing API, page document, editor, and Shopify publishing boundaries. Add a tested dashboard presentation model, render an isolated HTML prototype before integrating it, add a small checkout client that consumes the existing billing endpoint, then introduce art-direction profiles and store recipes that configure the existing section registry and compiler. The supplied Minimog ZIP remains an external private reference and is never copied or committed.

**Tech Stack:** TypeScript, Hono, PostgreSQL, OpenAI, HTML/CSS, Vitest, Shopify Liquid/JSON templates, Whop, Vercel

**Spec:** `docs/superpowers/specs/2026-09-02-dashboard-whop-shopify-quality-design.md`

## Global Constraints

- Work directly on `main`, preserving unrelated `_tmp` directories.
- Keep the Weflo interface in French; storefront copy may use the customer language.
- Never commit, copy, or deploy the supplied third-party theme ZIP.
- Project cards must use real document media when available.
- Publishing remains locked until the Whop webhook records an active Pro plan.
- Shopify output must remain namespaced and support active, duplicated-active, and new-theme strategies.
- Existing merchant theme assets must not be overwritten unless they are Weflo-owned.

---

### Task 1: Dashboard presentation model

**Files:**
- Create: `src/dashboard/home-model.ts`
- Test: `tests/dashboard-home-model.test.ts`

**Interfaces:**
- Consumes: `Page`, `Workspace`, and page document media settings.
- Produces: `dashboardHomeModel(input: { pages: Page[]; workspace: Workspace; userName?: string | null }): DashboardHomeModel`.
- Produces: `projectPreviewImage(page: Page): string | null`.

- [ ] **Step 1: Write failing model tests**

```ts
expect(projectPreviewImage(pageWithProductImage)).toBe("https://cdn.example/lamp.webp");
expect(dashboardHomeModel({ pages: [published, draft], workspace, userName: "Théo" })).toMatchObject({
  greeting: "Bonjour Théo",
  projects: [{ statusLabel: "Publiée sur Shopify" }, { statusLabel: "Brouillon" }],
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/dashboard-home-model.test.ts`

Expected: FAIL because `src/dashboard/home-model.ts` does not exist.

- [ ] **Step 3: Implement media discovery and status mapping**

Search section settings recursively for the first valid `https:` or `data:image/` value whose key contains `image`, `media`, `poster`, or `thumbnail`. Map `draft`, `published_hosted`, and `published_shopify` to explicit French labels and colors. Sort projects by `updatedAt` descending and expose the six most recent projects.

```ts
export type DashboardProject = {
  id: string;
  name: string;
  typeLabel: string;
  statusLabel: "Brouillon" | "Prête" | "Publiée sur Shopify";
  previewImage: string | null;
  updatedLabel: string;
};
```

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/dashboard-home-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/dashboard/home-model.ts tests/dashboard-home-model.test.ts
git commit -m "feat: add dashboard home presentation model"
```

### Task 2: Interactive dashboard HTML prototype

**Files:**
- Create: `public/maquette-dashboard.html`
- Create: `src/hydrate/maquette-dashboard.css`
- Create: `src/hydrate/maquette-dashboard.ts`
- Modify: `src/server/app.ts`
- Modify: `package.json`
- Test: `tests/dashboard-prototype.test.ts`

**Interfaces:**
- Consumes: static representative Weflo projects and existing preview assets.
- Produces: `/maquette-dashboard`, a standalone interactive prototype with no database writes.

- [ ] **Step 1: Write the failing route and content contract**

```ts
const response = await app.request("/maquette-dashboard");
expect(response.status).toBe(200);
const html = await response.text();
expect(html).toContain("Que veux-tu vendre ?");
expect(html).toContain("Mes créations");
expect(html).toContain("data-start-mode=\"image\"");
```

- [ ] **Step 2: Verify the contract fails**

Run: `npx vitest run tests/dashboard-prototype.test.ts`

Expected: FAIL with HTTP 404.

- [ ] **Step 3: Build the prototype structure**

Create semantic HTML for the sidebar, creation desk, starting modes, visual project shelf, actions-to-finish list, and Shopify status panel. Use `editor-preview-brulerie-sud-desktop.webp`, `editor-preview-tenon-mobile.webp`, and other existing Weflo-owned previews. Add the route to `htmlRoutes` in `src/server/app.ts`.

- [ ] **Step 4: Implement intentional responsive styling**

Use the design tokens from the spec, Syne for short headings, Inter for UI, a wide image-led project shelf, visible focus states, and reduced-motion support. At widths below 760 px, replace the sidebar with bottom navigation and make the project shelf horizontally scrollable.

- [ ] **Step 5: Add prototype interactions**

`src/hydrate/maquette-dashboard.ts` must:

```ts
document.querySelector('[data-start-mode="link"]')?.addEventListener("click", focusPrompt);
document.querySelector('[data-start-mode="image"]')?.addEventListener("click", openImagePicker);
document.querySelector('[data-start-mode="shopify"]')?.addEventListener("click", openShopifyPanel);
document.querySelector('[data-start-mode="blank"]')?.addEventListener("click", showBlankConfirmation);
```

Add the entrypoint to `build:hydrate` and load the generated module from the prototype.

- [ ] **Step 6: Verify desktop and mobile screenshots**

Run: `npm run build`, open `http://localhost:3101/maquette-dashboard`, and inspect at 1440×1000 and 390×844. Confirm there are no overlaps, clipped actions, placeholder rectangles, or unreadable text.

- [ ] **Step 7: Commit**

```powershell
git add public/maquette-dashboard.html src/hydrate/maquette-dashboard.css src/hydrate/maquette-dashboard.ts src/server/app.ts package.json tests/dashboard-prototype.test.ts
git commit -m "feat: add interactive dashboard home prototype"
```

### Task 3: Integrate the approved home into the real dashboard

**Files:**
- Create: `src/dashboard/home-view.ts`
- Create: `src/hydrate/dashboard-home.css`
- Modify: `src/hydrate/dashboard.ts`
- Modify: `public/dashboard.html`
- Modify: `package.json`
- Modify: `src/hydrate/app-chrome.ts`
- Test: `tests/dashboard-home-view.test.ts`
- Test: `tests/dashboard-hydrate.test.ts`
- Test: `tests/app-chrome.test.ts`

**Interfaces:**
- Consumes: `DashboardHomeModel` from Task 1.
- Produces: `renderDashboardHome(model: DashboardHomeModel): string`.
- Preserves: create, open, preview, duplicate, rename, delete, search, filter, and Canardo actions.

- [ ] **Step 1: Write failing render and navigation tests**

```ts
expect(renderDashboardHome(model)).toContain('data-dashboard-action="generate"');
expect(renderDashboardHome(model)).toContain('data-project-id="pg_1"');
expect(resolveNavHref("Accueil")).toBe("/dashboard");
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts tests/app-chrome.test.ts`

- [ ] **Step 3: Implement the pure view renderer**

Return accessible markup only. Escape every user-controlled value. Project cards use `previewImage`; missing media uses a branded text treatment derived from the project name, never “Aperçu indisponible”.

- [ ] **Step 4: Mount the new home after `/api/pages` loads**

In `hydrateDashboard`, build the model after `reload()` and replace the marked legacy content node. Route actions as follows:

```ts
generate -> location.assign("/start")
link -> location.assign("/start?mode=link")
image -> location.assign("/start?mode=image")
shopify -> location.assign("/facturation#shopify")
blank -> createAndOpen("blank", "Page vierge")
```

Bind each project card to the existing page operations rather than duplicating API logic.

- [ ] **Step 5: Update navigation vocabulary**

Change the primary sidebar label from `Pages` to `Accueil` and add `Mes créations` as the project-library anchor on the same dashboard. Update route-label tests and all shared chrome hydration mappings.

- [ ] **Step 6: Run focused tests and build**

Run: `npx vitest run tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts tests/app-chrome.test.ts && npm run build`

Expected: all tests and build pass.

- [ ] **Step 7: Commit**

```powershell
git add src/dashboard/home-view.ts src/hydrate/dashboard-home.css src/hydrate/dashboard.ts src/hydrate/app-chrome.ts public/dashboard.html package.json tests/dashboard-home-view.test.ts tests/dashboard-hydrate.test.ts tests/app-chrome.test.ts
git commit -m "feat: replace pages table with visual dashboard home"
```

### Task 4: Direct Whop checkout from the publishing paywall

**Files:**
- Create: `src/hydrate/pro-checkout.ts`
- Modify: `src/hydrate/publish-access.ts`
- Modify: `src/hydrate/editeur.ts`
- Modify: `src/server/billing.ts`
- Test: `tests/pro-checkout.test.ts`
- Test: `tests/whop-billing.test.ts`
- Test: `tests/publish-access.test.ts`

**Interfaces:**
- Consumes: `GET /api/billing` and `POST /api/billing/checkout`.
- Produces: `createProCheckout(fetchImpl?: typeof fetch): Promise<string>` returning an absolute Whop purchase URL.
- Changes billing response to include `workspace: { id: string }`.

- [ ] **Step 1: Write failing checkout tests**

```ts
const url = await createProCheckout(mockFetch);
expect(url).toBe("https://whop.com/checkout/config_test");
expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/billing/checkout", expect.objectContaining({ method: "POST" }));
```

Add error cases for missing Pro plan, invalid returned URL, and HTTP failure.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/pro-checkout.test.ts tests/whop-billing.test.ts tests/publish-access.test.ts`

- [ ] **Step 3: Expose workspace ID in the authenticated billing payload**

Return:

```ts
{
  workspace: { id: workspace.id },
  plan: { status, planId },
  catalog: { pro: process.env.WHOP_PLAN_PRO?.trim() || null }
}
```

- [ ] **Step 4: Implement direct checkout creation**

Fetch billing, require `catalog.pro`, then POST `{ workspaceId, kind: "subscription", planId: catalog.pro }`. Accept only an HTTPS URL whose hostname is `whop.com` or ends with `.whop.com`.

- [ ] **Step 5: Replace the paywall link with an action button**

Render `<button data-pro-checkout>Passer à Weflo Pro</button>`. On click, disable it, show `Ouverture du paiement…`, call `createProCheckout()`, then use `location.assign(url)`. On failure restore the button and render a French inline error with a retry action. Do not navigate to `/facturation`.

- [ ] **Step 6: Verify focused tests**

Run: `npx vitest run tests/pro-checkout.test.ts tests/whop-billing.test.ts tests/publish-access.test.ts tests/editor-browser-contract.test.ts`

- [ ] **Step 7: Commit**

```powershell
git add src/hydrate/pro-checkout.ts src/hydrate/publish-access.ts src/hydrate/editeur.ts src/server/billing.ts tests/pro-checkout.test.ts tests/whop-billing.test.ts tests/publish-access.test.ts
git commit -m "feat: open Whop checkout directly from publish paywall"
```

### Task 5: Product truth sheet and art-direction profiles

**Files:**
- Create: `src/onboarding/product-truth.ts`
- Create: `src/onboarding/art-direction.ts`
- Modify: `src/onboarding/types.ts`
- Modify: `src/onboarding/openai-analysis.ts`
- Modify: `src/onboarding/fallback-analysis.ts`
- Test: `tests/product-truth.test.ts`
- Test: `tests/art-direction.test.ts`

**Interfaces:**
- Produces: `ProductTruthSheet`, separating `observedFacts`, `supplierClaims`, and `inferences`.
- Produces: `selectArtDirection(input: ProductTruthSheet): ArtDirectionProfile`.
- Profile IDs: `editorial-beauty`, `clinical-wellness`, `technical-performance`, `warm-home`, `playful-gifting`, `premium-accessories`, `food-craft`, `direct-response`.

- [ ] **Step 1: Write failing truth and profile tests**

Verify that unknown material, certification, review count, and dimensions are never invented. Verify a lamp selects `warm-home`, a skincare serum selects `clinical-wellness` or `editorial-beauty`, and a posture device selects `direct-response` or `technical-performance`.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/product-truth.test.ts tests/art-direction.test.ts`

- [ ] **Step 3: Implement deterministic truth extraction**

Observed values come only from `ImportedProduct`. Claims must retain their source text. Inferences are explicitly labeled and may guide copy, but cannot populate factual product fields.

- [ ] **Step 4: Implement profile selection**

Use weighted keywords from title, description, vendor, variants, and extracted claims. Resolve ties with a documented stable priority. Each profile defines heading/body font choices, media ratio, spacing rhythm, corner behavior, proof mode, and button treatment.

- [ ] **Step 5: Extend OpenAI structured output**

Ask OpenAI to return the same three truth categories and one recommended profile ID. Parse conservatively; discard unknown profile IDs and fall back to deterministic selection.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run tests/product-truth.test.ts tests/art-direction.test.ts tests/onboarding-analysis.test.ts`

- [ ] **Step 7: Commit**

```powershell
git add src/onboarding/product-truth.ts src/onboarding/art-direction.ts src/onboarding/types.ts src/onboarding/openai-analysis.ts src/onboarding/fallback-analysis.ts tests/product-truth.test.ts tests/art-direction.test.ts
git commit -m "feat: derive product truth and art direction"
```

### Task 6: Product-specific store recipes

**Files:**
- Create: `src/onboarding/store-recipe.ts`
- Modify: `src/onboarding/compile-store.ts`
- Modify: `src/onboarding/types.ts`
- Test: `tests/store-recipe.test.ts`
- Test: `tests/onboarding-build.test.ts`

**Interfaces:**
- Consumes: `ProductTruthSheet`, `ArtDirectionProfile`, personas, and marketing angles.
- Produces: `buildStoreRecipe(input): StoreRecipe` with ordered `{ type, variant, purpose }` entries.

- [ ] **Step 1: Write failing recipe tests**

```ts
expect(buildStoreRecipe(lamp).sections.map((item) => item.variant)).toContain("ambient-editorial");
expect(buildStoreRecipe(postureDevice).sections.map((item) => item.variant)).toContain("problem-solution");
expect(buildStoreRecipe(giftBox).sections.map((item) => item.variant)).toContain("giftable-story");
expect(new Set([lamp.id, postureDevice.id, giftBox.id]).size).toBe(3);
```

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/store-recipe.test.ts tests/onboarding-build.test.ts`

- [ ] **Step 3: Implement eight recipe families**

Each art direction owns a default sequence and variants. Every recipe must contain navigation, product purchase, proof, objection handling, final CTA, and footer, but sequence and presentation differ by product context. Avoid inserting countdown or urgency when the product data provides no credible basis.

- [ ] **Step 4: Compile recipes into editable documents**

`buildStoreDocument` maps each recipe item to an existing registered section and writes `variant`, `purpose`, and profile-driven settings into that section. All output remains editable through the existing section inspector and Canardo command pipeline.

- [ ] **Step 5: Verify three full generated documents**

Assert distinct section order, variants, theme tokens, and hero/buy-box copy for home lighting, beauty, and a technical problem-solving product.

- [ ] **Step 6: Commit**

```powershell
git add src/onboarding/store-recipe.ts src/onboarding/compile-store.ts src/onboarding/types.ts tests/store-recipe.test.ts tests/onboarding-build.test.ts
git commit -m "feat: generate product-specific store recipes"
```

### Task 7: Premium responsive section variants

**Files:**
- Modify: `src/sections/hero.ts`
- Modify: `src/sections/product-main.ts`
- Modify: `src/sections/benefits.ts`
- Modify: `src/sections/reviews.ts`
- Modify: `src/sections/comparison.ts`
- Modify: `src/sections/bundle.ts`
- Modify: `src/sections/faq.ts`
- Modify: `src/sections/brand-media.ts`
- Modify: `src/sections/shared.ts`
- Modify: `src/editor/render/render-section.ts`
- Test: `tests/premium-section-variants.test.ts`
- Test: `tests/editor-renderer.test.ts`
- Test: `tests/shopify-compiler.test.ts`

**Interfaces:**
- Consumes: section setting `variant` from Task 6.
- Produces: distinct editor HTML and Shopify Liquid for every registered premium variant.

- [ ] **Step 1: Write failing variant contracts**

For each critical section, compile at least two variants and assert materially different DOM/Liquid structure, not only class names or colors. Product-main tests must cover gallery, variants, quantity, price, compare-at price, add-to-cart, bundle selector, trust line, and sticky mobile CTA.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/premium-section-variants.test.ts tests/editor-renderer.test.ts tests/shopify-compiler.test.ts`

- [ ] **Step 3: Implement variant-specific structures**

Add focused render helpers per section. Reuse escaped content and setting readers from `shared.ts`. Each variant gets intentional hierarchy, media crops, spacing, and proof placement driven by its profile.

- [ ] **Step 4: Add responsive and interaction behavior**

Ensure mobile gallery, sticky cart, FAQ disclosure, bundle selection, and comparison layouts work without global selectors. Respect `prefers-reduced-motion`. Use namespaced Weflo classes in both preview and Liquid.

- [ ] **Step 5: Validate editor/Shopify parity**

The editor preview and Liquid output must expose the same content, order, variant, and commerce controls. Run the focused tests and manually compare one generated page at desktop and mobile widths.

- [ ] **Step 6: Commit**

```powershell
git add src/sections/hero.ts src/sections/product.ts src/sections/reviews.ts src/sections/bundle.ts src/sections/benefits.ts src/sections/comparison.ts src/sections/faq.ts src/sections/story.ts src/sections/trust.ts src/sections/cta.ts src/editor/render/render-section.ts tests/premium-section-variants.test.ts tests/editor-renderer.test.ts tests/shopify-compiler.test.ts
git commit -m "feat: add premium Shopify section variants"
```

### Task 8: Shopify-safe publication validation

**Files:**
- Create: `src/shopify/validate-theme-output.ts`
- Modify: `src/shopify/compiler.ts`
- Modify: `src/shopify/publication-plan.ts`
- Modify: `src/shopify/publisher.ts`
- Test: `tests/shopify-theme-output.test.ts`
- Test: `tests/shopify-publication-plan.test.ts`
- Test: `tests/shopify-publisher.test.ts`

**Interfaces:**
- Produces: `validateThemeOutput(files: CompiledThemeFile[]): ThemeValidationResult`.
- Preserves: `active`, `duplicate_active`, and `new_weflo` publication strategies.

- [ ] **Step 1: Write failing safety tests**

Reject duplicate keys, non-Weflo section asset names, malformed JSON templates, schemas without presets, and global-template replacement without explicit confirmation. Verify rollback records every upserted asset.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run tests/shopify-theme-output.test.ts tests/shopify-publication-plan.test.ts tests/shopify-publisher.test.ts`

- [ ] **Step 3: Implement local validation before Shopify writes**

Parse every JSON template, extract and parse every Liquid schema block, verify namespacing, confirm referenced section files exist, and return all validation errors before calling Shopify.

- [ ] **Step 4: Attach validation to publication planning**

Fail with a French actionable error before creating or changing a Shopify theme. Preserve the exact asset operation record used by rollback.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run tests/shopify-theme-output.test.ts tests/shopify-publication-plan.test.ts tests/shopify-publisher.test.ts tests/shopify-existing-theme.test.ts`

- [ ] **Step 6: Commit**

```powershell
git add src/shopify/validate-theme-output.ts src/shopify/compiler.ts src/shopify/publication-plan.ts src/shopify/publisher.ts tests/shopify-theme-output.test.ts tests/shopify-publication-plan.test.ts tests/shopify-publisher.test.ts
git commit -m "feat: validate Shopify theme output before publishing"
```

### Task 9: Full verification and production rollout

**Files:**
- Modify: `tests/acceptance-checklist.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: deployed and verified Weflo release.

- [ ] **Step 1: Run the full local verification suite**

Run:

```powershell
npm test -- --run
npx tsc --noEmit
npm run build
git diff --check
```

Expected: zero failures and zero TypeScript/build errors.

- [ ] **Step 2: Complete browser acceptance checks**

Verify `/maquette-dashboard` and `/dashboard` at desktop and mobile widths. Verify creation from link, image, Shopify, and blank page. Open the editor publishing paywall and confirm its CTA creates one Whop checkout request and navigates directly to Whop.

- [ ] **Step 3: Complete Shopify development-theme checks**

Generate three unrelated stores and validate distinct recipes. Publish one page to a new Weflo theme and one to a duplicated active theme. Confirm product variants, add-to-cart, bundle, sticky mobile CTA, FAQ, and rollback.

- [ ] **Step 4: Update acceptance evidence**

Record exact commands, test counts, URLs, theme IDs, and any external checks that require a connected Shopify development store. Do not mark external checks complete without evidence.

- [ ] **Step 5: Push and deploy**

```powershell
git push origin main
npx vercel --prod --yes
```

- [ ] **Step 6: Verify production**

Confirm `https://buildstore-eta.vercel.app/dashboard` renders the new home for an authenticated user, invalid API failures remain JSON, the paywall returns a Whop checkout URL, and the final Vercel deployment is READY.
