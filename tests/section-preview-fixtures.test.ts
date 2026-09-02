import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_FIXTURES, fixtureById } from "../src/section-preview/fixtures";

describe("section preview fixtures", () => {
  it("provides six complete, uniquely branded fictional products", () => {
    expect(SECTION_PREVIEW_FIXTURES.map((item) => item.id)).toEqual([
      "aurea-serum", "halo-lamp", "noma-bag", "pulse-recovery", "brume-coffee", "forma-table",
    ]);
    expect(new Set(SECTION_PREVIEW_FIXTURES.map((item) => item.brand.name)).size).toBe(6);
    expect(SECTION_PREVIEW_FIXTURES.every((item) => item.product.images.length >= 3)).toBe(true);
    expect(SECTION_PREVIEW_FIXTURES.every((item) => item.previewOnly.reviews.length >= 3)).toBe(true);
    expect(fixtureById("halo-lamp").product.title).toMatch(/lampe/i);
  });
});
