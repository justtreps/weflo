# Shopify Theme Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the same editor document either as a complete Weflo Online Store 2.0 theme or as isolated sections/templates inside a compatible existing theme.

**Architecture:** A typed adapter interface detects theme structure, maps design tokens, compiles namespaced files, and validates the result. Weflo-native and Dawn ship first; Minimog stays optional and licensed inputs are never copied into Weflo artifacts.

**Tech Stack:** TypeScript, Liquid, Shopify JSON templates, ZIP packaging, Shopify Admin API, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-hybrid-shopify-section-engine-design.md`

## Global Constraints

- Existing-theme publication duplicates the active theme by default.
- Unrelated theme files are preserved.
- Generated section and asset names are namespaced `weflo-`.
- Global `index.json` or `product.json` replacement requires explicit confirmation.
- A complete ZIP contains Shopify-standard layout, templates, sections, snippets, assets, config, and locales.
- Minimog is analyzed only from legally usable licensed files; Weflo does not redistribute its source.

---

### Task 1: Theme adapter interface and detection

**Files:**
- Create: `src/shopify/adapters/types.ts`
- Create: `src/shopify/adapters/detect.ts`
- Modify: `src/shopify/themes.ts`
- Test: `tests/shopify-theme-adapter.test.ts`

**Interfaces:**
- Produces: `ThemeAdapter`, `ThemeFile`, `detectThemeAdapter(files)`, `ThemeCapabilityReport`.
- Consumes: `EditorDocument`, `DesignProfile`, compiled section packs.

- [ ] **Step 1: Write failing detection tests**

```ts
expect(detectThemeAdapter(dawnFiles).adapterId).toBe("dawn");
expect(detectThemeAdapter(unknownFiles)).toEqual({ adapterId: "weflo-native", confidence: "fallback" });
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-theme-adapter.test.ts`

Expected: FAIL because adapter detection is missing.

- [ ] **Step 3: Implement the stable adapter contract**

```ts
export type ThemeAdapter = {
  id: string;
  detect(files: ThemeFile[]): AdapterConfidence;
  capabilities(files: ThemeFile[]): ThemeCapabilityReport;
  mapTokens(profile: DesignProfile): ThemePatch[];
  compileSection(section: EditorSection): ThemeFile[];
  compileTemplate(page: EditorPage): ThemeFile;
  requiredAssets(document: EditorDocument): ThemeFile[];
  validate(output: ThemeFile[]): ThemeValidationResult;
};
```

Select the highest non-zero confidence; resolve ties explicitly, never by import order.

- [ ] **Step 4: Run theme tests**

Run: `npx vitest run tests/shopify-theme-adapter.test.ts tests/theme-files.test.ts tests/shopify-existing-theme.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/adapters src/shopify/themes.ts tests/shopify-theme-adapter.test.ts
git commit -m "feat: add Shopify theme adapter contract"
```

### Task 2: Complete Weflo-native theme compiler

**Files:**
- Create: `src/shopify/adapters/weflo-native.ts`
- Create: `src/shopify/theme-shell.ts`
- Create: `src/shopify/theme-zip.ts`
- Modify: `src/shopify/compiler.ts`
- Modify: `src/shopify/validate-theme-output.ts`
- Test: `tests/shopify-native-theme.test.ts`

**Interfaces:**
- Consumes: `EditorDocument`, compiled Liquid sections/assets.
- Produces: `compileWefloTheme(document): CompiledThemeFile[]`, `createThemeZip(files): Uint8Array`.

- [ ] **Step 1: Write failing complete-theme inventory tests**

```ts
const keys = compileWefloTheme(document).map((file) => file.key);
expect(keys).toEqual(expect.arrayContaining(["layout/theme.liquid", "config/settings_schema.json", "config/settings_data.json", "locales/fr.default.json", "templates/index.json"]));
expect(validateThemeOutput(files).ok).toBe(true);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-native-theme.test.ts`

Expected: FAIL because the compiler currently emits only sections, one asset, and a template.

- [ ] **Step 3: Build a complete minimal OS 2.0 theme**

Create a standards-based `theme.liquid` with `content_for_header`,
`content_for_layout`, CSS/JS assets, locale strings, theme settings, header and
footer groups, plus page/product/collection/home templates from Blueprint pages.
ZIP uses forward-slash paths, deterministic order, and no outer parent folder.

- [ ] **Step 4: Run validation and ZIP tests**

Run: `npx vitest run tests/shopify-native-theme.test.ts tests/shopify-theme-output.test.ts tests/shopify-compiler.test.ts`

Expected: PASS; ZIP entries exactly match compiled keys.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/adapters/weflo-native.ts src/shopify/theme-shell.ts src/shopify/theme-zip.ts src/shopify/compiler.ts src/shopify/validate-theme-output.ts tests/shopify-native-theme.test.ts
git commit -m "feat: compile complete Weflo Shopify themes"
```

### Task 3: Dawn existing-theme adapter

**Files:**
- Create: `src/shopify/adapters/dawn.ts`
- Create: `tests/fixtures/themes/dawn-manifest.json`
- Modify: `src/shopify/publication-plan.ts`
- Test: `tests/shopify-dawn-adapter.test.ts`

**Interfaces:**
- Consumes: remote Dawn theme file inventory and `DesignProfile`.
- Produces: isolated Weflo template/sections/assets plus token patches that use Dawn variables when safe.

- [ ] **Step 1: Write failing preservation and mapping tests**

```ts
const output = dawnAdapter.compileTemplate(page);
expect(output.key).toMatch(/^templates\/product\.weflo-/);
expect(createPublicationPlan(input).files.some((file) => file.key === "sections/main-product.liquid")).toBe(false);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-dawn-adapter.test.ts`

Expected: FAIL because Dawn is not detected or mapped.

- [ ] **Step 3: Implement additive Dawn integration**

Detect Dawn from its settings/schema/file signature. Emit only namespaced
sections, snippets, assets, and alternate templates. Map typography and color
scheme tokens to Dawn-compatible CSS variables without editing core Dawn
sections. Report unsupported capabilities in the adapter result.

- [ ] **Step 4: Run existing-theme tests**

Run: `npx vitest run tests/shopify-dawn-adapter.test.ts tests/shopify-existing-theme.test.ts tests/shopify-publication-plan.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/adapters/dawn.ts tests/fixtures/themes/dawn-manifest.json src/shopify/publication-plan.ts tests/shopify-dawn-adapter.test.ts
git commit -m "feat: add additive Dawn theme adapter"
```

### Task 4: Publication, rollback, and development-store smoke path

**Files:**
- Modify: `src/shopify/publisher.ts`
- Modify: `src/shopify/publication-record.ts`
- Modify: `src/server/shopify.ts`
- Modify: `src/editor/ui/publish-dialog.ts`
- Create: `tests/shopify-development-smoke.test.ts`
- Test: `tests/shopify-publisher.test.ts`

**Interfaces:**
- Consumes: `ThemeAdapter`, `ShopifyPublicationPlan`, capability report.
- Produces: dry-run manifest, explicit confirmation token, publication record, `rollbackPublication(recordId)`.

- [ ] **Step 1: Write failing dry-run and rollback tests**

```ts
const dryRun = await publisher.plan(request);
expect(dryRun.files.every((file) => ["create", "update", "unchanged"].includes(file.action))).toBe(true);
await publisher.rollback(record.id);
expect(api.upserts).toContainEqual(expect.objectContaining({ key: changedFile.key, value: changedFile.backup }));
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-publisher.test.ts tests/shopify-development-smoke.test.ts`

Expected: FAIL on adapter-aware dry run and rollback.

- [ ] **Step 3: Implement safe publication**

Default to `duplicate_active`; show file actions and blockers before confirmation.
Persist checksums and backups for updated files. Create preview URL after upload.
The smoke test is skipped unless `SHOPIFY_DEV_STORE` and access credentials are
present; when present it uploads to an unpublished theme, fetches the preview,
asserts 200 and Weflo section markers, then deletes only that test theme.

- [ ] **Step 4: Run publication and phase gates**

Run: `npx vitest run tests/shopify-publisher.test.ts tests/shopify-development-smoke.test.ts tests/shopify-publish.test.ts && npm test && npm run build`

Expected: PASS; smoke test reports skipped only when development credentials are absent.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/publisher.ts src/shopify/publication-record.ts src/server/shopify.ts src/editor/ui/publish-dialog.ts tests/shopify-development-smoke.test.ts tests/shopify-publisher.test.ts
git commit -m "feat: publish and roll back Shopify themes safely"
```

### Task 5: Optional licensed Minimog adapter boundary

**Files:**
- Create: `src/shopify/adapters/minimog.ts`
- Create: `scripts/inspect-licensed-theme.mjs`
- Test: `tests/shopify-minimog-adapter.test.ts`

**Interfaces:**
- Consumes: a user-supplied ZIP path at inspection time; never bundles source files.
- Produces: structural fingerprint and additive adapter patches.

- [ ] **Step 1: Write failing isolation test**

```ts
expect(minimogAdapter.compileSection(section).every((file) => file.key.includes("weflo-"))).toBe(true);
expect(JSON.stringify(output)).not.toContain("Minimog copyright source marker");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/shopify-minimog-adapter.test.ts`

Expected: FAIL because no optional adapter exists.

- [ ] **Step 3: Implement structural inspection only**

The script reports directory names, schema capabilities, asset conventions, and
supported blocks from the licensed archive. It stores no Liquid/CSS source in
the repository. The adapter adds Weflo namespaced files and maps only detected
public schema/settings contracts. Unknown versions fall back to isolated mode.

- [ ] **Step 4: Run isolation tests**

Run: `npx vitest run tests/shopify-minimog-adapter.test.ts tests/shopify-theme-adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shopify/adapters/minimog.ts scripts/inspect-licensed-theme.mjs tests/shopify-minimog-adapter.test.ts
git commit -m "feat: add isolated licensed theme adapter"
```
