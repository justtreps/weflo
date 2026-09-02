import { describe, expect, it } from "vitest";
import { PAGE_MODELS } from "../src/lib/catalog";
import { buildModelDocument, modelManifestIds } from "../src/models/model-manifest";

describe("editable model manifests", () => {
  it("covers exactly the 18 gallery models", () => {
    expect(modelManifestIds).toHaveLength(18);
    expect(new Set(modelManifestIds)).toEqual(new Set(PAGE_MODELS.map((model) => model.id)));
  });

  it("builds distinctive branded documents from real sections", () => {
    const documents = PAGE_MODELS.map((model) => buildModelDocument(model.id, model.name));
    expect(new Set(documents.map((document) => document.pages[0].sections.map((section) => section.type).join("/"))).size).toBe(18);
    for (const document of documents) {
      expect(document.version).toBe(2);
      expect(document.pages[0].sections.length).toBeGreaterThanOrEqual(8);
      expect(document.pages[0].sections.some((section) => String(section.settings.cta_label ?? "").length > 0)).toBe(true);
      expect(document.pages[0].sections.every((section) => section.type !== "referencePreview")).toBe(true);
      expect(document.assets.some((asset) => asset.id.endsWith("desktop-reference"))).toBe(true);
      expect(document.theme.accent).toMatch(/^#/);
    }
  });

  it("keeps all model content editable and product imagery in asset references", () => {
    const document = buildModelDocument("proteo", "Ma boutique");
    const hero = document.pages[0].sections.find((section) => section.type === "productHero")!;
    expect(hero.settings.title).toBe("Ma boutique");
    expect(hero.settings.image).toBeTruthy();
    expect(document.assets.some((asset) => asset.url === hero.settings.image)).toBe(true);
    expect(hero.locked).toBe(false);
  });
});
