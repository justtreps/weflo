import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_MANIFESTS, previewManifest } from "../src/section-preview/manifests";

describe("section preview manifests", () => {
  it("ships twelve unique variants across the six required section types", () => {
    expect(SECTION_PREVIEW_MANIFESTS).toHaveLength(12);
    expect(new Set(SECTION_PREVIEW_MANIFESTS.map((item) => `${item.sectionType}:${item.variantId}`)).size).toBe(12);
    expect(new Set(SECTION_PREVIEW_MANIFESTS.map((item) => item.sectionType))).toEqual(
      new Set(["productHero", "productMain", "benefits", "testimonials", "bundle", "faq"]),
    );
  });

  it("resolves every fixture and generates stable asset paths", () => {
    const manifest = previewManifest("productHero", "beauty-editorial");
    expect(manifest.defaultFixtureId).toBe("aurea-serum");
    expect(manifest.preview.desktop).toMatch(/^\/assets\/section-previews\/productHero\//);
    expect(manifest.preview.mobile).toMatch(/-mobile\.webp$/);
  });
});
