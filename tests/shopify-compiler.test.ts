import { describe, expect, it } from "vitest";
import { compileShopifyPage } from "../src/shopify/compiler";
import { buildModelDocument } from "../src/models/model-manifest";

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
});
