import { describe, expect, it } from "vitest";
import { compileShopifyPage } from "../src/shopify/compiler";
import { buildModelDocument } from "../src/models/model-manifest";
import { getSectionDefinition } from "../src/sections";

describe("Shopify document compiler", () => {
  it("creates deterministic namespaced files and an ordered alternate template", () => {
    const document = buildModelDocument("proteo", "Ma Page");
    const first = compileShopifyPage(document, { resource: "page" });
    const second = compileShopifyPage(document, { resource: "page" });
    expect(first).toEqual(second);
    expect(first.some((file) => file.key === "templates/page.weflo-proteo.json")).toBe(true);
    expect(first.some((file) => file.key === "assets/weflo-proteo.css")).toBe(true);
    const template = JSON.parse(first.find((file) => file.key.includes("templates/page."))!.value);
    expect(template.order).toHaveLength(document.pages[0].sections.length);
    expect(Object.keys(template.sections)).toEqual(template.order);
    expect(first.every((file) => /^[a-f0-9]{64}$/.test(file.checksum))).toBe(true);
  });

  it("compiles schema-valid Liquid for every used section type", () => {
    const files = compileShopifyPage(buildModelDocument("peau", "Soin"), { resource: "product" });
    const liquids = files.filter((file) => file.key.startsWith("sections/"));
    expect(liquids.length).toBeGreaterThan(5);
    for (const file of liquids) {
      expect(file.value).toContain("{% schema %}");
      const schema = file.value.match(/{% schema %}([\s\S]*?){% endschema %}/)?.[1];
      expect(() => JSON.parse(schema!)).not.toThrow();
    }
    expect(files.some((file) => file.key === "templates/product.weflo-peau.json")).toBe(true);
  });

  it("never replaces global index or product templates unless explicitly selected", () => {
    const document = buildModelDocument("proteo", "Shop");
    const keys = compileShopifyPage(document, { resource: "product" }).map((file) => file.key);
    expect(keys).not.toContain("templates/index.json");
    expect(keys).not.toContain("templates/product.json");
  });

  it("ships responsive premium commerce styles with the generated theme", () => {
    const files = compileShopifyPage(buildModelDocument("proteo", "Shop"), { resource: "product" });
    const css = files.find((file) => file.key.startsWith("assets/weflo-"))!.value;
    expect(css).toContain(".wf-product__gallery");
    expect(css).toContain(".wf-product__sticky");
    expect(css).toContain("@media(max-width:749px)");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("keeps a collection handle in JSON and compiles a handle-backed Liquid branch", () => {
    const document = buildModelDocument("proteo", "Shop");
    const definition = getSectionDefinition("collectionGrid")!;
    document.pages[0].sections.push({
      id: "collection-shopify",
      type: "collectionGrid",
      name: definition.name,
      hidden: false,
      locked: false,
      settings: { ...definition.defaults, collection_handle: "nouveautes" },
      style: {},
      responsive: {},
      blocks: [],
    });

    const files = compileShopifyPage(document, { resource: "home" });
    const liquidFile = files.find((file) => file.key.includes("collectiongrid.liquid"));
    expect(liquidFile).toBeTruthy();
    const liquid = liquidFile!.value;
    const template = JSON.parse(files.find((file) => file.key.startsWith("templates/page."))!.value);
    const collection = Object.values(template.sections as Record<string, { settings: Record<string, unknown> }>).find((section) => section.settings.collection_handle === "nouveautes");

    expect(collection?.settings.collection_handle).toBe("nouveautes");
    expect(liquid).toContain("for product in selected_collection.products");
    expect(liquid).toContain("for block in section.blocks");
  });

  it("publishes quantity offer tiers as Shopify blocks without preview prices", () => {
    const document = buildModelDocument("proteo", "Offres");
    const definition = getSectionDefinition("quantity-offer")!;
    document.pages[0].sections.push({
      id: "quantity-offer",
      type: definition.type,
      name: definition.name,
      hidden: false,
      locked: false,
      settings: { ...definition.defaults, product_handle: "proteo-serum" },
      style: {},
      responsive: {},
      blocks: [{ id: "duo", type: "offer-tier", settings: { title: "Duo", quantity: 2, discount_type: "percentage", discount_value: 15, variant_id: "445566" } }],
    });

    const files = compileShopifyPage(document, { resource: "product" });
    const liquid = files.find((file) => file.key.includes("quantity-offer.liquid"))!.value;
    const template = JSON.parse(files.find((file) => file.key.startsWith("templates/product."))!.value);
    const published = Object.values(template.sections as Record<string, { blocks?: Record<string, { type: string; settings: Record<string, unknown> }> }>).find((section) => section.blocks?.duo);

    expect(liquid).toContain("block.settings.quantity");
    expect(liquid).toContain("selected_product");
    expect(liquid).not.toContain("15% de réduction");
    expect(liquid).toContain('data-wf-block-id="{{ block.id }}"');
    expect(liquid).toContain("section.settings.subtitle");
    expect(liquid).toContain("section.settings.text");
    expect(liquid).not.toMatch(/{%\s*if[^%]*\(/);
    expect(published?.blocks?.duo.type).toBe("offer-tier");
    expect(files.find((file) => file.key === "assets/weflo-product-form.js")?.value).toContain("wfNativeCheckoutLocked");
  });

  it("keeps stable discount values with French Shopify labels", () => {
    const document = buildModelDocument("proteo", "Offres");
    const definition = getSectionDefinition("quantity-offer")!;
    document.pages[0].sections.push({ id: "quantity-offer", type: definition.type, name: definition.name, hidden: false, locked: false, settings: { ...definition.defaults }, style: {}, responsive: {}, blocks: [] });

    const liquid = compileShopifyPage(document, { resource: "product" }).find((file) => file.key.includes("quantity-offer.liquid"))!.value;
    const schema = JSON.parse(liquid.match(/{% schema %}([\s\S]*?){% endschema %}/)?.[1] ?? "{}");
    const discountType = schema.blocks[0].settings.find((setting: { id: string }) => setting.id === "discount_type");

    expect(discountType.options).toEqual([
      { value: "percentage", label: "Pourcentage" },
      { value: "amount", label: "Montant fixe" },
      { value: "none", label: "Aucune remise" },
    ]);
  });
});
