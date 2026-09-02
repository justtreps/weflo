# Anonymous Import Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make anonymous onboarding complete reliably from either a public product URL or an uploaded product image.

**Architecture:** Persist anonymous drafts in the existing `pages` table under an invisible reserved workspace because the production database role cannot create `onboarding_drafts`. Bound every external operation, return JSON errors, and feed both URL and image inputs into the existing onboarding draft contract.

**Tech Stack:** TypeScript, Hono, PostgreSQL, OpenAI, browser APIs, Vitest, Vercel

**Spec:** `docs/superpowers/specs/2026-09-02-anonymous-import-reliability-design.md`

## Global Constraints

- Keep the onboarding public until the final claim action.
- Accept only public HTTPS URLs and PNG, JPEG, or WebP images.
- Keep image payloads below 450 Ko after browser optimisation.
- Preserve hashed claim-token authorization.
- Do not expose the reserved onboarding workspace in user dashboards.

---

### Task 1: Bounded import requests

**Files:**
- Modify: `src/import/product-extractor.ts`
- Create: `src/hydrate/onboarding-request.ts`
- Test: `tests/product-import.test.ts`
- Test: `tests/onboarding-request.test.ts`

**Interfaces:**
- Produces: `createNativeProductFetchPort({ fetchImpl?, timeoutMs?, maxRedirects? })`
- Produces: `fetchWithDeadline(input, init, timeoutMs?, fetchImpl?)`

- [x] Write tests proving redirect loops stop and stalled browser requests reject.
- [x] Run `npx vitest run tests/product-import.test.ts tests/onboarding-request.test.ts` and confirm failure.
- [x] Implement an overall abort deadline, five-redirect ceiling, and French timeout errors.
- [x] Run the focused tests and confirm they pass.

### Task 2: PostgreSQL draft persistence without schema creation

**Files:**
- Modify: `src/repos/postgres.ts`
- Test: `tests/postgres-store.test.ts`

**Interfaces:**
- Consumes: existing `Store` onboarding methods.
- Produces: the same methods backed by reserved workspace `ws_weflo_onboarding` and ordinary `pages` rows.

- [x] Extend the PostgreSQL integration test to create, read, update, and claim an onboarding draft.
- [x] Run `npx vitest run tests/postgres-store.test.ts` and confirm it fails against the missing table behavior.
- [x] Add `ensureOnboardingWorkspace()` using `insert ... on conflict do nothing`.
- [x] Store draft payloads directly in `pages.document` and restrict reads to the reserved workspace.
- [x] Run the integration test and confirm it passes without creating `onboarding_drafts`.

### Task 3: URL and image onboarding endpoints

**Files:**
- Modify: `src/onboarding/analyser.ts`
- Modify: `src/onboarding/openai-analysis.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/onboarding.ts`
- Test: `tests/onboarding-api.test.ts`

**Interfaces:**
- Produces: optional `OnboardingAiPort.analyseImage({ imageDataUrl, fileName, language })`.
- Produces: `POST /api/onboarding/import-image`.

- [x] Write tests for server deadline and a successful image-created draft.
- [x] Run the tests and confirm timeout and 404 failures.
- [x] Add server deadlines with deterministic fallback analysis.
- [x] Validate image MIME and encoded size, call OpenAI Vision when available, and return JSON errors for every failure.
- [x] Run the API tests and TypeScript.

### Task 4: Image picker and production verification

**Files:**
- Modify: `src/hydrate/start.ts`
- Modify: `src/hydrate/start-brands.css`

**Interfaces:**
- Consumes: `fetchWithDeadline` and `POST /api/onboarding/import-image`.
- Produces: a visible file picker that advances to the language step.

- [x] Render the image input below the URL field.
- [x] Validate files up to 12 Mo and compress the encoded result below 450 Ko.
- [x] Parse non-JSON failures safely and always restore the idle UI in `finally`.
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- [x] Perform real local URL-error and image-success requests.
- [x] Commit, push `main`, deploy with `npx vercel --prod --yes`, and repeat both checks on production.
