import { describe, expect, it } from "vitest";
import { buildStoreDocument } from "../src/onboarding/compile-store";
import { fallbackOnboardingAnalysis } from "../src/onboarding/fallback-analysis";
import type { BrandKit, ImportedProduct } from "../src/onboarding/types";
import { validateEditorDocument } from "../src/editor/schema";

const product: ImportedProduct = {
  sourceUrl: "https://lamp.example/products/infinity", title: "Infinity Wireless Wall Lamp", description: "Wireless magnetic light for renters", vendor: "Lights of Sweden", currency: "SEK", price: 508.99, compareAtPrice: 636,
  images: ["https://cdn.example/main.jpg", "https://cdn.example/white.jpg", "https://cdn.example/black.jpg"],
  variants: [{ id: "white", title: "White", price: 508.99, image: "https://cdn.example/white.jpg" }], rating: 4.7, reviewCount: 312,
  reviews: [{ author: "Elin K.", rating: 5, title: "Soft light", text: "Perfect warm light without drilling." }],
};
const strategy = fallbackOnboardingAnalysis(product, "fr");
const brandKit: BrandKit = { palette: ["#0A0A09", "#158F83", "#FFD400", "#E7E1DA"], headingFont: "Inter", bodyFont: "Inter", schemes: [{ name: "Paper", background: "#FFFFFF", text: "#111111", accent: "#158F83" }] };

describe("onboarding store compiler", () => {
  it("builds a factual premium store from registered editable sections", () => {
    const document = buildStoreDocument({ product, language: "fr", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit });
    const sectionTypes = document.pages[0].sections.map((section) => section.type);
    expect(sectionTypes).toEqual(expect.arrayContaining(["navigation", "productHero", "gallery", "productMain", "bundle", "benefits", "reviews", "shipping", "faq", "cta", "footer"]));
    expect(document.assets.map((asset) => asset.url)).toEqual(product.images);
    expect(document.commerce?.sourceProduct.title).toBe(product.title);
    expect(JSON.stringify(document)).toContain("LumiWall");
    expect(validateEditorDocument(document)).toMatchObject({ ok: true });
  });

  it("does not label invented testimonials as verified reviews", () => {
    const document = buildStoreDocument({ product: { ...product, reviews: [], rating: null, reviewCount: null }, language: "en", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit });
    expect(JSON.stringify(document)).not.toMatch(/verified buyer|avis vérifié/i);
  });
});
