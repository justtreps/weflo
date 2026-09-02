import { describe, expect, it } from "vitest";
import { fallbackOnboardingAnalysis } from "../src/onboarding/fallback-analysis";
import { validateOnboardingAnalysis } from "../src/onboarding/analyser";
import type { ImportedProduct } from "../src/onboarding/types";

const lamp: ImportedProduct = {
  sourceUrl: "https://lamp.example/p/infinity", title: "Infinity Wireless Wall Lamp", description: "Magnetic wireless wall light for renters", vendor: "Lights", currency: "EUR", price: 49,
  compareAtPrice: 69, images: ["https://cdn.example/lamp.jpg"], variants: [], rating: 4.7, reviewCount: 312,
  reviews: [{ author: "Mia", rating: 5, title: "No drilling", text: "Perfect warm light without drilling the wall." }],
};

describe("onboarding analysis", () => {
  it("normalizes product-specific names, personas and angles", () => {
    const result = fallbackOnboardingAnalysis(lamp, "fr");
    expect(result.brandNames).toHaveLength(8);
    expect(result.personas).toHaveLength(4);
    expect(result.angles).toHaveLength(4);
    expect(JSON.stringify(result).toLowerCase()).toMatch(/lamp|lumi|light|mur/);
  });

  it("strips unknown facts and clamps malformed structured output", () => {
    const result = validateOnboardingAnalysis({
      brandNames: ["LumiWall", "LumiWall", "AuraMount", "HaloBeam", "GlowMount", "Everlight", "Radiant", "BeamBase", "Zenith"],
      personas: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, title: `Persona ${i}`, insight: "Needs a wireless lamp", icon: "💡", tags: ["renter"], selected: false })),
      angles: Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, title: `Angle ${i}`, description: "Warm light without drilling", icon: "✨", tags: ["easy"], selected: false })),
      facts: { price: 1 },
    }, lamp);
    expect(result.brandNames).toHaveLength(8);
    expect(new Set(result.brandNames).size).toBe(8);
    expect(result.personas).toHaveLength(4);
    expect(result.angles).toHaveLength(4);
    expect(result).not.toHaveProperty("facts");
  });
});
