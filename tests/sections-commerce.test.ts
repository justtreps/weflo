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

  it("renders collection blocks as navigation cards without product commerce controls", () => {
    const definition = commerceSections.find((item) => item.type === "collectionGrid")!;
    const blocks: EditorSection["blocks"] = [
      { id: "linge", type: "item", settings: { title: "Linge", text: "Maison douce", image: "https://cdn.example/linge.jpg", link: "/collections/linge" } },
      { id: "lumiere", type: "item", settings: { title: "Lumière", text: "Objets lumineux", image: "", link: "/collections/lumiere" } },
    ];
    const web = render("collectionGrid", blocks);
    const liquid = definition.renderLiquid();

    expect(web).toContain("Linge");
    expect(web).toContain("Lumière");
    expect(web).toContain("/collections/linge");
    expect(web).not.toMatch(/<form|name=["'](?:id|quantity)["']|\/cart\/add/);
    expect(liquid).toContain("for block in section.blocks");
    expect(liquid).toContain("block.settings.title");
    expect(liquid).not.toMatch(/selected_collection\.products|name=["'](?:id|quantity)["']/);
  });

  it("ships Shopify Liquid bindings without credentials", () => {
    for (const definition of commerceSections) {
      const liquid = definition.renderLiquid();
      expect(liquid).toContain("section.settings");
      expect(liquid).not.toMatch(/access[_-]?token|password/i);
    }
  });
});
