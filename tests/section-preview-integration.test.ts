import { describe, expect, it } from "vitest";
import { migrateDocument } from "../src/editor/migrate";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { blankDocument } from "../src/lib/catalog";
import { materializeSectionVariant } from "../src/section-preview/materialize";

describe("section preview integration", () => {
  it("inserts a real product section without preview fixture leakage", () => {
    const document = migrateDocument(blankDocument("Client"), "product");
    const result = materializeSectionVariant({
      document,
      sectionType: "productHero",
      variantId: "beauty-editorial",
      sectionId: "inserted",
    });

    document.pages[0].sections.splice(1, 0, result.section);
    const persisted = JSON.stringify(document);

    expect(persisted).not.toMatch(/aurea-serum|halo-lamp|previewOnly|previewFixtureId/);
    expect(renderEditorDocument(document, { mode: "preview", breakpoint: "mobile" })).toContain("beauty-editorial");
  });

  it("does not invent testimonials when the imported product has no reviews", () => {
    const document = migrateDocument(blankDocument("Client"), "product");
    const result = materializeSectionVariant({
      document,
      sectionType: "testimonials",
      variantId: "ugc-grid",
      sectionId: "reviews",
    });

    expect(result.section.blocks).toEqual([]);
    expect(result.missingFields).toContain("reviews");
  });
});
