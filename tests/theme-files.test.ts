import { describe, expect, it } from "vitest";
import {
  collectThemeFiles,
  documentToTemplateJson,
  shopifySectionType,
  shopifyThemeAssets,
} from "../src/lib/theme-files";
import { initialDocument } from "../src/lib/catalog";

describe("collectThemeFiles", () => {
  it("includes OS 2.0 layout, sections and assets", () => {
    const keys = collectThemeFiles().map((f) => f.key);
    expect(keys).toContain("layout/theme.liquid");
    expect(keys).toContain("sections/product-hero.liquid");
    expect(keys).toContain("assets/theme.css");
    expect(keys).toContain("templates/product.json");
  });
});

describe("documentToTemplateJson", () => {
  it("maps sell sections to a Shopify JSON product template", () => {
    const doc = initialDocument("Bougie", "sell");
    const hero = doc.sections.find((s) => s.type === "productHero");
    if (hero) hero.settings = { ...hero.settings, title: "Bougie figue", price: "29", image: "https://img.test/b.jpg" };
    const json = JSON.parse(documentToTemplateJson(doc, "product"));
    const mapped = Object.values(json.sections as Record<string, { type: string; settings: { heading: string } }>).find(
      (s) => s.type === "product-hero",
    );
    expect(json.order.length).toBeGreaterThanOrEqual(6);
    expect(mapped?.type).toBe("product-hero");
    expect(mapped?.settings.heading).toBe("Bougie figue");
    expect(json.sections.navigation).toBeUndefined();
  });

  it("keeps every content section with unique keys", () => {
    const doc = initialDocument("Bougie", "sell");
    doc.sections.push({ id: "cta-extra", type: "cta", settings: { title: "Second CTA" } });
    const json = JSON.parse(documentToTemplateJson(doc, "product"));
    const ctas = Object.values(json.sections as Record<string, { type: string }>).filter((s) => s.type === "cta");
    expect(ctas.length).toBe(2);
    expect(new Set(json.order as string[]).size).toBe((json.order as string[]).length);
  });
});

describe("shopifyThemeAssets", () => {
  it("uploads a full OS 2.0 theme plus document templates", () => {
    const doc = initialDocument("Bougie", "sell");
    const keys = shopifyThemeAssets(doc).map((f) => f.key);
    expect(keys).toContain("layout/theme.liquid");
    expect(keys).toContain("sections/faq.liquid");
    expect(keys).toContain("sections/reviews.liquid");
    expect(keys).toContain("templates/product.json");
    expect(keys).toContain("templates/index.json");
    expect(keys).toContain("templates/page.weflo.json");
  });
});

describe("shopifySectionType", () => {
  it("uses hyphenated Shopify section filenames", () => {
    expect(shopifySectionType("productHero")).toBe("product-hero");
    expect(shopifySectionType("collectionGrid")).toBe("collection-grid");
  });
});
