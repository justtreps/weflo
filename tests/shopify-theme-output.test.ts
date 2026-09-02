import { describe, expect, it } from "vitest";
import { validateThemeOutput } from "../src/shopify/validate-theme-output";
import type { CompiledThemeFile } from "../src/shopify/compiler";

const file = (key: string, value: string): CompiledThemeFile => ({ key, value, checksum: "x", operation: "upsert" });
const liquid = `<section>OK</section>{% schema %}{"name":"Hero","settings":[],"blocks":[],"presets":[{"name":"Hero"}]}{% endschema %}`;

describe("Shopify theme output validation", () => {
  it("accepts a complete namespaced section and template", () => {
    const result = validateThemeOutput([
      file("sections/weflo-hero.liquid", liquid),
      file("templates/page.weflo-shop.json", JSON.stringify({ sections: { hero: { type: "weflo-hero", settings: {} } }, order: ["hero"] })),
      file("assets/weflo-shop.css", ".wf-section{}"),
    ]);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("rejects duplicates, foreign assets, malformed JSON and schemas without presets", () => {
    const result = validateThemeOutput([
      file("sections/hero.liquid", `{% schema %}{"name":"Hero"}{% endschema %}`),
      file("sections/hero.liquid", "duplicate"),
      file("templates/page.weflo-shop.json", "not json"),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/doublon|Weflo|JSON|preset/i);
  });

  it("rejects templates that reference missing Weflo sections", () => {
    const result = validateThemeOutput([file("templates/page.weflo-shop.json", JSON.stringify({ sections: { hero: { type: "weflo-missing" } }, order: ["hero"] }))]);
    expect(result.errors.join(" ")).toMatch(/introuvable/i);
  });
});
