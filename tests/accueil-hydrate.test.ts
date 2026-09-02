import { describe, expect, it } from "vitest";
import { nextFormatIndex } from "../src/hydrate/accueil";

describe("nextFormatIndex", () => {
  it("wraps keyboard navigation across format tabs", () => {
    expect(nextFormatIndex(5, "ArrowRight", 6)).toBe(0);
    expect(nextFormatIndex(0, "ArrowLeft", 6)).toBe(5);
    expect(nextFormatIndex(3, "Home", 6)).toBe(0);
    expect(nextFormatIndex(3, "End", 6)).toBe(5);
  });

  it("keeps the current tab for unrelated keys", () => {
    expect(nextFormatIndex(2, "Enter", 6)).toBe(2);
  });
});
