import { describe, expect, it } from "vitest";
import { sectionTypesForCreation } from "../src/onboarding/creation-recipe";

describe("creation format recipes", () => {
  it("uses distinct editable section structures for product, advertorial and quiz funnel", () => {
    const product = sectionTypesForCreation("product", "direct-response", "reviews");
    const advertorial = sectionTypesForCreation("advertorial", "direct-response", "reviews");
    const quiz = sectionTypesForCreation("quiz", "direct-response", "reviews");
    expect(product).toContain("productMain");
    expect(advertorial).toContain("richText");
    expect(advertorial).toContain("press");
    expect(quiz).toContain("quiz");
    expect(quiz).toContain("form");
    expect(new Set([product.join("/"), advertorial.join("/"), quiz.join("/")]).size).toBe(3);
  });
});
