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
});
