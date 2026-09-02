import { describe, expect, it } from "vitest";
import { previewDocument, renderSectionPreview } from "../src/section-preview/document";

describe("section preview document", () => {
  it("renders a fixture through the real editor renderer", () => {
    const document = previewDocument({ sectionType: "productHero", variantId: "beauty-editorial", fixtureId: "aurea-serum", context: true });
    expect(document.version).toBe(2);
    expect(document.pages[0].sections.some((section) => section.settings.variant === "beauty-editorial")).toBe(true);
    const html = renderSectionPreview({ sectionType: "productHero", variantId: "beauty-editorial", fixtureId: "aurea-serum", viewport: "mobile", context: false });
    expect(html).toContain('data-wf-breakpoint="mobile"');
    expect(html).toContain("Auréa");
  });
});
