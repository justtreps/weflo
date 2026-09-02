# Canardo and Vibecode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Canardo safely create and modify standard or custom-code sections through reversible editor commands.

**Architecture:** The LLM returns a validated operation envelope rather than replacing the whole document. A prompt context builder limits input to relevant document data, an operation validator applies the same editor commands as the UI, and the client previews consequential changes before dispatch.

**Tech Stack:** TypeScript, OpenAI Responses API adapter already present, JSON schema, Vitest, editor command engine.

**Spec:** `docs/superpowers/specs/2026-09-02-visual-shopify-editor-design.md`

## Global Constraints

- Requires the document engine, editor shell and section registry plans.
- Canardo never receives Shopify tokens or authentication cookies.
- Invalid output never mutates or saves the document.
- Every accepted generation is undoable as one history group.
- Referral, billing and credit behavior remains enforced server-side.

---

### Task 1: Define the Canardo operation protocol

**Files:**
- Create: `src/canardo/protocol.ts`
- Create: `src/canardo/validate.ts`
- Modify: `src/types.ts`
- Test: `tests/canardo-protocol.test.ts`

**Interfaces:**
- Produces: `CanardoRequestContext`, `CanardoResponse`, `validateCanardoResponse(value, document, registry)`.

- [ ] **Step 1: Write failing tests for accepted command arrays and rejection of unknown sections, missing targets, duplicate ids, unsafe code, excessive operation count and unexpected properties.**
- [ ] **Step 2: Run tests and confirm no protocol exists.**
- [ ] **Step 3: Implement a strict discriminated schema with `message`, `summary`, and at most 30 serializable editor commands.**
- [ ] **Step 4: Run tests and commit with `feat: define validated Canardo operation protocol`.**

### Task 2: Build focused AI context and prompts

**Files:**
- Create: `src/canardo/context.ts`
- Create: `src/canardo/prompt.ts`
- Modify: `src/lib/canardo.ts`
- Test: `tests/canardo-context.test.ts`

**Interfaces:**
- Produces: `buildCanardoContext(document, selection, registry, shopifySummary)` and `CANARDO_SYSTEM_PROMPT`.

- [ ] **Step 1: Write failing tests proving the context contains selected section, brand tokens and allowed definitions but excludes secrets and unrelated product payloads.**
- [ ] **Step 2: Implement token-bounded summaries and explicit rules for content-only, style-only, section creation and vibecode requests.**
- [ ] **Step 3: Update the LLM adapter to request the strict response schema instead of a full `PageDocument`.**
- [ ] **Step 4: Run tests and commit with `feat: focus Canardo on editor operations`.**

### Task 3: Validate and apply generated commands atomically

**Files:**
- Create: `src/canardo/apply.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/canardo-apply.test.ts`
- Modify: `tests/canardo.test.ts`

**Interfaces:**
- Produces: `applyCanardoOperations(document, response)` returning `{ document, inverseCommands, summary }`.

- [ ] **Step 1: Write failing tests for atomic success and full rollback when command 2 of 3 is invalid.**
- [ ] **Step 2: Test locked sections, unknown Shopify ids, unsafe custom code and credit deduction only after valid generation.**
- [ ] **Step 3: Implement validation-first application through `applyCommand`; persist one version update and return commands plus resulting document.**
- [ ] **Step 4: Run API and Canardo tests; commit with `feat: apply Canardo edits atomically`.**

### Task 4: Add preview, confirmation and one-step undo in the editor

**Files:**
- Create: `src/editor/ui/canardo.ts`
- Create: `src/editor/ui/canardo-review.ts`
- Modify: `src/editor/ui/shell.ts`
- Test: `tests/editor-canardo.test.ts`

**Interfaces:**
- Consumes: Canardo response commands.
- Produces: conversation entries and `accept`, `reject`, `undoGeneration` actions.

- [ ] **Step 1: Write failing tests for optimistic user message, busy state, summary review, accept, reject, error retention and one-step undo.**
- [ ] **Step 2: Implement immediate application for harmless copy changes and explicit confirmation for deletion, code, product-binding and page-wide changes.**
- [ ] **Step 3: Show per-operation targets and keep the original prompt editable after failure.**
- [ ] **Step 4: Run tests and commit with `feat: review and undo Canardo edits`.**

### Task 5: Complete vibecode generation and safety acceptance

**Files:**
- Modify: `src/editor/ui/canardo.ts`
- Modify: `src/sections/custom-code.ts`
- Test: `tests/canardo-vibecode.test.ts`

**Interfaces:**
- Produces custom sections using the same policy as manual code editing.

- [ ] **Step 1: Write failing tests for prompts creating an accordion, comparison calculator and interactive quiz as isolated custom sections.**
- [ ] **Step 2: Add adversarial fixtures requesting cookie access, remote scripts, redirects and Shopify secrets; assert rejection.**
- [ ] **Step 3: Implement generation repair limited to one retry using returned validation errors.**
- [ ] **Step 4: Run Canardo, security and full suites; run `npm run build`; verify one standard and one vibecode prompt in the browser.**
- [ ] **Step 5: Commit with `feat: complete safe Canardo vibecode workflow`.**

