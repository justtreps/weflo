import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { conversionSections } from "../src/sections/conversion";

function render(type: string, blocks: EditorSection["blocks"] = []): string {
  const definition = conversionSections.find((item) => item.type === type)!;
  return definition.renderWeb({ section: { id: `${type}-1`, type, name: definition.name, hidden: false, locked: false, settings: { ...definition.defaults }, style: {}, responsive: {}, blocks }, pageName: "Page" });
}

describe("conversion and content sections", () => {
  it("includes the complete reusable conversion library", () => {
    expect(conversionSections).toHaveLength(15);
    expect(conversionSections.map((item) => item.type)).toEqual(expect.arrayContaining(["testimonials", "reviews", "faq", "form", "quiz", "cta", "footer"]));
    expect(conversionSections.every((item) => item.blocks.length > 0)).toBe(true);
  });

  it("uses accessible native disclosure, form and quiz controls", () => {
    const blocks = [{ id: "one", type: "item", settings: { title: "Question", text: "Réponse" } }];
    expect(render("faq", blocks)).toContain("<details>");
    expect(render("form")).toContain('<label>Email<input type="email"');
    expect(render("quiz", blocks)).toContain("<fieldset");
    expect(render("quiz", blocks)).toContain('type="radio"');
  });

  it("renders testimonial and review blocks with rating semantics", () => {
    const html = render("reviews", [{ id: "r1", type: "review", settings: { title: "Marie", text: "Excellent", rating: 5 } }]);
    expect(html).toContain('aria-label="5 étoiles sur 5"');
    expect(html).toContain("Excellent");
  });

  it("renders CTA links safely and Liquid for every section", () => {
    const html = render("cta");
    expect(html).toContain('href="#"');
    expect(conversionSections.every((item) => item.renderLiquid().includes("section.settings"))).toBe(true);
  });
});
