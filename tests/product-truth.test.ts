import { describe, expect, it } from "vitest";
import { buildProductTruthSheet } from "../src/onboarding/product-truth";
import type { ImportedProduct } from "../src/onboarding/types";

const product: ImportedProduct = {
  sourceUrl: "https://shop.example/lamp", title: "Lampe murale sans fil", description: "Éclairage orientable. Installation rapide.", vendor: "Lumi",
  currency: "EUR", price: 49, compareAtPrice: null, images: ["https://cdn.example/lamp.jpg"], variants: [], rating: null, reviewCount: null, reviews: [],
};

describe("product truth sheet", () => {
  it("keeps observed facts separate from supplier claims and inferences", () => {
    const truth = buildProductTruthSheet(product);
    expect(truth.observedFacts.title).toBe("Lampe murale sans fil");
    expect(truth.supplierClaims).toEqual(["Éclairage orientable.", "Installation rapide."]);
    expect(truth.inferences.length).toBeGreaterThan(0);
  });

  it("never invents unknown dimensions, materials, certifications, or reviews", () => {
    const truth = buildProductTruthSheet(product);
    expect(truth.observedFacts).not.toHaveProperty("material");
    expect(truth.observedFacts).not.toHaveProperty("certification");
    expect(truth.observedFacts.rating).toBeNull();
    expect(truth.observedFacts.reviewCount).toBeNull();
  });
});
