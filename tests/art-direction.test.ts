import { describe, expect, it } from "vitest";
import { selectArtDirection } from "../src/onboarding/art-direction";
import { buildProductTruthSheet } from "../src/onboarding/product-truth";
import type { ImportedProduct } from "../src/onboarding/types";

function product(title: string, description: string): ImportedProduct {
  return { sourceUrl: "https://example.com", title, description, vendor: "", currency: "EUR", price: null, compareAtPrice: null, images: [], variants: [], rating: null, reviewCount: null, reviews: [] };
}

describe("art direction", () => {
  it("selects a warm editorial system for home lighting", () => {
    expect(selectArtDirection(buildProductTruthSheet(product("Lampe murale", "Éclairage chaleureux pour la maison"))).id).toBe("warm-home");
  });

  it("selects beauty and technical directions from product context", () => {
    expect(["clinical-wellness", "editorial-beauty"]).toContain(selectArtDirection(buildProductTruthSheet(product("Sérum visage", "Soin hydratant pour la peau"))).id);
    expect(["direct-response", "technical-performance"]).toContain(selectArtDirection(buildProductTruthSheet(product("Correcteur de posture", "Support ergonomique pour le dos"))).id);
  });
});
