# Shopify Commerce Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make product forms, variants, quantity offers, fixed bundles, subscriptions, preorders, and custom bundles reflect real Shopify capabilities instead of visual simulations.

**Architecture:** A capability report separates native theme behavior from app-required behavior. Native Liquid uses Shopify product forms and selling-plan data; advanced mix-and-match uses a Weflo theme app extension and Cart Transform Function, and stays publish-blocked until installed.

**Tech Stack:** TypeScript, Liquid, Shopify Admin/Storefront APIs, theme app extensions, Cart Transform Function, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-hybrid-shopify-section-engine-design.md`

## Global Constraints

- A visual bundle selector is never treated as a Shopify bundle by itself.
- Customized bundles and selling plans are distinct strategies and are not combined.
- Prices, variants, availability, and selling plans come from Shopify objects at runtime.
- Theme-editor load/unload events reinitialize and destroy namespaced behavior.
- Missing integrations produce a French setup action and a publish blocker.
- Existing user theme files are never overwritten without an explicit publication plan.

---

### Task 1: Capability report and publish guard

**Files:**
- Create: `src/shopify/capability-report.ts`
- Modify: `src/editor/document.ts`
- Modify: `src/shopify/compiler.ts`
- Modify: `src/editor/ui/publish-dialog.ts`
- Test: `tests/shopify-capabilities.test.ts`

**Interfaces:**
- Consumes: `SectionCapability[]`, Shopify connection/theme/app metadata.
- Produces: `ShopifyCapabilityState = "available" | "setup-required" | "unsupported"`, `buildCapabilityReport()`, `assertPublishCapabilities()`.

- [ ] **Step 1: Write failing capability tests**

```ts
const report = buildCapabilityReport({ sections: [customBundleSection], shopify: connectedWithoutExtension });
expect(report.capabilities["custom-bundle"].state).toBe("setup-required");
expect(() => assertPublishCapabilities(report)).toThrow("Configure le bundle personnalisable");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-capabilities.test.ts`

Expected: FAIL because capability reporting is absent.

- [ ] **Step 3: Implement explicit capability resolution**

```ts
export type ShopifyCapabilityReport = {
  capabilities: Record<SectionCapability, { state: ShopifyCapabilityState; reason: string; action?: { label: string; href: string } }>;
  blockers: string[];
};
```

Resolve native product form, variants, fixed bundles, Markets, and localization
from Shopify/theme metadata. Resolve custom bundle and app blocks only when the
Weflo extension installation is confirmed. The compiler accepts this report and
rejects unavailable behavior before creating files.

- [ ] **Step 4: Run compiler and publish-dialog tests**

Run: `npx vitest run tests/shopify-capabilities.test.ts tests/shopify-compiler.test.ts tests/editor-publish-dialog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/capability-report.ts src/editor/document.ts src/shopify/compiler.ts src/editor/ui/publish-dialog.ts tests/shopify-capabilities.test.ts
git commit -m "feat: gate Shopify commerce capabilities"
```

### Task 2: Native product, variant, cart, and quantity runtime

**Files:**
- Create: `src/shopify/liquid/product-form.ts`
- Create: `src/shopify/runtime/product-form.ts`
- Modify: `src/sections/packs/product-packs.ts`
- Modify: `src/shopify/compiler.ts`
- Test: `tests/shopify-product-runtime.test.ts`

**Interfaces:**
- Consumes: product-form, variant-selection, quantity-breaks, cart-drawer capabilities.
- Produces: `renderProductFormLiquid(section)`, browser initializer `mountWefloProduct(root)`.

- [ ] **Step 1: Write failing Liquid/runtime tests**

```ts
expect(renderProductFormLiquid(section)).toContain("{% form 'product', product %}");
expect(renderProductFormLiquid(section)).toContain('name="id"');
expect(renderProductFormLiquid(section)).toContain('name="quantity"');
expect(runtimeSource).toContain("shopify:section:load");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-product-runtime.test.ts`

Expected: FAIL on missing Liquid helper and runtime.

- [ ] **Step 3: Implement Shopify-native controls**

Liquid emits variant IDs, option values, current price, compare-at price,
availability, quantity, and selling-plan inputs from `product`. Runtime updates
price/media/availability, posts to `/cart/add.js`, publishes cart events, and
deduplicates listeners by a `data-wf-mounted` marker. Quantity offers change the
submitted quantity; they do not invent discounted prices.

- [ ] **Step 4: Run commerce renderer tests**

Run: `npx vitest run tests/shopify-product-runtime.test.ts tests/sections-commerce.test.ts tests/shopify-compiler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/liquid/product-form.ts src/shopify/runtime/product-form.ts src/sections/packs/product-packs.ts src/shopify/compiler.ts tests/shopify-product-runtime.test.ts
git commit -m "feat: add native Shopify product runtime"
```

### Task 3: Fixed bundles, multipacks, selling plans, and preorders

**Files:**
- Create: `src/shopify/liquid/purchase-options.ts`
- Modify: `src/sections/packs/offer-packs.ts`
- Modify: `src/shopify/capability-report.ts`
- Test: `tests/shopify-purchase-options.test.ts`

**Interfaces:**
- Consumes: Shopify bundle product variants, `product.selling_plan_groups`, preorder provider configuration.
- Produces: `renderPurchaseOptionsLiquid()`, capability-specific editor setup states.

- [ ] **Step 1: Write failing purchase-option tests**

```ts
expect(renderPurchaseOptionsLiquid(subscriptionInput)).toContain("selling_plan");
expect(renderPurchaseOptionsLiquid(fixedBundleInput)).toContain("product.selected_or_first_available_variant.id");
expect(resolvePurchaseStrategy({ customBundle: true, sellingPlan: true })).toEqual({ ok: false, reason: expect.any(String) });
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-purchase-options.test.ts`

Expected: FAIL because the strategy renderer does not exist.

- [ ] **Step 3: Implement distinct strategies**

Fixed bundle submits the actual Shopify bundle variant. Multipack submits a
quantity for one selected variant. Subscription submits a selling-plan ID.
Preorder renders only with a configured provider/metafield contract. Return a
French setup card in editor preview and a compile blocker in publish mode when
required data is absent.

- [ ] **Step 4: Run purchase and capability tests**

Run: `npx vitest run tests/shopify-purchase-options.test.ts tests/shopify-capabilities.test.ts tests/premium-section-packs.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/liquid/purchase-options.ts src/sections/packs/offer-packs.ts src/shopify/capability-report.ts tests/shopify-purchase-options.test.ts
git commit -m "feat: connect Shopify purchase options"
```

### Task 4: Weflo mix-and-match app extension contract

**Files:**
- Create: `extensions/weflo-purchase-options/shopify.extension.toml`
- Create: `extensions/weflo-purchase-options/blocks/mix-and-match.liquid`
- Create: `extensions/weflo-purchase-options/assets/mix-and-match.js`
- Create: `extensions/weflo-cart-transform/shopify.extension.toml`
- Create: `extensions/weflo-cart-transform/src/run.ts`
- Create: `extensions/weflo-cart-transform/src/run.graphql`
- Create: `src/shopify/app-extension.ts`
- Test: `tests/shopify-app-extension.test.ts`

**Interfaces:**
- Consumes: selected component variant IDs and quantities in line-item attributes.
- Produces: `WefloBundleConfiguration`, `detectWefloExtensionInstallation()`, deterministic Cart Transform operations.

- [ ] **Step 1: Write failing fixture-based Function tests**

```ts
const result = run(cartWithWefloBundleComponents);
expect(result.operations).toEqual([{ lineExpand: expect.objectContaining({ cartLineId: "gid://shopify/CartLine/1" }) }]);
expect(run(cartWithSellingPlan).operations).toEqual([]);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-app-extension.test.ts`

Expected: FAIL because extension files and transform function are absent.

- [ ] **Step 3: Implement the extension boundary**

The app block serializes a signed configuration ID plus chosen merchandise IDs;
the Function reads only those declared attributes, verifies all components, and
returns no operation for selling-plan lines or malformed input. The server-side
detection helper reports installation from theme app extension/app metadata,
never from the mere presence of an editor section.

- [ ] **Step 4: Run extension and phase gates**

Run: `npx vitest run tests/shopify-app-extension.test.ts tests/shopify-capabilities.test.ts && npm test && npm run build`

Expected: PASS. Deployment to a Shopify development store remains a release operation, not a unit-test assumption.

- [ ] **Step 5: Commit**

```bash
git add extensions src/shopify/app-extension.ts tests/shopify-app-extension.test.ts
git commit -m "feat: add Weflo mix and match extension"
```
