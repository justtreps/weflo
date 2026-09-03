import { describe, expect, it } from "vitest";
import { validateEditorDocument } from "../src/editor/schema";
import type { EditorDocument } from "../src/editor/document";

const document = (): EditorDocument => ({
  version: 2,
  name: "Accueil",
  path: "/",
  kind: "home",
  theme: { background: "#fff", surface: "#fff", ink: "#111", muted: "#777", accent: "#fc0", display: "sans", radius: "soft" },
  pages: [{ id: "page-home", name: "Accueil", slug: "accueil", sections: [] }],
  assets: [],
});

describe("editor schema template provenance", () => {
  it("keeps provenance optional for existing v2 documents", () => {
    expect(validateEditorDocument(document())).toMatchObject({ ok: true });
  });

  it("rejects malformed template provenance", () => {
    const invalidId = { ...document(), templateId: 42 };
    const invalidVersion = { ...document(), templateId: "home-brand-editorial", templateVersion: 0 };
    expect(validateEditorDocument(invalidId)).toMatchObject({ ok: false });
    expect(validateEditorDocument(invalidVersion)).toMatchObject({ ok: false });
  });

  it("accepts a legacy collection handle and rejects non-text handles", () => {
    const valid = document();
    valid.pages[0].sections.push({
      id: "collection-1",
      type: "collectionGrid",
      name: "Collection",
      hidden: false,
      locked: false,
      settings: { collection_handle: "nouveautes" },
      style: {},
      responsive: {},
      blocks: [],
    });
    const invalid = structuredClone(valid) as unknown as EditorDocument;
    invalid.pages[0].sections[0].settings.collection_handle = ["nouveautes"];

    expect(validateEditorDocument(valid)).toMatchObject({ ok: true });
    expect(validateEditorDocument(invalid)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining(["Invalid Shopify collection handle: collection-1"]),
    });
  });
});
