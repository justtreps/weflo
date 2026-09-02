import { describe, expect, it } from "vitest";
import { brandMediaSections } from "../src/sections/brand-media";
import type { EditorSection } from "../src/editor/document";

function section(type: string): EditorSection {
  const definition = brandMediaSections.find((item) => item.type === type)!;
  return { id: `${type}-1`, type, name: definition.name, hidden: false, locked: false, settings: { ...definition.defaults }, style: {}, responsive: {}, blocks: [] };
}

describe("brand and media sections", () => {
  it("ships all editable brand and media definitions", () => {
    expect(brandMediaSections.map((item) => item.type)).toEqual(["navigation", "announcement", "hero", "productHero", "videoHero", "gallery", "imageText", "beforeAfter"]);
    for (const definition of brandMediaSections) {
      expect(definition.settings.length).toBeGreaterThan(2);
      expect(definition.renderLiquid()).toContain("section.settings");
    }
  });

  it("renders semantic media, headings, links and useful empty states", () => {
    const hero = section("hero");
    hero.settings = { ...hero.settings, title: "Une marque forte", image: "/assets/hero.jpg", image_alt: "Produit vert", cta_label: "Découvrir", cta_link: "/collections/all" };
    const html = brandMediaSections.find((item) => item.type === "hero")!.renderWeb({ section: hero, pageName: "Home" });
    expect(html).toContain("<h1");
    expect(html).toContain('alt="Produit vert"');
    expect(html).toContain('href="/collections/all"');
    const empty = section("beforeAfter");
    expect(brandMediaSections.find((item) => item.type === "beforeAfter")!.renderWeb({ section: empty, pageName: "Home", editor: true })).toContain("wf-media-empty");
  });

  it("supports navigation and gallery blocks", () => {
    const navigation = section("navigation");
    navigation.blocks = [{ id: "link-1", type: "link", settings: { label: "Boutique", link: "/shop" } }];
    const navHtml = brandMediaSections[0].renderWeb({ section: navigation, pageName: "Home" });
    expect(navHtml).toContain("<nav");
    expect(navHtml).toContain("Boutique");
  });
});
