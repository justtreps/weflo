# Weflo Editor Document Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static preview documents with a versioned, reversible section-and-block document engine.

**Architecture:** Introduce a v2 document schema and pure command reducer while retaining a migration adapter for current `PageDocument` records. Rendering consumes only the normalized v2 schema; editor state uses the same commands for user actions, undo/redo, persistence, and future Canardo operations.

**Tech Stack:** TypeScript, Vitest, Hono APIs, existing PostgreSQL/memory repositories, server-rendered HTML.

**Spec:** `docs/superpowers/specs/2026-09-02-visual-shopify-editor-design.md`

## Global Constraints

- Work on `main` and preserve unrelated working-tree changes.
- Follow red-green-refactor TDD for every behavior.
- Existing v1 pages must open without data loss.
- `referencePreviews` may remain as gallery metadata but must never render as the editable page.
- Every mutating command must be reversible and serializable.

---

### Task 1: Define the v2 document contract and validation

**Files:**
- Create: `src/editor/document.ts`
- Create: `src/editor/schema.ts`
- Test: `tests/editor-document.test.ts`

**Interfaces:**
- Produces: `EditorDocument`, `EditorPage`, `EditorSection`, `EditorBlock`, `validateEditorDocument(value)`.

- [ ] **Step 1: Write failing schema tests**

```ts
it("accepts a complete v2 document", () => {
  expect(validateEditorDocument(fixtureDocument()).ok).toBe(true);
});

it("rejects duplicate section ids and unsafe custom code", () => {
  expect(validateEditorDocument(duplicateIds()).ok).toBe(false);
  expect(validateEditorDocument(externalScriptDocument()).ok).toBe(false);
});
```

- [ ] **Step 2: Run `npx vitest run tests/editor-document.test.ts` and confirm failure because the module does not exist.**

- [ ] **Step 3: Implement exact types and a validation result `{ ok: true; value } | { ok: false; errors: string[] }`; validate version, page ids, section ids, supported setting values, blocks, responsive fields and custom-code restrictions.**

- [ ] **Step 4: Run the focused test and confirm all cases pass.**

- [ ] **Step 5: Commit `src/editor/document.ts`, `src/editor/schema.ts`, and `tests/editor-document.test.ts` with `feat: add versioned editor document schema`.**

### Task 2: Migrate legacy documents deterministically

**Files:**
- Create: `src/editor/migrate.ts`
- Modify: `src/lib/catalog.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/editor-migrate.test.ts`

**Interfaces:**
- Consumes: `EditorDocument` and the current `PageDocument`.
- Produces: `migrateDocument(input): EditorDocument` and `documentForModel(modelId, pageName): EditorDocument`.

- [ ] **Step 1: Write failing tests covering a current structured page, a blank page, and all 18 `referencePreviews` model ids.**

```ts
for (const model of PAGE_MODELS) {
  const migrated = migrateDocument(documentFromModel(model.id, model.name));
  expect(migrated.version).toBe(2);
  expect(migrated.pages[0].sections.length).toBeGreaterThan(2);
  expect(JSON.stringify(migrated)).not.toContain("referencePreviews");
}
```

- [ ] **Step 2: Run `npx vitest run tests/editor-migrate.test.ts` and confirm the migration assertions fail.**

- [ ] **Step 3: Implement stable ids, theme-token conversion, section/block normalization, and a model-id lookup that builds structured content instead of embedding a screenshot.**

- [ ] **Step 4: Normalize documents on API read without rewriting storage; persist v2 on the next explicit save.**

- [ ] **Step 5: Run migration, pages API, catalog, and render tests.**

- [ ] **Step 6: Commit with `feat: migrate pages to editor document v2`.**

### Task 3: Add pure editor commands and inverse operations

**Files:**
- Create: `src/editor/commands.ts`
- Create: `src/editor/history.ts`
- Test: `tests/editor-commands.test.ts`
- Test: `tests/editor-history.test.ts`

**Interfaces:**
- Produces: `applyCommand(document, command)`, `invertCommand(document, command)`, `createHistory(initial)`, `dispatch(history, command)`, `undo(history)`, `redo(history)`.

- [ ] **Step 1: Write failing parameterized tests for `insertSection`, `moveSection`, `updateSetting`, `updateStyle`, `duplicateSection`, `removeSection`, `toggleHidden`, `toggleLocked`, `insertBlock`, `moveBlock`, and `removeBlock`.**

- [ ] **Step 2: For every command, assert `applyCommand(after, invertCommand(before, command))` deep-equals `before`.**

- [ ] **Step 3: Run both focused tests and confirm module-not-found failures.**

- [ ] **Step 4: Implement a discriminated `EditorCommand` union and immutable reducers; reject missing targets, locked targets, invalid indices and duplicate ids with typed errors.**

- [ ] **Step 5: Implement bounded undo/redo stacks of 100 command groups and clear redo after a new command.**

- [ ] **Step 6: Run focused tests and commit with `feat: add reversible editor command engine`.**

### Task 4: Build the shared responsive renderer

**Files:**
- Create: `src/editor/render/registry.ts`
- Create: `src/editor/render/render-document.ts`
- Create: `src/editor/render/render-section.ts`
- Modify: `src/lib/render-document.ts`
- Modify: `src/lib/render-page.ts`
- Test: `tests/editor-renderer.test.ts`

**Interfaces:**
- Consumes: validated `EditorDocument`.
- Produces: `renderEditorDocument(document, { mode, breakpoint, selectedId? }): string`.

- [ ] **Step 1: Write failing tests proving selected markup appears only in edit mode, hidden sections disappear in preview mode, and responsive settings create scoped CSS.**

- [ ] **Step 2: Add a regression test that a model render does not contain `wf-reference` or a full-page screenshot.**

- [ ] **Step 3: Run the test and confirm current model rendering fails the regression.**

- [ ] **Step 4: Implement an escaped renderer registry with one renderer per existing section type and data attributes `data-wf-section-id` and `data-wf-block-id`.**

- [ ] **Step 5: Route hosted preview and editor preview through the shared renderer; remove the screenshot-only branch.**

- [ ] **Step 6: Run `npm test` and `npm run build`; commit with `feat: render editable documents responsively`.**

### Task 5: Add optimistic persistence and version conflicts

**Files:**
- Modify: `src/types.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/memory.ts`
- Modify: `src/repos/postgres.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/page-versioning.test.ts`

**Interfaces:**
- Produces: page `documentVersion: number` and conditional update input `{ expectedVersion, document }`.

- [ ] **Step 1: Write failing repository and API tests: matching version saves and increments; stale version returns HTTP 409 without overwriting.**

- [ ] **Step 2: Run the tests and confirm stale writes currently succeed.**

- [ ] **Step 3: Add the version column through idempotent repository initialization and implement compare-and-swap updates in both stores.**

- [ ] **Step 4: Return `{ error: "version_conflict", serverPage }` on conflict.**

- [ ] **Step 5: Run repository tests, full tests and build; commit with `feat: protect editor saves with document versions`.**

