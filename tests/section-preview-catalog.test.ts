import { describe, expect, it } from "vitest";
import { sectionCatalogMarkup } from "../src/editor/ui/section-catalog";

describe("section preview catalogue", () => {
  it("uses static captures and exposes preview and insert actions", () => {
    const html = sectionCatalogMarkup({ category: "hero", viewport: "desktop" });
    expect(html).toContain("beauty-editorial");
    expect(html).toContain("/assets/section-previews/productHero/");
    expect(html).toContain('data-section-preview-open="productHero:beauty-editorial"');
    expect(html).toContain('data-section-variant-insert="productHero:beauty-editorial"');
    expect(html).not.toContain("<iframe");
  });
});
