# Weflo Visual Editor Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlapping static editor chrome with a functional canvas, sidebars, inspector, responsive controls, and direct manipulation.

**Architecture:** Keep the extracted HTML only as the application shell. Mount focused TypeScript controllers into stable containers, use the v2 command engine for all mutations, and render the page inside an isolated same-origin iframe with a small message bridge.

**Tech Stack:** TypeScript DOM APIs, CSS, Vitest/JSDOM string tests, in-app browser validation.

**Spec:** `docs/superpowers/specs/2026-09-02-visual-shopify-editor-design.md`

## Global Constraints

- Requires completion of `2026-09-02-editor-document-engine.md`.
- No panel may overlay the canvas at desktop widths.
- Interface typography and colors follow the Weflo dashboard; model styling stays inside the canvas.
- Every visible control must have a tested action, disabled state or explanatory tooltip.
- Preserve keyboard access and reduced-motion behavior.

---

### Task 1: Split the editor controller into stable regions

**Files:**
- Create: `src/editor/ui/shell.ts`
- Create: `src/editor/ui/store.ts`
- Create: `src/editor/ui/layout.css`
- Modify: `src/hydrate/editeur.ts`
- Test: `tests/editor-shell.test.ts`

**Interfaces:**
- Produces: `mountEditorShell(root, initialState)` and `EditorStore` with `getState`, `subscribe`, `dispatch`.

- [ ] **Step 1: Write a failing shell test expecting `data-editor-topbar`, `data-editor-left-rail`, `data-editor-sidebar`, `data-editor-canvas`, `data-editor-inspector`, and `data-editor-canardo`.**

- [ ] **Step 2: Run the test and confirm the stable regions are absent.**

- [ ] **Step 3: Implement the grid shell with fixed topbar, resizable non-overlapping side panels, collapsible persistence in `localStorage`, and a full-width mobile drawer layout.**

- [ ] **Step 4: Reduce `src/hydrate/editeur.ts` to loading data and mounting controllers; remove DOM ancestry hacks used to reposition extracted elements.**

- [ ] **Step 5: Run focused tests and commit with `refactor: mount stable visual editor shell`.**

### Task 2: Make the left rail and panels functional

**Files:**
- Create: `src/editor/ui/left-rail.ts`
- Create: `src/editor/ui/panels/structure.ts`
- Create: `src/editor/ui/panels/add-section.ts`
- Create: `src/editor/ui/panels/layers.ts`
- Create: `src/editor/ui/panels/pages.ts`
- Create: `src/editor/ui/panels/media.ts`
- Create: `src/editor/ui/panels/commerce.ts`
- Test: `tests/editor-left-rail.test.ts`

**Interfaces:**
- Consumes: `EditorStore`, section registry, assets, optional Shopify catalog.
- Produces: one active panel id and commands from panel actions.

- [ ] **Step 1: Write failing tests enumerating the six rail buttons and asserting each opens its named panel with `aria-pressed=true`.**

- [ ] **Step 2: Test structure selection, page switching, section insertion, visibility, locking, media replacement, and an explanatory disconnected Shopify state.**

- [ ] **Step 3: Run tests and confirm the current decorative buttons fail.**

- [ ] **Step 4: Implement all panels with semantic buttons, keyboard navigation, contextual empty states and command dispatch.**

- [ ] **Step 5: Run tests and commit with `feat: activate editor sidebar tools`.**

### Task 3: Implement the isolated canvas and responsive viewport

**Files:**
- Create: `src/editor/ui/canvas.ts`
- Create: `src/editor/ui/canvas-bridge.ts`
- Create: `src/editor/ui/canvas-runtime.ts`
- Test: `tests/editor-canvas.test.ts`

**Interfaces:**
- Produces: `mountCanvas`, message types `canvas:select`, `canvas:inline-edit`, `editor:render`, and `editor:mode`.

- [ ] **Step 1: Write failing tests for widths 1440/834/390, fit-to-window zoom, edit/preview interaction mode, and selected section synchronization.**

- [ ] **Step 2: Add a regression test for the screenshot symptom: desktop mode must use available canvas width and must not render a 390px document at the left edge.**

- [ ] **Step 3: Implement the iframe bridge with origin checks and a scoped runtime that intercepts clicks only in edit mode.**

- [ ] **Step 4: Implement centered viewport sizing, zoom controls, canvas padding and resize observation without horizontal overflow.**

- [ ] **Step 5: Run tests and commit with `feat: add responsive interactive editor canvas`.**

### Task 4: Add direct manipulation and insertion controls

**Files:**
- Create: `src/editor/ui/selection-overlay.ts`
- Create: `src/editor/ui/drag-sections.ts`
- Modify: `src/editor/ui/canvas-runtime.ts`
- Test: `tests/editor-direct-manipulation.test.ts`

**Interfaces:**
- Consumes: section ids emitted by canvas and v2 editor commands.
- Produces: select, inline update, reorder, duplicate, hide, lock and remove actions.

- [ ] **Step 1: Write failing tests for hover outline, selection toolbar, inline text commit, drag reorder, insertion between sections and locked-section rejection.**

- [ ] **Step 2: Run tests and confirm no current overlay controller exists.**

- [ ] **Step 3: Implement overlays outside merchant markup, pointer and keyboard reordering, contenteditable only for schema-approved text fields, and confirm/undo behavior for removal.**

- [ ] **Step 4: Verify merchant links and forms work in preview but never navigate in edit mode.**

- [ ] **Step 5: Run tests and commit with `feat: edit and reorder sections on canvas`.**

### Task 5: Generate the contextual inspector from schemas

**Files:**
- Create: `src/editor/ui/inspector.ts`
- Create: `src/editor/ui/controls.ts`
- Create: `src/editor/section-schema.ts`
- Test: `tests/editor-inspector.test.ts`

**Interfaces:**
- Produces: `SectionDefinition.settings` descriptors and controls for text, rich text, number, select, toggle, color, image, link, product, collection and code.

- [ ] **Step 1: Write failing tests proving a selected section renders Content, Style, Layout, Responsive and Animation tabs from its definition.**

- [ ] **Step 2: Test immediate command dispatch, responsive overrides, invalid values, reset-to-theme and no-selection empty state.**

- [ ] **Step 3: Implement schema-driven controls with labels, help text, validation and debounced text input.**

- [ ] **Step 4: Run tests and commit with `feat: add schema driven section inspector`.**

### Task 6: Wire autosave, history, conflict UI and browser acceptance

**Files:**
- Create: `src/editor/ui/autosave.ts`
- Modify: `src/editor/ui/shell.ts`
- Modify: `src/hydrate/editeur-state.ts`
- Test: `tests/editor-autosave.test.ts`
- Test: `tests/editor-browser-contract.test.ts`

**Interfaces:**
- Consumes: page version API and command history.
- Produces: save statuses and conflict actions `reloadServer` / `duplicateLocal`.

- [ ] **Step 1: Write failing fake-timer tests for local draft persistence, 600ms server debounce, retry, unload flush and HTTP 409 conflict.**

- [ ] **Step 2: Implement statuses `modified`, `saving`, `saved`, `error`, and `conflict`; connect topbar undo/redo and keyboard shortcuts.**

- [ ] **Step 3: Run focused and full tests plus `npm run build`.**

- [ ] **Step 4: In the in-app browser, verify desktop/tablet/mobile, every rail button, add/move/edit/delete/undo, panel collapse and reload persistence; capture screenshots at 1440 and 390 widths.**

- [ ] **Step 5: Commit with `feat: complete visual editor interaction shell`.**

