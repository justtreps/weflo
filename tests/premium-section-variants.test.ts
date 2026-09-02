import { describe, expect, it } from "vitest";
import { productHeroSection } from "../src/sections/product-hero";
import { productMainSection } from "../src/sections/product-main";
import { reviewsSection } from "../src/sections/reviews";
import type { EditorSection } from "../src/editor/document";
import { renderKnownSection } from "../src/editor/render/render-section";

function section(type: string, variant: string): EditorSection {
  return { id: "s1", type, name: type, hidden: false, locked: false, style: {}, responsive: {}, blocks: [{ id: "v1", type: "variant", settings: { title: "Noir", variant_id: "123", price: "49 €" } }], settings: { title: "Lampe", subtitle: "Sans fil", text: "Une lumière chaleureuse.", image: "https://cdn.example/lamp.jpg", price: "49 €", compare_at_price: "69 €", cta_label: "Ajouter au panier", cta_link: "#product", product_handle: "lampe", variant } };
}

describe("premium section variants", () => {
  it("renders materially distinct hero compositions", () => {
    const ambient = productHeroSection.renderWeb({ section: section("productHero", "ambient-editorial"), pageName: "Lampe" });
    const direct = productHeroSection.renderWeb({ section: section("productHero", "problem-solution"), pageName: "Lampe" });
    expect(ambient).toContain("wf-hero__atmosphere");
    expect(direct).toContain("wf-hero__problem");
    expect(ambient).not.toBe(direct);
  });

  it("renders a complete editable buy box on web and Shopify", () => {
    const value = section("productMain", "calm-buy-box");
    const web = productMainSection.renderWeb({ section: value, pageName: "Lampe" });
    const liquid = productMainSection.renderLiquid(value);
    for (const fragment of ["wf-product__gallery", "compare_at_price", "quantity", "wf-product__bundle", "wf-product__trust", "wf-product__sticky"]) expect(web).toContain(fragment);
    for (const fragment of ["selected_product", "compare_at_price", "quantity", "product.variants", "wf-product__sticky"]) expect(liquid).toContain(fragment);
  });

  it("keeps the premium variant structure in the visual editor", () => {
    expect(renderKnownSection(section("productHero", "ambient-editorial"), "Lampe")).toContain("wf-v2-hero--ambient-editorial");
    const product = renderKnownSection(section("productMain", "calm-buy-box"), "Lampe");
    expect(product).toContain("wf-v2-product__gallery");
    expect(product).toContain("wf-v2-product__sticky");
  });

  it("changes proof hierarchy between editorial stories and result walls", () => {
    const stories = reviewsSection.renderWeb({ section: section("reviews", "home-stories"), pageName: "Lampe" });
    const results = reviewsSection.renderWeb({ section: section("reviews", "results-wall"), pageName: "Lampe" });
    expect(stories).toContain("wf-proof__stories");
    expect(results).toContain("wf-proof__results");
    expect(stories).not.toBe(results);
  });
});
