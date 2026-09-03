import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { buildCapabilityReport } from "../src/shopify/capability-report";

function quantityOffer(blocks: EditorSection["blocks"]): EditorSection {
  return {
    id: "offer",
    type: "quantity-offer",
    name: "Offre quantité",
    hidden: false,
    locked: false,
    settings: { product_handle: "serum" },
    style: {},
    responsive: {},
    blocks,
  };
}

describe("Shopify capability truth", () => {
  it("does not infer a Shopify connection when no facts were supplied", () => {
    const report = buildCapabilityReport({ capabilities: ["product-form"] });

    expect(report.capabilities["product-form"]).toMatchObject({ state: "unavailable", available: false });
    expect(report.blockers.join(" ")).toMatch(/Connecte/i);
  });

  it("derives mixed-product custom bundle requirements from tier blocks", () => {
    const section = quantityOffer([
      { id: "solo", type: "offer-tier", settings: { product_handle: "serum", quantity: 1, discount_type: "none", discount_value: 0 } },
      { id: "duo", type: "offer-tier", settings: { product_handle: "creme", quantity: 2, discount_type: "none", discount_value: 0 } },
    ]);

    const withoutTransform = buildCapabilityReport({
      sections: [section],
      shopify: { connected: true, hasProductData: true, wefloExtensionInstalled: true },
    });
    expect(withoutTransform.required).toContain("custom-bundle");
    expect(withoutTransform.capabilities["custom-bundle"]).toMatchObject({ state: "app-required", available: false });
    expect(withoutTransform.blockers.join(" ")).toMatch(/Cart Transform/i);

    const attested = buildCapabilityReport({
      sections: [section],
      shopify: { connected: true, hasProductData: true, wefloExtensionInstalled: true, cartTransformInstalled: true },
    });
    expect(attested.capabilities["custom-bundle"]).toMatchObject({ state: "app-required", available: true });
    expect(attested.blockers).toEqual([]);
  });

  it("requires an attested Shopify discount rule for displayed savings", () => {
    const section = quantityOffer([
      { id: "duo", type: "offer-tier", settings: { product_handle: "serum", quantity: 2, discount_type: "amount", discount_value: 8 } },
    ]);

    const missing = buildCapabilityReport({ sections: [section], shopify: { connected: true, hasProductData: true } });
    expect(missing.required).toContain("discount-rules");
    expect(missing.capabilities["discount-rules"]).toMatchObject({ state: "app-required", available: false });
    expect(missing.blockers.join(" ")).toMatch(/règle de remise/i);

    const attested = buildCapabilityReport({
      sections: [section],
      shopify: { connected: true, hasProductData: true, discountRuleIds: ["gid://shopify/DiscountAutomaticNode/42"] },
    });
    expect(attested.capabilities["discount-rules"]).toMatchObject({ state: "app-required", available: true });
    expect(attested.blockers).toEqual([]);
  });

  it("keeps a same-product offer without savings on the native path", () => {
    const report = buildCapabilityReport({
      sections: [quantityOffer([{ id: "solo", type: "offer-tier", settings: { quantity: 1, discount_type: "none", discount_value: 0 } }])],
      shopify: { connected: true, hasProductData: true },
    });

    expect(report.required).not.toContain("custom-bundle");
    expect(report.required).not.toContain("discount-rules");
    expect(report.capabilities["quantity-breaks"]).toMatchObject({ state: "native", available: true });
    expect(report.blockers).toEqual([]);
  });
});
