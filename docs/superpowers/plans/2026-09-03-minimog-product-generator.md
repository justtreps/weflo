# Minimog Product Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer un produit importé en une page produit Minimog complète, éditable dans Weflo et exportable vers Shopify sans dépendance manquante.

**Architecture:** Minimog 6.0.0 est importé comme pack de thème privé et versionné. OpenAI produit un `StoreBlueprintV2` strict qui référence uniquement les sections et blocs autorisés par le pack ; un compilateur déterministe génère le document éditable Weflo et le template JSON Shopify. L’ancien moteur reste disponible en lecture pendant la migration, mais n’est plus utilisé pour les nouvelles pages produit Minimog.

**Tech Stack:** TypeScript 5.9, Hono, OpenAI Responses API avec Structured Outputs, Zod, PostgreSQL/Supabase, Liquid Shopify, FAL.ai, Vitest, Playwright, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-03-minimog-ai-store-generator-design.md`

## Global Constraints

- Minimog 6.0.0 est fourni par l’utilisateur et son utilisation est autorisée pour ce projet ; le pack reste privé et n’est jamais publié comme dépendance publique.
- Aucune suppression globale du dépôt ou des données de production.
- Authentification, espaces de travail, Whop, crédits, connexion Shopify, import produit, OpenAI, FAL.ai et PostgreSQL/Supabase restent opérationnels.
- L’IA ne produit jamais de HTML, CSS ou Liquid libre ; elle ne produit qu’un `StoreBlueprintV2` validé.
- Une section n’entre dans le catalogue que si son schéma, son aperçu, ses dépendances et son export passent les tests.
- Aucun placeholder non signalé dans une génération terminée.
- Une capacité Shopify dépendante d’une application n’est jamais présentée comme native.
- Les erreurs des routes API sont toujours sérialisées en JSON.
- Les anciens documents sont conservés ; une migration destructive ou silencieuse est interdite.

## File map

### Pack de thème

- Create: `scripts/import-minimog-pack.mjs` — importe l’archive autorisée et normalise le pack.
- Create: `src/theme-packs/types.ts` — contrats du manifeste, des schémas et des dépendances.
- Create: `src/theme-packs/minimog/manifest.ts` — liste blanche initiale et métadonnées Minimog.
- Create: `src/theme-packs/minimog/load.ts` — accès contrôlé aux fichiers du pack.
- Create: `src/theme-packs/dependencies.ts` — extraction et résolution de la fermeture de dépendances.
- Create: `src/theme-packs/schema.ts` — extraction des blocs `{% schema %}`.
- Generated/private: `theme-packs/minimog/6.0.0/**` — fichiers autorisés importés depuis le ZIP utilisateur.

### Blueprint et génération

- Create: `src/blueprint-v2/types.ts` — modèle TypeScript.
- Create: `src/blueprint-v2/schema.ts` — schéma Zod dérivé du manifeste.
- Create: `src/blueprint-v2/validate.ts` — validation métier.
- Create: `src/blueprint-v2/compile-editor.ts` — Blueprint vers `EditorDocument`.
- Create: `src/blueprint-v2/compile-shopify.ts` — Blueprint vers templates JSON.
- Create: `src/blueprint-v2/openai.ts` — génération structurée.
- Modify: `src/server/prod.ts` — injection du générateur V2.
- Modify: `src/server/onboarding.ts` — lancement et reprise du pipeline V2.

### Parcours, éditeur et export

- Create: `src/create/product-generation-state.ts` — machine d’états persistée.
- Modify: `src/hydrate/creer.ts` — nouveau parcours produit en quatre décisions.
- Create: `src/editor/theme-schema-controls.ts` — contrôles construits depuis le schéma Liquid.
- Modify: `src/editor/ui/left-rail.ts` — arbre sections/blocs Minimog.
- Modify: `src/editor/ui/inspector.ts` — contrôles natifs du pack.
- Modify: `src/editor/render/render-document.ts` — sélection du renderer selon `themePack`.
- Modify: `src/server/pages.ts` — édition, sauvegarde et migration V2.
- Modify: `src/shopify/compiler.ts` — export du pack et du template JSON.
- Modify: `src/server/shopify.ts` — thème non publié et publication.

---

### Task 1: Import privé et reproductible du pack Minimog

**Files:**
- Create: `scripts/import-minimog-pack.mjs`
- Create: `src/theme-packs/types.ts`
- Create: `src/theme-packs/minimog/manifest.ts`
- Modify: `.gitignore`
- Test: `tests/theme-pack-import.test.ts`

**Interfaces:**
- Consumes: archive `C:/TELECHARGEMENT/themeforest-v2FC6aOA-minimog-the-high-converting-shopify-theme.zip`.
- Produces: `importThemePack(input: { sourceZip: string; outputDir: string }): Promise<ThemePackImportResult>` and `MINIMOG_PACK`.

- [ ] **Step 1: Write the failing import contract test**

```ts
it("discovers the licensed Minimog theme and its required folders", async () => {
  const result = await inspectThemeArchive(fixtureArchive);
  expect(result.version).toBe("6.0.0");
  expect(result.folders).toEqual(expect.arrayContaining(["sections", "snippets", "assets", "templates", "layout", "config", "locales"]));
  expect(result.files).toContain("sections/main-product.liquid");
});
```

- [ ] **Step 2: Run the test and verify the archive reader is missing**

Run: `npx vitest run tests/theme-pack-import.test.ts`

Expected: FAIL because `inspectThemeArchive` is not defined.

- [ ] **Step 3: Implement the importer with explicit target validation**

```ts
export type ThemePackImportResult = { id: "minimog"; version: "6.0.0"; files: string[]; folders: string[] };

export async function inspectThemeArchive(sourceZip: string): Promise<ThemePackImportResult> {
  const files = await listNestedThemeEntries(sourceZip, "thememove_minimog/minimog-6.0.0.zip");
  assertRequiredThemeFolders(files);
  return { id: "minimog", version: "6.0.0", files, folders: requiredFolders };
}
```

The import command must reject output paths outside `theme-packs/minimog/6.0.0` and must never overwrite a different pack version.

- [ ] **Step 4: Run the focused test and import the authorized pack**

Run: `npx vitest run tests/theme-pack-import.test.ts && node scripts/import-minimog-pack.mjs --source "C:/TELECHARGEMENT/themeforest-v2FC6aOA-minimog-the-high-converting-shopify-theme.zip" --version 6.0.0`

Expected: PASS and a deterministic file inventory under `theme-packs/minimog/6.0.0`.

- [ ] **Step 5: Commit the importer and pack policy**

```bash
git add scripts/import-minimog-pack.mjs src/theme-packs tests/theme-pack-import.test.ts .gitignore
git commit -m "feat: add licensed Minimog theme pack importer"
```

### Task 2: Extract Shopify schemas and dependency closures

**Files:**
- Create: `src/theme-packs/schema.ts`
- Create: `src/theme-packs/dependencies.ts`
- Create: `src/theme-packs/minimog/load.ts`
- Test: `tests/theme-pack-schema.test.ts`
- Test: `tests/theme-pack-dependencies.test.ts`

**Interfaces:**
- Consumes: `ThemePackFileReader.read(path): string`.
- Produces: `extractSectionSchema(source): ShopifySectionSchema` and `resolveSectionDependencies(entry, reader): ThemeDependencyClosure`.

- [ ] **Step 1: Write failing schema and dependency tests**

```ts
it("extracts settings and blocks from main-product", () => {
  const schema = extractSectionSchema(reader.read("sections/main-product.liquid"));
  expect(schema.name).toBeTruthy();
  expect(schema.blocks.length).toBeGreaterThan(3);
});

it("includes transitive assets and snippets for product bundles", () => {
  const closure = resolveSectionDependencies("sections/product-bundles.liquid", reader);
  expect(closure.files).toEqual(expect.arrayContaining([
    "assets/product-bundles.js",
    "assets/product-bundles.css",
    "snippets/product-card-bundle.liquid",
  ]));
});
```

- [ ] **Step 2: Run both tests and verify they fail on missing implementations**

Run: `npx vitest run tests/theme-pack-schema.test.ts tests/theme-pack-dependencies.test.ts`

Expected: FAIL with unresolved imports.

- [ ] **Step 3: Implement safe schema extraction and recursive dependency parsing**

```ts
export function extractSectionSchema(source: string): ShopifySectionSchema {
  const match = source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  if (!match) throw new ThemePackError("missing_schema");
  return ShopifySectionSchemaModel.parse(JSON.parse(match[1]));
}
```

Resolve `render`, `asset_url`, section-local stylesheet/javascript references and stop cycles with a visited set. Reject paths containing `..`, drive prefixes or URL schemes.

- [ ] **Step 4: Run tests and snapshot the initial supported manifest**

Run: `npx vitest run tests/theme-pack-schema.test.ts tests/theme-pack-dependencies.test.ts`

Expected: PASS for `main-product`, `product-bundles`, `image-comparison`, `testimonials` and `featured-collection`.

- [ ] **Step 5: Commit the schema and dependency engine**

```bash
git add src/theme-packs tests/theme-pack-schema.test.ts tests/theme-pack-dependencies.test.ts
git commit -m "feat: parse Minimog schemas and dependencies"
```

### Task 3: Introduce StoreBlueprintV2 with strict validation

**Files:**
- Create: `src/blueprint-v2/types.ts`
- Create: `src/blueprint-v2/schema.ts`
- Create: `src/blueprint-v2/validate.ts`
- Test: `tests/blueprint-v2.test.ts`

**Interfaces:**
- Consumes: `MINIMOG_PACK.sections` and extracted `ShopifySectionSchema` values.
- Produces: `StoreBlueprintV2`, `createBlueprintSchema(pack)` and `validateBlueprintV2(value, pack)`.

- [ ] **Step 1: Write failing validation tests**

```ts
it("accepts settings and blocks allowed by the theme pack", () => {
  expect(validateBlueprintV2(validProductBlueprint, MINIMOG_PACK).ok).toBe(true);
});

it.each([
  ["unknown section", { ...validProductBlueprint, pages: [{ ...page, sections: [{ id: "x", type: "made-up", settings: {}, blocks: [] }] }] }],
  ["unknown block", blueprintWithBlock("main-product", "made-up")],
  ["preview fixture leakage", blueprintWithSetting("title", "previewOnly")],
])("rejects %s", (_name, value) => expect(validateBlueprintV2(value, MINIMOG_PACK).ok).toBe(false));
```

- [ ] **Step 2: Run the test and verify V2 does not exist**

Run: `npm install zod && npx vitest run tests/blueprint-v2.test.ts`

Expected: FAIL on missing module.

- [ ] **Step 3: Implement the discriminated schema and business validation**

```ts
export type BlueprintSectionV2 = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks: Array<{ id: string; type: string; settings: Record<string, unknown> }>;
  productBinding?: string;
};

export type BlueprintValidation =
  | { ok: true; value: StoreBlueprintV2 }
  | { ok: false; errors: Array<{ path: string; code: string; message: string }> };
```

Validate section types, block types, setting types, unique IDs, page limits, 25-section Shopify limit, 50-block section limit and absence of preview-only values.

- [ ] **Step 4: Run focused validation tests**

Run: `npx vitest run tests/blueprint-v2.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit BlueprintV2**

```bash
git add src/blueprint-v2 tests/blueprint-v2.test.ts package.json package-lock.json
git commit -m "feat: add strict StoreBlueprintV2"
```

### Task 4: Compile one Blueprint to editor and Shopify JSON

**Files:**
- Create: `src/blueprint-v2/compile-editor.ts`
- Create: `src/blueprint-v2/compile-shopify.ts`
- Modify: `src/editor/document.ts`
- Test: `tests/blueprint-v2-compiler.test.ts`

**Interfaces:**
- Consumes: validated `StoreBlueprintV2`.
- Produces: `compileBlueprintToEditor(blueprint): EditorDocument` and `compileBlueprintToShopifyTemplates(blueprint): ThemeFile[]`.

- [ ] **Step 1: Write a failing round-trip test with real blocks**

```ts
it("preserves product blocks in editor and Shopify output", () => {
  const editor = compileBlueprintToEditor(validProductBlueprint);
  expect(editor.pages[0].sections[0].blocks.map((block) => block.type)).toContain("buy_buttons");
  const files = compileBlueprintToShopifyTemplates(validProductBlueprint);
  const template = JSON.parse(files.find((file) => file.key === "templates/product.weflo.json")!.value);
  expect(template.sections.product.blocks).toBeDefined();
  expect(template.order).toContain("product");
});
```

- [ ] **Step 2: Run the test and confirm the current compiler loses blocks**

Run: `npx vitest run tests/blueprint-v2-compiler.test.ts`

Expected: FAIL because V2 compiler functions do not exist.

- [ ] **Step 3: Implement deterministic ID, settings and block compilation**

```ts
export function compileBlueprintToEditor(blueprint: StoreBlueprintV2): EditorDocument {
  return {
    version: 2,
    themePack: blueprint.themePack,
    name: blueprint.store.name,
    kind: blueprint.pages[0].kind,
    pages: blueprint.pages.map(compilePage),
    sourceBlueprint: blueprint,
  };
}
```

The Shopify compiler must emit section dictionaries keyed by stable section IDs and block dictionaries plus explicit block order.

- [ ] **Step 4: Run compiler and migration tests**

Run: `npx vitest run tests/blueprint-v2-compiler.test.ts tests/editor-migrate.test.ts`

Expected: PASS without changing v1 fixtures.

- [ ] **Step 5: Commit both compilers**

```bash
git add src/blueprint-v2 src/editor/document.ts tests/blueprint-v2-compiler.test.ts tests/editor-migrate.test.ts
git commit -m "feat: compile StoreBlueprintV2 without losing blocks"
```

### Task 5: Generate a complete blueprint with OpenAI Structured Outputs

**Files:**
- Create: `src/blueprint-v2/openai.ts`
- Create: `src/blueprint-v2/prompt.ts`
- Modify: `src/server/prod.ts`
- Test: `tests/blueprint-v2-openai.test.ts`

**Interfaces:**
- Consumes: `ImportedProduct`, analysis, wizard decisions, pack manifest and Zod schema.
- Produces: `BlueprintGenerator.generate(input): Promise<StoreBlueprintV2>`.

- [ ] **Step 1: Write failing tests around the OpenAI boundary**

```ts
it("requests a strict schema and validates the parsed output", async () => {
  const generator = createOpenAiBlueprintGenerator({ client: fakeOpenAi(validProductBlueprint), pack: MINIMOG_PACK });
  const result = await generator.generate(generationInput);
  expect(result.pages[0].sections.length).toBeGreaterThanOrEqual(8);
  expect(fakeRequest().text?.format?.strict).toBe(true);
});

it("does not save malformed model output", async () => {
  const generator = createOpenAiBlueprintGenerator({ client: fakeOpenAi({ version: 2 }), pack: MINIMOG_PACK });
  await expect(generator.generate(generationInput)).rejects.toMatchObject({ code: "invalid_blueprint" });
});
```

- [ ] **Step 2: Run the test and verify the generator is absent**

Run: `npx vitest run tests/blueprint-v2-openai.test.ts`

Expected: FAIL on missing factory.

- [ ] **Step 3: Implement one structured generation call plus one repair call**

```ts
export type BlueprintGenerator = {
  generate(input: BlueprintGenerationInput): Promise<StoreBlueprintV2>;
};

const response = await client.responses.parse({
  model,
  input: buildBlueprintPrompt(input, pack),
  text: { format: zodTextFormat(createBlueprintSchema(pack), "store_blueprint_v2") },
});
```

Allow one repair attempt containing validation errors. Never fall back to a fake successful page; return a recoverable generation error.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/blueprint-v2-openai.test.ts tests/onboarding-api.test.ts`

Expected: PASS with OpenAI fully mocked.

- [ ] **Step 5: Commit the generator**

```bash
git add src/blueprint-v2 src/server/prod.ts tests/blueprint-v2-openai.test.ts tests/onboarding-api.test.ts
git commit -m "feat: generate Minimog blueprints with OpenAI"
```

### Task 6: Add an idempotent, resumable product-generation pipeline

**Files:**
- Create: `src/create/product-generation-state.ts`
- Create: `src/create/product-generation-service.ts`
- Modify: `src/repos/types.ts`
- Modify: `src/repos/postgres.ts`
- Modify: `src/server/onboarding.ts`
- Test: `tests/product-generation-service.test.ts`
- Test: `tests/onboarding-generation-api.test.ts`

**Interfaces:**
- Consumes: `BlueprintGenerator`, image studio and compilers.
- Produces: `ProductGenerationService.start`, `.resume`, `.status` and persisted `GenerationRun`.

- [ ] **Step 1: Write failing state-transition and idempotency tests**

```ts
it("resumes from the last persisted step", async () => {
  await repo.saveRun(runAt("generate-images"));
  await service.resume(run.id);
  expect(calls.analyse).toBe(0);
  expect(calls.generateImages).toBe(1);
});

it("returns the same run for the same idempotency key", async () => {
  const first = await service.start({ ...input, idempotencyKey: "draft-1" });
  const second = await service.start({ ...input, idempotencyKey: "draft-1" });
  expect(second.id).toBe(first.id);
});
```

- [ ] **Step 2: Run focused tests and verify no persisted run exists**

Run: `npx vitest run tests/product-generation-service.test.ts tests/onboarding-generation-api.test.ts`

Expected: FAIL on missing service and repository methods.

- [ ] **Step 3: Implement explicit persisted steps**

```ts
export type GenerationStep =
  | "normalize-product" | "analyse-product" | "choose-direction"
  | "compose-blueprint" | "generate-images" | "validate-blueprint"
  | "compile-document" | "complete";

export type GenerationRun = {
  id: string;
  workspaceId: string;
  draftId: string;
  idempotencyKey: string;
  step: GenerationStep;
  status: "queued" | "running" | "failed" | "complete";
  error: { code: string; message: string } | null;
};
```

Persist before and after every external call. Routes return `{ run, nextAction }` JSON for success and failure.

- [ ] **Step 4: Run pipeline and API tests**

Run: `npx vitest run tests/product-generation-service.test.ts tests/onboarding-generation-api.test.ts tests/pages-api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the resumable pipeline**

```bash
git add src/create src/repos src/server/onboarding.ts tests/product-generation-service.test.ts tests/onboarding-generation-api.test.ts
git commit -m "feat: add resumable AI store generation"
```

### Task 7: Replace the product creation journey

**Files:**
- Modify: `src/create/workspace.ts`
- Modify: `src/hydrate/creer.ts`
- Modify: `src/hydrate/creer.css`
- Test: `tests/create-workspace.test.ts`
- Test: `tests/create-browser-contract.test.ts`

**Interfaces:**
- Consumes: generation API `{ run, nextAction }` and draft wizard suggestions.
- Produces: a four-decision flow ending in `/editeur?page=<id>`.

- [ ] **Step 1: Write failing journey tests**

```ts
it("keeps a dashboard product creation out of account onboarding", () => {
  expect(routeForCreation({ authenticated: true, format: "product" })).toBe("/creer?format=product");
});

it("shows only source, target, offer, direction and review", () => {
  expect(productJourneySteps()).toEqual(["source", "target", "offer", "direction", "review"]);
});

it("opens a blank page directly without template selection", () => {
  expect(nextActionForBlank()).toEqual({ type: "create-empty-document" });
});
```

- [ ] **Step 2: Run journey tests and capture current failures**

Run: `npx vitest run tests/create-workspace.test.ts tests/create-browser-contract.test.ts`

Expected: FAIL on the old branching behavior.

- [ ] **Step 3: Implement one state machine and remove implicit redirects**

```ts
export type ProductJourneyStep = "source" | "target" | "offer" | "direction" | "review" | "building";

export function nextProductJourneyStep(step: ProductJourneyStep): ProductJourneyStep {
  return ({ source: "target", target: "offer", offer: "direction", direction: "review", review: "building", building: "building" })[step];
}
```

Render errors inline, preserve answers in the draft, disable duplicate submissions and poll only the active generation run.

- [ ] **Step 4: Run browser contract and build**

Run: `npx vitest run tests/create-workspace.test.ts tests/create-browser-contract.test.ts && npm run build`

Expected: PASS and no TypeScript/esbuild errors.

- [ ] **Step 5: Commit the simplified journey**

```bash
git add src/create src/hydrate/creer.ts src/hydrate/creer.css tests/create-workspace.test.ts tests/create-browser-contract.test.ts public/hydrate/creer.js
git commit -m "feat: simplify AI product creation journey"
```

### Task 8: Drive the editor from real Minimog section schemas

**Files:**
- Create: `src/editor/theme-schema-controls.ts`
- Modify: `src/editor/ui/left-rail.ts`
- Modify: `src/editor/ui/inspector.ts`
- Modify: `src/editor/store.ts`
- Modify: `src/server/pages.ts`
- Test: `tests/editor-theme-schema.test.ts`
- Test: `tests/editor-direct-manipulation.test.ts`

**Interfaces:**
- Consumes: `EditorDocument.themePack`, extracted section schemas and existing editor commands.
- Produces: `controlsForThemeSection(section, pack): InspectorControl[]` and block-aware editor mutations.

- [ ] **Step 1: Write failing schema-control and manipulation tests**

```ts
it("exposes Minimog controls instead of generic title/text controls", () => {
  const controls = controlsForThemeSection(mainProductSection, minimogPack);
  expect(controls.map((control) => control.key)).toEqual(expect.arrayContaining(["media_layout", "enable_sticky_info"]));
});

it("deletes and reorders real Shopify blocks", () => {
  const next = applyCommand(document, { type: "blockRemove", sectionId: "product", blockId: "price" });
  expect(next.pages[0].sections[0].blocks.some((block) => block.id === "price")).toBe(false);
});
```

- [ ] **Step 2: Run editor tests and verify generic controls are returned**

Run: `npx vitest run tests/editor-theme-schema.test.ts tests/editor-direct-manipulation.test.ts`

Expected: FAIL for missing theme-schema adapter.

- [ ] **Step 3: Map Shopify input types to editor controls**

```ts
const CONTROL_MAP = {
  text: "text", textarea: "textarea", richtext: "richtext", image_picker: "image",
  color: "color", checkbox: "toggle", range: "range", select: "select",
  product: "product", collection: "collection", url: "link",
} as const;
```

Unknown Shopify input types render read-only with an explicit unsupported badge. Every mutation passes through existing command validation and autosave.

- [ ] **Step 4: Run editor test group**

Run: `npx vitest run tests/editor-theme-schema.test.ts tests/editor-direct-manipulation.test.ts tests/editor-autosave.test.ts tests/editor-browser-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit schema-driven editing**

```bash
git add src/editor src/server/pages.ts tests/editor-theme-schema.test.ts tests/editor-direct-manipulation.test.ts
git commit -m "feat: edit native Minimog sections and blocks"
```

### Task 9: Export an installable, dependency-complete Shopify theme

**Files:**
- Modify: `src/shopify/compiler.ts`
- Create: `src/shopify/theme-pack-export.ts`
- Modify: `src/server/shopify.ts`
- Test: `tests/minimog-shopify-export.test.ts`
- Test: `tests/shopify-compiler.test.ts`

**Interfaces:**
- Consumes: editor document with `sourceBlueprint` and pack dependency resolver.
- Produces: `compileThemePackExport(document): ThemeFile[]` and unpublished theme upload.

- [ ] **Step 1: Write a failing export completeness test**

```ts
it("exports every transitive dependency referenced by the generated template", () => {
  const files = compileThemePackExport(productDocument);
  const keys = new Set(files.map((file) => file.key));
  expect(keys).toContain("sections/main-product.liquid");
  expect(keys).toContain("snippets/main-product-blocks.liquid");
  expect(keys).toContain("assets/product-info.js");
  expect(keys).toContain("templates/product.weflo.json");
  expect(assertNoMissingThemeReferences(files)).toEqual([]);
});
```

- [ ] **Step 2: Run compiler tests and verify missing dependencies**

Run: `npx vitest run tests/minimog-shopify-export.test.ts tests/shopify-compiler.test.ts`

Expected: FAIL because current compiler exports Weflo-native sections.

- [ ] **Step 3: Implement pack-aware compilation and unpublished upload**

```ts
export function compileThemePackExport(document: EditorDocument): ThemeFile[] {
  const blueprint = requireBlueprintV2(document);
  const entries = sectionEntries(blueprint);
  return dedupeThemeFiles([
    ...resolveAllDependencies(entries, minimogReader),
    ...compileBlueprintToShopifyTemplates(blueprint),
  ]);
}
```

Reject unresolved Liquid references. Return `{ themeId, previewUrl, status: "unpublished" }` after upload; publication remains a separate explicit action.

- [ ] **Step 4: Run export tests and a Shopify Theme Check fixture**

Run: `npx vitest run tests/minimog-shopify-export.test.ts tests/shopify-compiler.test.ts && npx shopify theme check --path _tmp/minimog-export-fixture`

Expected: all Vitest tests pass and Theme Check reports no missing snippets/assets or invalid JSON templates.

- [ ] **Step 5: Commit the real Shopify export**

```bash
git add src/shopify src/server/shopify.ts tests/minimog-shopify-export.test.ts tests/shopify-compiler.test.ts
git commit -m "feat: export dependency-complete Minimog themes"
```

### Task 10: Add safe v1 coexistence, migration and cutover

**Files:**
- Create: `src/blueprint-v2/migrate.ts`
- Modify: `src/server/pages.ts`
- Modify: `src/hydrate/creations.ts`
- Test: `tests/blueprint-v2-migrate.test.ts`
- Test: `tests/creations-view.test.ts`

**Interfaces:**
- Consumes: v1 `EditorDocument` and optional source product.
- Produces: `assessV2Migration(document): MigrationAssessment` and explicit migration/regeneration actions.

- [ ] **Step 1: Write failing non-destructive migration tests**

```ts
it("never replaces a v1 document during assessment", () => {
  const original = structuredClone(v1Document);
  const result = assessV2Migration(v1Document);
  expect(v1Document).toEqual(original);
  expect(result.action).toMatch(/migrate|regenerate|keep/);
});

it("requires regeneration when a legacy section has no safe mapping", () => {
  expect(assessV2Migration(documentWith("customCode")).action).toBe("regenerate");
});
```

- [ ] **Step 2: Run migration tests and confirm no assessment exists**

Run: `npx vitest run tests/blueprint-v2-migrate.test.ts tests/creations-view.test.ts`

Expected: FAIL on missing migration module.

- [ ] **Step 3: Implement assessment, copy-on-write migration and UI labels**

```ts
export type MigrationAssessment =
  | { action: "migrate"; mappedSections: number }
  | { action: "regenerate"; reason: string; sourceProductAvailable: boolean }
  | { action: "keep"; reason: string };
```

Migration creates a new revision and leaves the original revision addressable. Remove no legacy renderer during this task.

- [ ] **Step 4: Run migration, API and creations tests**

Run: `npx vitest run tests/blueprint-v2-migrate.test.ts tests/creations-view.test.ts tests/pages-api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit safe coexistence**

```bash
git add src/blueprint-v2/migrate.ts src/server/pages.ts src/hydrate/creations.ts tests/blueprint-v2-migrate.test.ts tests/creations-view.test.ts
git commit -m "feat: migrate legacy pages without data loss"
```

### Task 11: Verify the first production-quality vertical slice

**Files:**
- Create: `tests/e2e/minimog-product-generation.spec.ts`
- Create: `scripts/verify-minimog-vertical-slice.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: complete generation, editor and export pipeline.
- Produces: repeatable verification command `npm run verify:minimog`.

- [ ] **Step 1: Write the end-to-end acceptance test**

```ts
test("product import creates, edits and exports a Minimog page", async ({ page }) => {
  await loginFixtureUser(page);
  await importFixtureProduct(page, "halo-lamp");
  await chooseGenerationDirection(page, "Éditorial conversion");
  await expect(page.getByTestId("generation-step-complete")).toHaveCount(8);
  await expect(page.locator("[data-theme-section]")).toHaveCount(10);
  await dragSection(page, "testimonials", "product-bundles");
  await editSectionSetting(page, "main-product", "enable_sticky_info", true);
  const exportResult = await exportUnpublishedTheme(page);
  expect(exportResult.previewUrl).toContain("preview_theme_id=");
});
```

- [ ] **Step 2: Run the E2E test and record any remaining integration failure**

Run: `npx playwright test tests/e2e/minimog-product-generation.spec.ts`

Expected: FAIL until all test fixtures and endpoints are connected.

- [ ] **Step 3: Add the verification orchestrator**

```json
{
  "scripts": {
    "verify:minimog": "vitest run tests/theme-pack-*.test.ts tests/blueprint-v2*.test.ts tests/product-generation-service.test.ts tests/minimog-shopify-export.test.ts && playwright test tests/e2e/minimog-product-generation.spec.ts && npm run build"
  }
}
```

The script must fail on test, build, missing dependency, invalid JSON template or screenshot error.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm run verify:minimog`

Expected: PASS with a generated page containing 8–12 populated sections, editable blocks, a dependency-complete export and no unlabelled placeholders.

- [ ] **Step 5: Commit the acceptance gate**

```bash
git add tests/e2e/minimog-product-generation.spec.ts scripts/verify-minimog-vertical-slice.mjs package.json package-lock.json
git commit -m "test: verify Minimog product generation end to end"
```

## Follow-up plans after this vertical slice

The following work begins only after `npm run verify:minimog` passes:

1. Home-page generation using the same pack and BlueprintV2.
2. Landing pages and advertorials with dedicated section allowlists.
3. Quiz funnels and result routing.
4. React canvas migration for richer Replo-style direct manipulation.
5. Additional licensed theme packs through the same `ThemePackManifest` interface.
