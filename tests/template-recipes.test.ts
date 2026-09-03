import { describe, expect, it } from "vitest";
import { FORMAT_FLOWS } from "../src/create/format-flow";
import { getSectionDefinition } from "../src/sections/index";
import { recipeForTemplate, TEMPLATE_RECIPES } from "../src/onboarding/template-recipe";

describe("template recipes", () => {
  it("registers one recipe for every selectable template", () => {
    const selectableIds = FORMAT_FLOWS.flatMap((flow) => flow.templates.map((template) => template.id)).sort();
    expect(TEMPLATE_RECIPES).toHaveLength(21);
    expect(TEMPLATE_RECIPES.map((recipe) => recipe.id).sort()).toEqual(selectableIds);
  });

  it("builds a brand-editorial homepage from real section definitions", () => {
    const recipe = recipeForTemplate("home-brand-editorial");
    expect(recipe.sections).toEqual([
      "announcement", "navigation", "hero", "imageText", "collectionGrid",
      "testimonials", "newsletter", "footer",
    ]);
    expect(recipe.sections.every((type) => getSectionDefinition(type))).toBe(true);
  });

  it("keeps all three homepage compositions intentionally distinct", () => {
    expect(recipeForTemplate("home-catalogue-premium").sections).toEqual([
      "announcement", "navigation", "hero", "collectionGrid", "benefits",
      "imageText", "newsletter", "footer",
    ]);
    expect(recipeForTemplate("home-story-first").sections).toEqual([
      "navigation", "hero", "richText", "imageText", "press",
      "collectionGrid", "newsletter", "footer",
    ]);
  });

  it("makes the bundle-first product template meaningfully different", () => {
    const recipe = recipeForTemplate("product-bundle-first");
    expect(recipe.sections[0]).toBe("announcement");
    expect(recipe.variants.productMain).toBe("bundle-led");
    expect(recipe.variants.bundle).toBe("quantity-break");
  });

  it("rejects unknown templates instead of silently choosing a layout", () => {
    expect(() => recipeForTemplate("home-unknown")).toThrow(/unknown template/i);
  });
});
