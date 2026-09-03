# Canardo 2.0 Custom Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Canardo safely propose, preview, insert, save, and publish a missing section without executing raw model-authored Liquid, JavaScript, or CSS.

**Architecture:** OpenAI outputs a declarative, bounded section specification. A deterministic compiler maps approved layout/content/commerce primitives to Web and Liquid, validates the isolated result, and inserts only after user confirmation.

**Tech Stack:** TypeScript, OpenAI structured output, existing Canardo command protocol, isolated iframe previews, Liquid compiler, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-hybrid-shopify-section-engine-design.md`

## Global Constraints

- Raw model-authored JavaScript, CSS, HTML, and Liquid never execute.
- Remote dependencies, unsafe URLs, global selectors, and unsupported Liquid are rejected.
- Custom sections are workspace-private until an internal reviewed pack release.
- Desktop and mobile previews must pass before insertion can be confirmed.
- Every generated spec has a version, checksum, validation report, and rollback path.
- Commerce primitives require the same Shopify capability report as native packs.

---

### Task 1: Declarative custom-section DSL

**Files:**
- Create: `src/canardo/custom-spec.ts`
- Create: `src/canardo/custom-validate.ts`
- Test: `tests/canardo-custom-spec.test.ts`

**Interfaces:**
- Produces: `CustomSectionSpecV1`, `CustomNode`, `validateCustomSectionSpec()`.
- Consumes: `SectionCapability`, `InspectorControl`, token names.

- [ ] **Step 1: Write failing allowlist and rejection tests**

```ts
expect(validateCustomSectionSpec(validSpec).ok).toBe(true);
expect(validateCustomSectionSpec({ ...validSpec, nodes: [{ kind: "script", value: "fetch('x')" }] }).errors)
  .toContain("Primitive interdite: script");
expect(validateCustomSectionSpec(deepSpec).errors).toContain("La section dépasse 6 niveaux.");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/canardo-custom-spec.test.ts`

Expected: FAIL because the DSL does not exist.

- [ ] **Step 3: Implement the bounded DSL**

```ts
export type CustomNode =
  | { kind: "stack" | "grid"; token: string; children: CustomNode[] }
  | { kind: "heading" | "text" | "button" | "image" | "icon"; binding: string; token: string }
  | { kind: "repeater"; blockType: string; min: number; max: number; template: CustomNode[] }
  | { kind: "product-form" | "variant-selector" | "quantity-selector"; capability: SectionCapability };
export type CustomSectionSpecV1 = { version: 1; id: string; name: string; purpose: string; nodes: CustomNode[]; settings: InspectorControl[]; blocks: BlockDefinition[]; requiredCapabilities: SectionCapability[] };
```

Allow at most 120 nodes, depth 6, 30 settings, 12 blocks, configured bindings,
and configured design tokens. Reject unknown keys and duplicate IDs.

- [ ] **Step 4: Run security tests**

Run: `npx vitest run tests/canardo-custom-spec.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canardo/custom-spec.ts src/canardo/custom-validate.ts tests/canardo-custom-spec.test.ts
git commit -m "feat: define safe Canardo section DSL"
```

### Task 2: Deterministic Web and Liquid compiler

**Files:**
- Create: `src/canardo/custom-compile-web.ts`
- Create: `src/canardo/custom-compile-liquid.ts`
- Create: `src/canardo/custom-style.ts`
- Test: `tests/canardo-custom-compiler.test.ts`

**Interfaces:**
- Consumes: validated `CustomSectionSpecV1`, `DesignProfile`, capability report.
- Produces: `compileCustomWeb()`, `compileCustomLiquid()`, namespaced token CSS.

- [ ] **Step 1: Write failing deterministic compiler tests**

```ts
expect(compileCustomWeb(input)).toBe(compileCustomWeb(input));
expect(compileCustomLiquid(input)).toContain("{% schema %}");
expect(compileCustomLiquid(input)).not.toMatch(/<script|https?:\/\//);
expect(compileCustomWeb(input)).toContain(`[data-wf-custom="${input.spec.id}"]`);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/canardo-custom-compiler.test.ts`

Expected: FAIL because compilers do not exist.

- [ ] **Step 3: Map every primitive explicitly**

Use exhaustive TypeScript switches. Escape all text. Convert bindings to known
section settings, block settings, product fields, or image URLs. Style compiler
maps tokens to scoped class rules and cannot accept arbitrary property names.
Liquid product primitives call the shared Shopify product-form renderer and
therefore inherit capability gates.

- [ ] **Step 4: Run compiler/security tests**

Run: `npx vitest run tests/canardo-custom-compiler.test.ts tests/custom-code-section.test.ts tests/shopify-capabilities.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canardo/custom-compile-web.ts src/canardo/custom-compile-liquid.ts src/canardo/custom-style.ts tests/canardo-custom-compiler.test.ts
git commit -m "feat: compile safe custom sections"
```

### Task 3: OpenAI proposal service and protocol

**Files:**
- Modify: `src/canardo/protocol.ts`
- Modify: `src/canardo/prompt.ts`
- Modify: `src/canardo/validate.ts`
- Create: `src/canardo/custom-planner.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/canardo-custom-planner.test.ts`

**Interfaces:**
- Consumes: compact catalog context, merchant prompt, product truth, design profile.
- Produces: `CanardoCustomProposal = { mode: "custom-section"; spec; checksum; validation; requiresConfirmation: true }`.

- [ ] **Step 1: Write failing fallback and protocol tests**

```ts
expect(await planCustomSection(prompt, context)).toEqual(expect.objectContaining({ mode: "custom-section", requiresConfirmation: true }));
await expect(planCustomSection(maliciousPrompt, context)).rejects.toThrow("proposition non sécurisée");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/canardo-custom-planner.test.ts tests/canardo-protocol.test.ts`

Expected: FAIL because custom proposal mode is absent.

- [ ] **Step 3: Implement structured proposal generation**

Try registered-pack composition first. Enter custom mode only when catalog score
is below the defined threshold. Ask OpenAI for the exact DSL JSON Schema, parse,
validate, compile both outputs, calculate SHA-256, and return no editor command
until confirmation. A timeout returns a French retry message; it does not emit a
generic custom-code section.

- [ ] **Step 4: Run protocol/server tests**

Run: `npx vitest run tests/canardo-custom-planner.test.ts tests/canardo-protocol.test.ts tests/editor-api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/canardo/protocol.ts src/canardo/prompt.ts src/canardo/validate.ts src/canardo/custom-planner.ts src/server/pages.ts tests/canardo-custom-planner.test.ts
git commit -m "feat: propose custom sections with Canardo"
```

### Task 4: Isolated preview and confirmed insertion

**Files:**
- Create: `src/editor/ui/custom-section-preview.ts`
- Modify: `src/editor/ui/canardo-review.ts`
- Modify: `src/editor/ui/canardo.ts`
- Modify: `src/canardo/apply.ts`
- Test: `tests/editor-canardo-custom-preview.test.ts`

**Interfaces:**
- Consumes: `CanardoCustomProposal`, compiled Web markup, editor store.
- Produces: sandboxed desktop/mobile preview and confirmed `insertSection` command.

- [ ] **Step 1: Write failing preview/confirmation tests**

```ts
expect(customPreviewMarkup(proposal)).toContain('sandbox="allow-same-origin"');
expect(applyCanardoOperations(document, proposalWithoutConfirmation)).toThrow("confirmation");
expect(confirmCustomProposal(proposal).operations[0]).toMatchObject({ type: "insertSection" });
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/editor-canardo-custom-preview.test.ts`

Expected: FAIL because custom preview and confirmation do not exist.

- [ ] **Step 3: Implement review UX**

Show purpose, required capabilities, validation summary, desktop/mobile tabs,
and an iframe `srcdoc` with no scripts/network permissions. “Ajouter” sends the
proposal checksum back to the server; the server recompiles and compares it
before returning the insert command. “Annuler” mutates nothing.

- [ ] **Step 4: Run editor tests**

Run: `npx vitest run tests/editor-canardo-custom-preview.test.ts tests/editor-canardo.test.ts tests/canardo-apply.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/ui/custom-section-preview.ts src/editor/ui/canardo-review.ts src/editor/ui/canardo.ts src/canardo/apply.ts tests/editor-canardo-custom-preview.test.ts
git commit -m "feat: preview and confirm Canardo sections"
```

### Task 5: Workspace-private persistence, publication, and rollback

**Files:**
- Create: `src/custom-sections/repository.ts`
- Create: `src/custom-sections/service.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/memory.ts`
- Modify: `src/repos/postgres.ts`
- Modify: `src/shopify/compile-section.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/custom-section-persistence.test.ts`
- Test: `tests/custom-section-publication.test.ts`

**Interfaces:**
- Consumes: confirmed custom specs and workspace ID.
- Produces: `saveCustomSection()`, `listCustomSections()`, `restoreCustomSectionVersion()`, publication lookup by immutable version/checksum.

- [ ] **Step 1: Write failing isolation/version tests**

```ts
await service.save({ workspaceId: "a", spec });
expect(await service.list("b")).toEqual([]);
const v2 = await service.save({ workspaceId: "a", spec: changed });
expect(await service.restore({ workspaceId: "a", id: v2.id, version: 1 })).toMatchObject({ version: 1 });
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/custom-section-persistence.test.ts tests/custom-section-publication.test.ts`

Expected: FAIL because custom section storage is absent.

- [ ] **Step 3: Implement private versioned storage and compilation**

Store workspace ID, logical ID, integer version, spec JSON, checksum, validation
report, author user ID, and timestamps. Publication resolves the exact stored
version, recompiles it, validates schema/capabilities, and emits
`sections/weflo-custom-<handle>.liquid`. Rollback creates a new version copied
from the selected historical version; it never deletes audit history.

- [ ] **Step 4: Run final security and product gates**

Run: `npx vitest run tests/custom-section-*.test.ts tests/canardo-*.test.ts tests/shopify-*.test.ts && npm test && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/custom-sections src/repos src/shopify/compile-section.ts src/server/pages.ts tests/custom-section-persistence.test.ts tests/custom-section-publication.test.ts
git commit -m "feat: persist and publish private Canardo sections"
```
