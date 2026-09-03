# AI Store Blueprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn product facts and merchant choices into a validated multi-page Store Blueprint through a resumable French step-by-step onboarding.

**Architecture:** Persist accepted answers separately from AI suggestions, request typed suggestions per step, and compile only a validated Blueprint into editor documents. Deterministic fallbacks keep the flow usable when OpenAI times out or returns malformed data.

**Tech Stack:** TypeScript, Hono, OpenAI structured JSON output, Vitest, existing memory/Postgres repositories and hydration layer.

**Spec:** `docs/superpowers/specs/2026-09-03-hybrid-shopify-section-engine-design.md`

## Global Constraints

- OpenAI receives the product truth sheet and accepted answers, not arbitrary scraped HTML.
- Every request has a bounded timeout and a deterministic French fallback.
- Suggestions and merchant-authored answers are stored separately.
- Refresh and Back preserve the last completed step.
- A Blueprint may reference only registered section types and variants.
- Preview fixture data is forbidden in generated customer documents.

---

### Task 1: Blueprint and wizard schemas

**Files:**
- Create: `src/onboarding/blueprint.ts`
- Create: `src/onboarding/wizard.ts`
- Modify: `src/onboarding/types.ts`
- Modify: `src/repos/types.ts`
- Test: `tests/store-blueprint.test.ts`
- Test: `tests/onboarding-wizard.test.ts`

**Interfaces:**
- Produces: `StoreBlueprint`, `BlueprintSection`, `WizardStepId`, `WizardAnswer`, `validateStoreBlueprint()`, `nextWizardStep()`.
- Consumes: `SectionCapability`, `DesignProfile`, `ProductTruthSheet`.

- [ ] **Step 1: Write failing schema tests**

```ts
expect(validateStoreBlueprint({ ...valid, sections: [{ type: "made-up" }] }).errors)
  .toContain("Section inconnue: made-up");
expect(nextWizardStep("audience", answers)).toBe("problem-outcome");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/store-blueprint.test.ts tests/onboarding-wizard.test.ts`

Expected: FAIL because schemas do not exist.

- [ ] **Step 3: Implement exact persisted types**

```ts
export type WizardStepId = "source" | "audience" | "problem-outcome" | "reasons-to-buy" | "offer" | "brand-personality" | "market" | "page-scope" | "review";
export type WizardAnswer = { stepId: WizardStepId; selectedSuggestionIds: string[]; customText: string; acceptedAt: string };
export type BlueprintSection = { pageId: string; sectionType: string; variantId: string; purpose: string; content: Record<string, SettingValue>; bindings: Record<string, string>; requiredCapabilities: SectionCapability[] };
export type StoreBlueprint = { version: 1; name: string; market: string; language: string; currency: string; designProfile: DesignProfile; pages: Array<{ id: string; kind: EditorPageKind; name: string; slug: string }>; sections: BlueprintSection[] };
```

Extend `OnboardingDraft` with `wizard: { currentStep, answers, suggestions }`
and `blueprint: StoreBlueprint | null`; migration supplies empty values.

- [ ] **Step 4: Run schema and repository tests**

Run: `npx vitest run tests/store-blueprint.test.ts tests/onboarding-wizard.test.ts tests/memory-store.test.ts tests/postgres-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/blueprint.ts src/onboarding/wizard.ts src/onboarding/types.ts src/repos/types.ts tests/store-blueprint.test.ts tests/onboarding-wizard.test.ts
git commit -m "feat: define store blueprint and wizard state"
```

### Task 2: Structured OpenAI suggestions with fallback

**Files:**
- Create: `src/onboarding/suggestions.ts`
- Modify: `src/onboarding/openai-analysis.ts`
- Modify: `src/onboarding/fallback-analysis.ts`
- Modify: `src/onboarding/analyser.ts`
- Test: `tests/onboarding-suggestions.test.ts`

**Interfaces:**
- Consumes: `ProductTruthSheet`, accepted `WizardAnswer[]`, `WizardStepId`.
- Produces: `suggestWizardStep(input): Promise<WizardSuggestion[]>`, each suggestion `{ id, title, explanation, tags }`.

- [ ] **Step 1: Write failing malformed-response and fallback tests**

```ts
aiClient.responses.create.mockResolvedValue({ output_text: "not-json" });
await expect(service.suggest(stepInput)).resolves.toHaveLength(4);
expect((await service.suggest(stepInput))[0].id).toMatch(/^fallback-/);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/onboarding-suggestions.test.ts`

Expected: FAIL on the missing suggestion service.

- [ ] **Step 3: Implement strict parsing and timeout behavior**

Request exactly four French suggestions with JSON Schema, stable generated IDs,
and no unsupported product claim. Reject extra keys, empty titles, more than 180
characters of explanation, or suggestions contradicting observed facts. Reuse
the existing `withDeadline` boundary; on any error call
`fallbackWizardSuggestions(stepId, truthSheet)`.

- [ ] **Step 4: Run AI and analysis tests**

Run: `npx vitest run tests/onboarding-suggestions.test.ts tests/onboarding-analysis.test.ts tests/product-truth.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/suggestions.ts src/onboarding/openai-analysis.ts src/onboarding/fallback-analysis.ts src/onboarding/analyser.ts tests/onboarding-suggestions.test.ts
git commit -m "feat: generate safe onboarding suggestions"
```

### Task 3: Resumable wizard API and French UI

**Files:**
- Modify: `src/server/onboarding.ts`
- Modify: `src/hydrate/creer.ts`
- Modify: `src/hydrate/creer.css`
- Modify: `src/create/flow-state.ts`
- Modify: `src/create/onboarding-sync.ts`
- Test: `tests/onboarding-api.test.ts`
- Test: `tests/create-flow-state.test.ts`
- Test: `tests/create-flow-browser.test.ts`

**Interfaces:**
- Consumes: `suggestWizardStep()`, repository draft patching.
- Produces: `POST /api/onboarding/:id/suggestions`, `PATCH /api/onboarding/:id/wizard`, resumable UI.

- [ ] **Step 1: Write failing route and state tests**

```ts
const response = await app.request(`/api/onboarding/${id}/suggestions`, { method: "POST", body: JSON.stringify({ stepId: "audience" }) });
expect(response.status).toBe(200);
expect((await response.json()).suggestions).toHaveLength(4);
expect(restoreCreationFlow(saved).wizard.currentStep).toBe("offer");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/onboarding-api.test.ts tests/create-flow-state.test.ts tests/create-flow-browser.test.ts`

Expected: FAIL on missing endpoints and wizard state.

- [ ] **Step 3: Build one-question-per-screen onboarding**

Render progress, 3–4 selectable suggestion cards, “Ajouter ma réponse”, editable
custom text, “Régénérer”, Back, Continue, and retryable French errors. Disable
Continue until a selection or non-empty custom answer exists. Abort stale fetches
with `AbortController`; persist after every accepted answer.

- [ ] **Step 4: Run API and browser-contract tests**

Run: `npx vitest run tests/onboarding-api.test.ts tests/create-flow-*.test.ts tests/create-hydrate.test.ts tests/french-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/onboarding.ts src/hydrate/creer.ts src/hydrate/creer.css src/create/flow-state.ts src/create/onboarding-sync.ts tests/onboarding-api.test.ts tests/create-flow-state.test.ts tests/create-flow-browser.test.ts
git commit -m "feat: add resumable AI onboarding wizard"
```

### Task 4: Blueprint generation, scoring, and compilation

**Files:**
- Create: `src/onboarding/blueprint-generator.ts`
- Create: `src/onboarding/blueprint-score.ts`
- Modify: `src/onboarding/compile-store.ts`
- Modify: `src/server/onboarding.ts`
- Test: `tests/blueprint-generator.test.ts`
- Test: `tests/onboarding-build.test.ts`

**Interfaces:**
- Consumes: validated answers, truth sheet, `listSectionPacks()`, `materializeSectionVariant()`.
- Produces: `generateBlueprint(input)`, `scoreBlueprint(candidate)`, `compileBlueprint(blueprint, product)`.

- [ ] **Step 1: Write failing validation and selection tests**

```ts
const blueprint = await generateBlueprint(input);
expect(validateStoreBlueprint(blueprint).ok).toBe(true);
expect(scoreBlueprint(blueprint).hardFailures).toEqual([]);
expect(blueprint.sections.every((item) => registeredVariant(item.sectionType, item.variantId))).toBe(true);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/blueprint-generator.test.ts tests/onboarding-build.test.ts`

Expected: FAIL because Blueprint generation is missing.

- [ ] **Step 3: Generate three candidates and choose deterministically**

Score truth coverage, page-format coverage, section-order coherence, design-profile
compatibility, capability availability, and repetition. Reject hallucinated facts
and unknown variants. Compile the best candidate to pages with IDs based on
`pageId-sectionType-index`; record missing capabilities rather than faking them.

- [ ] **Step 4: Run generation and phase gates**

Run: `npx vitest run tests/blueprint-generator.test.ts tests/onboarding-build.test.ts tests/store-recipe.test.ts tests/template-recipes.test.ts && npm test && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/blueprint-generator.ts src/onboarding/blueprint-score.ts src/onboarding/compile-store.ts src/server/onboarding.ts tests/blueprint-generator.test.ts tests/onboarding-build.test.ts
git commit -m "feat: compile validated AI store blueprints"
```
