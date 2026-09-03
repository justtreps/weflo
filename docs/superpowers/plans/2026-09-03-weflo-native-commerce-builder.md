# Weflo Native Commerce Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first genuinely editable Weflo commerce section with two-level selection/reordering and Shopify-compatible quantity offers.

**Architecture:** Preserve the existing array-based editor document and immutable command store. Add block-aware selection and commands, replace the generic quantity-offer rendering with a dedicated Web/Liquid implementation, then expose a contextual offer editor and precise section/block drag targets.

**Tech Stack:** TypeScript, Vitest, iframe `srcdoc` canvas runtime, Shopify Liquid/schema, CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-weflo-native-commerce-builder-design.md`

## Global Constraints

- Weflo sections and styles must be original; do not copy proprietary theme source.
- The same ordered `sections` and `blocks` data drives editor, preview, undo/redo, autosave and Shopify compilation.
- Mixed-product bundles must show `app-required` unless the Weflo bundle capability is available.
- All merchant-facing UI copy is French.
- Existing version-2 documents must remain valid and migrate without data loss.
- Use immutable editor commands for every document mutation.

---

### Task 1: Block-aware editor state and immutable commands

**Files:**
- Modify: `src/editor/commands.ts`
- Modify: `src/editor/ui/store.ts`
- Modify: `src/editor/ui/canvas-bridge.ts`
- Modify: `src/editor/ui/canvas.ts`
- Modify: `src/editor/ui/canvas-runtime.ts`
- Test: `tests/editor-commands.test.ts`
- Test: `tests/editor-direct-manipulation.test.ts`

**Interfaces:**
- Produces: `updateBlockSetting`, `duplicateBlock`, block-aware canvas `select`, and `EditorState.selectedBlockId: string | null`.
- Consumes: existing `moveBlock`, `insertBlock`, `removeBlock`, `EditorStore.dispatch()` and `data-wf-block-id` markup.

- [ ] **Step 1: Write failing command and bridge tests**

```ts
expect(applyCommand(document, { type: "updateBlockSetting", sectionId: "offer-1", blockId: "duo", key: "quantity", value: 2 }).pages[0].sections[0].blocks[0].settings.quantity).toBe(2);
expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:select", sectionId: "offer-1", blockId: "duo" })).toEqual({ type: "select", sectionId: "offer-1", blockId: "duo" });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/editor-commands.test.ts tests/editor-direct-manipulation.test.ts`  
Expected: FAIL because block setting updates and block-aware selection are missing.

- [ ] **Step 3: Implement immutable block mutations and block selection**

Add these command shapes:

```ts
| { type: "updateBlockSetting"; sectionId: string; blockId: string; key: string; value: SettingValue }
| { type: "duplicateBlock"; sectionId: string; blockId: string; newBlockId: string; index?: number }
```

Add `selectedBlockId` to editor state, clear it whenever the selected section/page changes, and make canvas `canvas:select` accept an optional validated `blockId`. The iframe runtime posts the nearest block ID on click.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/editor-commands.test.ts tests/editor-direct-manipulation.test.ts tests/editor-canvas.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/commands.ts src/editor/ui/store.ts src/editor/ui/canvas-bridge.ts src/editor/ui/canvas.ts src/editor/ui/canvas-runtime.ts tests/editor-commands.test.ts tests/editor-direct-manipulation.test.ts tests/editor-canvas.test.ts
git commit -m "feat: add block-aware editor commands"
```

### Task 2: Dedicated quantity-offer section package

**Files:**
- Create: `src/sections/quantity-offer.ts`
- Modify: `src/sections/packs/offer-packs.ts`
- Modify: `src/sections/index.ts`
- Modify: `src/editor/render/premium-section-styles.ts`
- Test: `tests/quantity-offer-section.test.ts`
- Test: `tests/shopify-compiler.test.ts`

**Interfaces:**
- Consumes: `EditorSection.blocks`, `SectionPackDefinition`, `renderPurchaseOptionsLiquid()` and the registry.
- Produces: registered `quantity-offer` pack with `offer-tier` blocks and three structural variants.

- [ ] **Step 1: Write failing semantic parity tests**

```ts
expect(web).toContain('data-wf-block-id="duo"');
expect(web).toContain('value="2"');
expect(liquid).toContain('block.settings.quantity');
expect(liquid).toContain('name="quantity"');
expect(schema.blocks[0].type).toBe("offer-tier");
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/quantity-offer-section.test.ts tests/shopify-compiler.test.ts`  
Expected: FAIL because `quantity-offer` still uses the generic product pack renderer.

- [ ] **Step 3: Implement the original Weflo offer package**

Define tier defaults with `title`, `subtitle`, `badge`, `quantity`, `discount_type`, `discount_value`, `product_handle`, `variant_id`, `preselected`, and `show_variant_picker`. Render an accessible radio group in Web and Liquid. Emit `name="quantity"` from the selected tier and use Shopify product/variant objects in Liquid; do not snapshot fixture pricing into publication output.

- [ ] **Step 4: Add three distinct responsive compositions**

Implement `horizontal-cards`, `stacked-premium`, and `tier-table` using namespaced `.wf-quantity-offer` styles and mobile rules. Preserve `data-wf-block-id` on every tier.

- [ ] **Step 5: Run focused tests and build**

Run: `npx vitest run tests/quantity-offer-section.test.ts tests/shopify-compiler.test.ts tests/section-registry.test.ts && npm run build:hydrate`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sections/quantity-offer.ts src/sections/packs/offer-packs.ts src/sections/index.ts src/editor/render/premium-section-styles.ts tests/quantity-offer-section.test.ts tests/shopify-compiler.test.ts
git commit -m "feat: add native quantity offer section"
```

### Task 3: Contextual offers and bundles editor

**Files:**
- Create: `src/editor/ui/offer-editor.ts`
- Modify: `src/editor/ui/panels/commerce.ts`
- Modify: `src/editor/ui/left-rail.ts`
- Modify: `src/editor/ui/layout.css`
- Test: `tests/editor-offer-editor.test.ts`
- Test: `tests/editor-left-rail.test.ts`

**Interfaces:**
- Consumes: Task 1 block commands and `selectedBlockId`; Task 2 `offer-tier` settings.
- Produces: `offerEditorMarkup(state)` and `bindOfferEditor(root, store)`.

- [ ] **Step 1: Write failing editor markup/action tests**

```ts
expect(markup).toContain("Offres et bundles");
expect(markup).toContain('data-offer-tier="duo"');
expect(markup).toContain('data-offer-action="add"');
expect(markup).toContain('data-offer-setting="discount_value"');
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/editor-offer-editor.test.ts tests/editor-left-rail.test.ts`  
Expected: FAIL because no domain editor exists.

- [ ] **Step 3: Implement contextual tier editing**

Render tier rows, capability state, quantity stepper, discount fields, badge, preselection, Shopify bindings, add/duplicate/move/delete controls and composition selector. Dispatch only immutable commands. Enforce one effective `preselected` tier by clearing it on siblings in the same user action path.

- [ ] **Step 4: Add block drag and keyboard movement in the panel**

Use `moveBlock` for pointer and ArrowUp/ArrowDown movement. Preserve visible handles and accessible French labels. Selecting a row updates `selectedBlockId` and selecting a different section clears it.

- [ ] **Step 5: Run focused tests and build**

Run: `npx vitest run tests/editor-offer-editor.test.ts tests/editor-left-rail.test.ts tests/editor-shell.test.ts && npm run build:hydrate`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/editor/ui/offer-editor.ts src/editor/ui/panels/commerce.ts src/editor/ui/left-rail.ts src/editor/ui/layout.css tests/editor-offer-editor.test.ts tests/editor-left-rail.test.ts
git commit -m "feat: add offers and bundles editor"
```

### Task 4: Precise stacked section drag-and-drop

**Files:**
- Modify: `src/editor/ui/canvas-runtime.ts`
- Modify: `src/editor/ui/drag-sections.ts`
- Modify: `src/editor/ui/layout.css`
- Test: `tests/editor-direct-manipulation.test.ts`
- Test: `tests/editor-browser-contract.test.ts`

**Interfaces:**
- Consumes: existing `moveSection`/`moveBlock` commands and block-aware canvas selection.
- Produces: before/after section drop targets, insertion rails, block reordering messages and keyboard-equivalent controls.

- [ ] **Step 1: Write failing target-resolution tests**

```ts
expect(sectionDropTarget(document, "hero-1", "proof-1", false)).toEqual({ pageId: "home", toIndex: 1 });
expect(sectionDropTarget(document, "hero-1", "proof-1", true)).toEqual({ pageId: "home", toIndex: 2 });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/editor-direct-manipulation.test.ts tests/editor-browser-contract.test.ts`  
Expected: FAIL until the runtime uses pointer midpoint and exposes insertion rails.

- [ ] **Step 3: Implement precise section and tier drops**

During dragover, compare the pointer Y coordinate with the target midpoint, render a top/bottom insertion rail, and post the correct before/after target. For `offer-tier` blocks, post `canvas:block-move` scoped to the parent section. Clear all drag state on drop and dragend.

- [ ] **Step 4: Run editor regression suite**

Run: `npx vitest run tests/editor-commands.test.ts tests/editor-direct-manipulation.test.ts tests/editor-browser-contract.test.ts tests/editor-canvas.test.ts tests/editor-offer-editor.test.ts`  
Expected: PASS.

- [ ] **Step 5: Build and commit**

Run: `npm run build`  
Expected: PASS.

```bash
git add src/editor/ui/canvas-runtime.ts src/editor/ui/drag-sections.ts src/editor/ui/layout.css tests/editor-direct-manipulation.test.ts tests/editor-browser-contract.test.ts
git commit -m "feat: refine stacked section drag and drop"
```

