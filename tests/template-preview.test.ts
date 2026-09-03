import { describe, expect, it } from "vitest";
import { previewDocumentForTemplate, renderTemplatePreview } from "../src/create/template-preview";

describe("template preview documents", () => {
  it("renders an explicitly fictitious, fixture-stamped full template", () => {
    const document = previewDocumentForTemplate("home-brand-editorial");
    const html = renderTemplatePreview("home-brand-editorial", "desktop");

    expect(document.templateId).toBe("home-brand-editorial");
    expect(document.pages[0]?.sections.map((section) => section.type)).toEqual([
      "announcement", "navigation", "hero", "imageText", "collectionGrid", "testimonials", "newsletter", "footer",
    ]);
    expect(document.commerce?.sourceProduct.sourceUrl).toMatch(/^https:\/\/demo\.weflo\.app\//);
    expect(document.commerce?.sourceProduct.images).toEqual([
      "https://template-preview-fixture.local/noma-bag-1.svg",
      "https://template-preview-fixture.local/noma-bag-2.svg",
      "https://template-preview-fixture.local/noma-bag-3.svg",
    ]);
    expect(document.commerce?.sourceProduct.reviews).toHaveLength(3);
    expect(html).toContain('data-preview-fixture="true"');
    expect(html).toContain("Exemple fictif");
  });

  it("rejects unknown templates instead of falling back to a preview", () => {
    expect(() => previewDocumentForTemplate("missing-template")).toThrow(/unknown template/i);
  });
});
