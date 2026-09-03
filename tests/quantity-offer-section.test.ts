import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { getSectionDefinition } from "../src/sections";
import { normalizeQuantityOfferSection } from "../src/sections/quantity-offer";
import * as productRuntime from "../src/shopify/runtime/product-form";

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
        show_variant_picker: true,
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
    expect(web).toContain('class="wf-quantity-offer__tiers-layout"');
    expect(web).toContain('class="wf-quantity-offer__tier');
    expect(web).toContain('class="wf-quantity-offer__tier-subtitle"');
    expect(web).toContain('class="wf-quantity-offer__badge"');
    expect(web).toContain('class="wf-quantity-offer__discount"');
    expect(web).toContain('class="wf-quantity-offer__variant"');
  });

  it("keeps tier data block-aware in Liquid and its Shopify schema", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const section = quantityOffer();
    const liquid = definition.renderLiquid(section);
    const schema = definition.renderSchema(section) as { blocks: Array<{ type: string; settings: Array<{ id: string }> }> };

    expect(liquid).toContain("block.settings.quantity");
    expect(liquid).toContain('name="quantity"');
    expect(liquid).toContain("selected_product");
    expect(liquid).toContain("section.settings.subtitle");
    expect(liquid).toContain("section.settings.text");
    expect(liquid).toContain('class="wf-quantity-offer__tiers-layout"');
    expect(liquid).toContain('class="wf-quantity-offer__tier');
    expect(liquid).toContain('class="wf-quantity-offer__tier-subtitle"');
    expect(liquid).toContain('class="wf-quantity-offer__badge"');
    expect(liquid).toContain('class="wf-quantity-offer__discount"');
    expect(liquid).toContain("block.settings.show_variant_picker");
    expect(liquid).toContain("data-wf-tier-variant-select");
    expect(liquid).toContain("weflo-quantity-offer.css");
    expect(liquid).not.toMatch(/{%\s*if[^%]*\(/);
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

  it("selects exactly one admissible tier when defaults are duplicated", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const section = quantityOffer();
    section.blocks = [
      { id: "note", type: "benefit", settings: { title: "Livraison" } },
      { ...section.blocks[0], id: "duo", settings: { ...section.blocks[0].settings, preselected: true } },
      { ...section.blocks[0], id: "trio", settings: { ...section.blocks[0].settings, quantity: 3, preselected: true } },
    ];

    const web = definition.renderWeb({ section, pageName: "Sérum" });
    expect((web.match(/\schecked(?=[\s>])/g) ?? [])).toHaveLength(1);
    expect(web).toContain('data-wf-block-id="duo"');
    expect(web).toContain('data-wf-block-id="trio"');
  });

  it("blocks native checkout and exposes the same app-required state for mixed products", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const section = quantityOffer();
    section.blocks.push({ ...section.blocks[0], id: "mixte", settings: { ...section.blocks[0].settings, product_handle: "creme" } });

    const web = definition.renderWeb({ section, pageName: "Sérum" });
    const liquid = definition.renderLiquid(section);
    const status = "Une application Shopify est requise pour les offres multi-produits.";
    const appRequiredClass = "wf-quantity-offer__app-required";
    expect(web).toContain(status);
    expect(web).toContain(`class="${appRequiredClass}"`);
    expect(web).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    expect(web).toContain("data-wf-native-checkout-lock");
    expect(liquid).toContain(status);
    expect(liquid).toContain(`class="${appRequiredClass}"`);
    expect(liquid).toContain("wf_mixed_product_offer");
    expect(liquid).toContain("data-wf-native-checkout-lock");
  });

  it("disables an empty offer instead of exposing a non-functional checkout", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const section = quantityOffer();
    section.blocks = [];

    const web = definition.renderWeb({ section, pageName: "Sérum" });
    const liquid = definition.renderLiquid(section);

    expect(web).toContain('class="wf-quantity-offer__unavailable"');
    expect(web).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    expect(liquid).toContain("wf_tier_count == 0");
    expect(liquid).toContain('class="wf-quantity-offer__unavailable"');
    expect(normalizeQuantityOfferSection(section).blocks).toEqual([]);
  });

  it("resolves configured variant ids only through variants owned by the tier product", () => {
    const definition = getSectionDefinition("quantity-offer")!;
    const liquid = definition.renderLiquid(quantityOffer());
    const web = definition.renderWeb({ section: quantityOffer(), pageName: "Sérum" });

    expect(liquid).toContain("for product_variant in tier_product.variants");
    expect(liquid).toContain("product_variant.id | append: ''");
    expect(liquid).toContain("wf_requested_variant_id");
    expect(liquid).toContain("tier_variant.available == false");
    expect(liquid).toContain('data-wf-variant-id="{{ tier_variant.id | escape }}"');
    expect(liquid).not.toContain("block.settings.variant_id | default: selected_product");
    expect(web).not.toContain('data-wf-variant-id="445566"');
  });

  it("synchronizes the chosen tier variant into the submitted Shopify id", () => {
    expect(productRuntime).toHaveProperty("syncQuantityTierVariant");
    const synchronize = (productRuntime as unknown as { syncQuantityTierVariant(form: { querySelector: (selector: string) => { value: string } | null }, choice: { dataset: Record<string, string> }): boolean }).syncQuantityTierVariant;
    const id = { value: "first-variant" };
    const changed = synchronize({ querySelector: () => id }, { dataset: { wfVariantId: "445566" } });

    expect(changed).toBe(true);
    expect(id.value).toBe("445566");
  });

  it("keeps a native checkout lock explicit for mixed offers", () => {
    expect(productRuntime).toHaveProperty("isNativeCheckoutLocked");
    const locked = (productRuntime as unknown as { isNativeCheckoutLocked(root: { dataset: Record<string, string> }): boolean }).isNativeCheckoutLocked;
    expect(locked({ dataset: { wfNativeCheckoutLocked: "true" } })).toBe(true);
    expect(locked({ dataset: { wfNativeCheckoutLocked: "false" } })).toBe(false);
  });
});
