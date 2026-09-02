import { describe, expect, it } from "vitest";
import { buildStoreRecipe } from "../src/onboarding/store-recipe";
import { buildProductTruthSheet } from "../src/onboarding/product-truth";
import { selectArtDirection } from "../src/onboarding/art-direction";
import type { ImportedProduct } from "../src/onboarding/types";

function source(title: string, description: string): ImportedProduct {
  return { sourceUrl: "https://example.com/p", title, description, vendor: "", currency: "EUR", price: 40, compareAtPrice: null, images: [], variants: [], rating: null, reviewCount: null, reviews: [] };
}

function recipe(product: ImportedProduct) {
  const truth = buildProductTruthSheet(product);
  return buildStoreRecipe({ product, truth, artDirection: selectArtDirection(truth), personas: [], angles: [] });
}

describe("store recipes", () => {
  it("creates product-specific section variants", () => {
    const lamp = recipe(source("Lampe murale", "Éclairage chaleureux pour la maison"));
    const posture = recipe(source("Correcteur de posture", "Support ergonomique pour le dos"));
    const gift = recipe(source("Coffret cadeau enfant", "Un jouet fun à offrir"));

    expect(lamp.sections.map((item) => item.variant)).toContain("ambient-editorial");
    expect(posture.sections.map((item) => item.variant)).toContain("problem-solution");
    expect(gift.sections.map((item) => item.variant)).toContain("giftable-story");
    expect(new Set([lamp.id, posture.id, gift.id]).size).toBe(3);
  });

  it("always includes commerce, proof, objections, CTA and footer without fake urgency", () => {
    const result = recipe(source("Tasse en céramique", "Tasse artisanale"));
    const types = result.sections.map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining(["navigation", "productMain", "faq", "cta", "footer"]));
    expect(types.some((type) => ["reviews", "testimonials"].includes(type))).toBe(true);
    expect(types).not.toContain("countdown");
  });
});
