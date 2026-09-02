# Shopify Theme Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Weflo pages into a new theme, a duplicated active theme, or the live Shopify theme with backups and rollback.

**Architecture:** Separate document compilation from Shopify transport. The compiler creates namespaced Liquid, JSON, CSS, JavaScript and asset outputs; a publication planner compares those outputs to the selected theme, creates a reversible file plan, and the Shopify adapter executes it transactionally where the API permits.

**Tech Stack:** TypeScript, Shopify Admin API, Liquid/JSON theme files, Vitest with mocked Admin API.

**Spec:** `docs/superpowers/specs/2026-09-02-visual-shopify-editor-design.md`

## Global Constraints

- Requires all four earlier plans.
- Publishing remains Pro-only in both client and server.
- Direct live-theme publication requires explicit confirmation for that operation.
- Existing global home/product templates are never overwritten unless explicitly selected.
- Rollback data is stored before the first Shopify write.
- API version must be centralized and upgraded from the current historical value to a supported configured version before live release.

---

### Task 1: Compile an editor document into Shopify files

**Files:**
- Create: `src/shopify/compiler.ts`
- Create: `src/shopify/compile-section.ts`
- Create: `src/shopify/names.ts`
- Modify: `src/lib/theme-files.ts`
- Test: `tests/shopify-compiler.test.ts`

**Interfaces:**
- Produces: `compileShopifyPage(document, target): CompiledThemeFile[]`, where each file contains `key`, `value`, `checksum`, and `operation`.

- [ ] **Step 1: Write failing tests for deterministic filenames, one template per Weflo page, ordered sections, schema-valid Liquid, scoped CSS/JS and referenced assets.**
- [ ] **Step 2: Add a negative test proving normal page publication does not replace `templates/index.json` or `templates/product.json`.**
- [ ] **Step 3: Implement namespaced files such as `sections/weflo-<type>.liquid`, `templates/page.weflo-<slug>.json`, and `assets/weflo-<page-id>.css`.**
- [ ] **Step 4: Validate compiled JSON and Liquid delimiters before returning files.**
- [ ] **Step 5: Run tests and commit with `feat: compile editor pages for Shopify themes`.**

### Task 2: Add Shopify theme discovery and publication planning

**Files:**
- Create: `src/shopify/themes.ts`
- Create: `src/shopify/publication-plan.ts`
- Modify: `src/types.ts`
- Test: `tests/shopify-publication-plan.test.ts`

**Interfaces:**
- Produces: `listThemes(connection)`, `createPublicationPlan({ strategy, themeId, compiledFiles, remoteFiles })`.

- [ ] **Step 1: Write failing tests for strategies `active`, `duplicate_active`, and `new_weflo`, including missing active theme and invalid selected theme.**
- [ ] **Step 2: Test that plans list creates, updates, unchanged files, backups and prohibited global replacements.**
- [ ] **Step 3: Implement theme discovery, role identification and deterministic plan creation without performing writes.**
- [ ] **Step 4: Run tests and commit with `feat: plan safe Shopify theme publication`.**

### Task 3: Persist publication snapshots and reports

**Files:**
- Modify: `src/types.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/memory.ts`
- Modify: `src/repos/postgres.ts`
- Create: `src/shopify/publication-record.ts`
- Test: `tests/shopify-publication-record.test.ts`

**Interfaces:**
- Produces: `PublicationRecord` containing strategy, theme ids, document version, previous file contents, file results, status and preview URL.

- [ ] **Step 1: Write failing store tests for create, progress update, completion, failure and recovery lookup.**
- [ ] **Step 2: Implement idempotent persistence with encrypted or protected backup contents and 30-day retention metadata.**
- [ ] **Step 3: Verify no access token or session secret enters the record.**
- [ ] **Step 4: Run repository tests and commit with `feat: store Shopify publication snapshots`.**

### Task 4: Execute and roll back the three publication strategies

**Files:**
- Create: `src/shopify/publisher.ts`
- Modify: `src/lib/shopify.ts`
- Modify: `src/server/prod.ts`
- Test: `tests/shopify-publisher.test.ts`
- Modify: `tests/shopify-publish.test.ts`

**Interfaces:**
- Produces: `publishToShopify(input): PublicationResult` and `rollbackPublication(record): RollbackResult`.

- [ ] **Step 1: Write failing mocked-API tests for new theme creation, active theme duplication, direct write, asset upload, file update and preview URL.**
- [ ] **Step 2: For direct writes, assert remote contents are recorded before mutation and restored in reverse order after any failed write.**
- [ ] **Step 3: Implement idempotency keys at the publication-record level and skip checksum-identical files.**
- [ ] **Step 4: Remove the current behavior that always creates a product and unpublished theme; create or bind commerce resources only when the document requires them.**
- [ ] **Step 5: Run Shopify tests and commit with `feat: publish and rollback Shopify theme changes`.**

### Task 5: Build the publication dialog and destination choice

**Files:**
- Create: `src/editor/ui/publish-dialog.ts`
- Modify: `src/editor/ui/shell.ts`
- Modify: `src/hydrate/publish-access.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/editor-publish-dialog.test.ts`
- Test: `tests/publish-strategies-api.test.ts`

**Interfaces:**
- Consumes: billing state, Shopify themes and publication plan.
- Produces: `POST /api/pages/:id/publish` body `{ destination, strategy, themeId?, replaceGlobalTemplate, expectedVersion }`.

- [ ] **Step 1: Write failing UI tests for free paywall, disconnected Shopify, hosted page, active theme, duplicated theme and new Weflo theme.**
- [ ] **Step 2: Write failing API tests for validation, Pro authorization, explicit live confirmation, plan preview and version conflict.**
- [ ] **Step 3: Implement a two-step dialog: choose destination, then review affected files and confirm. Require typed confirmation only for direct live-theme global replacement.**
- [ ] **Step 4: Show progress per stage and final links to hosted preview, Shopify theme preview or live page.**
- [ ] **Step 5: Run focused tests and commit with `feat: choose Shopify publication destination`.**

### Task 6: Integrate a Weflo page into an existing Shopify theme

**Files:**
- Create: `src/shopify/page-binding.ts`
- Modify: `src/shopify/compiler.ts`
- Modify: `src/shopify/publisher.ts`
- Test: `tests/shopify-existing-theme.test.ts`

**Interfaces:**
- Produces page/product template suffix assignment without changing unrelated resources.

- [ ] **Step 1: Write failing tests for adding a landing page, assigning a product-specific template, assigning a collection-specific template and leaving all other resources unchanged.**
- [ ] **Step 2: Implement resource lookup/creation and template-suffix assignment after theme files succeed.**
- [ ] **Step 3: Add rollback that restores the prior template suffix or removes only the resource created by Weflo.**
- [ ] **Step 4: Run tests and commit with `feat: integrate Weflo pages into existing themes`.**

### Task 7: End-to-end publication verification

**Files:**
- Create: `tests/shopify-publish-e2e.test.ts`
- Update: `tests/acceptance-checklist.md`

**Interfaces:**
- Verifies the complete compiler → plan → backup → publish → report → rollback flow.

- [ ] **Step 1: Run mocked end-to-end scenarios for all three strategies, one failure after partial writes, one stale document and one free account.**
- [ ] **Step 2: Run `npm test` and `npm run build`; require zero failures.**
- [ ] **Step 3: Against a Shopify development store, publish a normal page to a duplicated theme, preview it, verify product bindings and roll it back.**
- [ ] **Step 4: With explicit test-store authorization, publish to the active theme, verify file checksums and restore the saved snapshot.**
- [ ] **Step 5: Record exact API responses and screenshots in the acceptance checklist without storing credentials.**
- [ ] **Step 6: Commit with `test: verify Shopify publication strategies`.**

