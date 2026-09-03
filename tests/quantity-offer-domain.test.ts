import { describe, expect, it } from "vitest";

describe("quantity offer domain normalization", () => {
  it("normalizes quantity and discount values at the domain boundary", async () => {
    const domain = await import("../src/sections/quantity-offer-domain");

    expect([
      domain.normalizeOfferQuantity(-8),
      domain.normalizeOfferQuantity(2.6),
      domain.normalizeOfferQuantity(120),
      domain.normalizeOfferQuantity("invalid"),
    ]).toEqual([1, 3, 99, 1]);
    expect([
      domain.normalizeOfferDiscountType("none"),
      domain.normalizeOfferDiscountType("percentage"),
      domain.normalizeOfferDiscountType("fixed"),
      domain.normalizeOfferDiscountType("amount"),
      domain.normalizeOfferDiscountType("bogus"),
    ]).toEqual(["none", "percentage", "fixed", "fixed", "none"]);
    expect([
      domain.normalizeOfferDiscountValue(-12),
      domain.normalizeOfferDiscountValue("8.5"),
      domain.normalizeOfferDiscountValue(Number.NaN),
    ]).toEqual([0, 8.5, 0]);
  });

  it("preserves useful legacy copy and price while normalizing a tier", async () => {
    const { normalizeOfferTierSettings } = await import("../src/sections/quantity-offer-domain");

    expect(normalizeOfferTierSettings({
      title: "Duo",
      text: "Deux sérums",
      price: "49 €",
      quantity: 0,
      discount_type: "amount",
      discount_value: -4,
    }, { product_handle: "serum", quantity: 2 })).toMatchObject({
      title: "Duo",
      text: "Deux sérums",
      subtitle: "Deux sérums",
      price: "49 €",
      quantity: 1,
      discount_type: "fixed",
      discount_value: 0,
      product_handle: "serum",
    });
  });
});
