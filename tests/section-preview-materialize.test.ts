import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { materializeSectionVariant, sectionFromFixture } from "../src/section-preview/materialize";

describe("section variant materialization", () => {
  it("marks fictional proof as preview-only", () => {
    const section = sectionFromFixture("testimonials", "ugc-grid", "aurea-serum", "preview-1");
    expect(section.settings.previewFixtureId).toBe("aurea-serum");
    expect(section.settings.previewOnly).toBe(true);
    expect(section.blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("uses customer commerce and removes fictional reviews on insertion", () => {
    const document = migrateDocument(blankDocument("Ma boutique"), "product");
    const result = materializeSectionVariant({ document, sectionType: "testimonials", variantId: "ugc-grid", sectionId: "customer-1" });
    expect(result.section.settings.previewFixtureId).toBeUndefined();
    expect(result.section.settings.previewOnly).toBeUndefined();
    expect(result.section.blocks).toHaveLength(0);
    expect(result.missingFields).toContain("reviews");
  });
});
