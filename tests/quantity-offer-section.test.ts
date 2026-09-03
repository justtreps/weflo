import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { getSectionDefinition } from "../src/sections";

function quantityOffer(): EditorSection {
  const definition = getSectionDefinition("quantity-offer")!;
  return {
    id: "quantity-offer-test",
    type: definition.type,
    name: definition.name,
    hidden: false,
    locked: false,
    settings: { ...definition.defaults, product_handle: "serum", variant: "horizontal-cards" },
    style: {},
    responsive: {},
    blocks: [{
      id: "duo",
      type: "offer-tier",
      settings: {
        title: "Duo",
        subtitle: "2 sérums",
        badge: "Le plus choisi",
        quantity: 2,
        discount_type: "percentage",
        discount_value: 15,
        product_handle: "serum",
        variant_id: "445566",
        preselected: true,
        show_variant_picker: false,
      },
    }],
  };
}

describe("section Offre quantité", () => {
  it("renders tier blocks as accessible quantity choices in the canvas", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const web = definition.renderWeb({ section: quantityOffer(), pageName: "Sérum" });

    expect(web).toContain('data-wf-block-id="duo"');
    expect(web).toContain('name="quantity"');
    expect(web).toContain('value="2"');
    expect(web).toContain('type="radio"');
    expect(web).toContain('Le plus choisi');
  });

  it("keeps tier data block-aware in Liquid and its Shopify schema", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const section = quantityOffer();
    const liquid = definition.renderLiquid(section);
    const schema = definition.renderSchema(section) as { blocks: Array<{ type: string; settings: Array<{ id: string }> }> };

    expect(liquid).toContain("block.settings.quantity");
    expect(liquid).toContain('name="quantity"');
    expect(liquid).toContain("selected_product");
    expect(schema.blocks[0].type).toBe("offer-tier");
    expect(schema.blocks[0].settings.map((setting) => setting.id)).toEqual(expect.arrayContaining([
      "title", "subtitle", "badge", "quantity", "discount_type", "discount_value", "product_handle", "variant_id", "preselected", "show_variant_picker",
    ]));
  });

  it("declares each native responsive composition", () => {
    const definition = getSectionDefinition("quantity-offer")!;

    expect(definition.variants.map((variant) => variant.id)).toEqual([
      "horizontal-cards", "stacked-premium", "tier-table",
    ]);
  });
});
