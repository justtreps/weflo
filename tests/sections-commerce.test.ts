import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { commerceSections } from "../src/sections/commerce";

function render(type: string, blocks: EditorSection["blocks"] = []): string {
  const definition = commerceSections.find((item) => item.type === type)!;
  const section: EditorSection = { id: `${type}-1`, type, name: definition.name, hidden: false, locked: false, settings: { ...definition.defaults }, style: {}, responsive: {}, blocks };
  return definition.renderWeb({ section, pageName: "Produit" });
}

describe("commerce sections", () => {
  it("registers product, collection, bundle and comparison definitions", () => {
    expect(commerceSections.map((item) => item.type)).toEqual(["productMain", "productGrid", "collectionGrid", "bundle", "comparison", "ingredients"]);
  });

  it("renders an offline add-to-cart form with variant and quantity controls", () => {
    const html = render("productMain", [{ id: "variant-1", type: "variant", settings: { title: "Noir", variant_id: "123" } }]);
    expect(html).toContain("<form");
    expect(html).toContain('name="id"');
    expect(html).toContain('name="quantity"');
    expect(html).toContain('action="/cart/add"');
  });

  it("keeps bundle choices keyboard accessible and exposes a total", () => {
    const html = render("bundle", [{ id: "a", type: "product", settings: { title: "Produit A", price: "20,00 €" } }]);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("wf-bundle__total");
  });

  it("ships Shopify Liquid bindings without credentials", () => {
    for (const definition of commerceSections) {
      const liquid = definition.renderLiquid();
      expect(liquid).toContain("section.settings");
      expect(liquid).not.toMatch(/access[_-]?token|password/i);
    }
  });
});
