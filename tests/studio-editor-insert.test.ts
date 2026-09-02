import { describe, expect, it } from "vitest";
import { applyStudioImage } from "../src/editor/studio-insert";
import type { EditorDocument } from "../src/editor/document";

const document: EditorDocument = { version: 2, name: "Lampe", path: "/lampe", kind: "product", theme: { background: "#fff", surface: "#eee", ink: "#111", muted: "#777", accent: "#ffd000", display: "sans", radius: "soft" }, pages: [{ id: "ep_1", name: "Lampe", slug: "lampe", sections: [{ id: "hero_1", type: "hero", name: "Hero", hidden: false, locked: false, settings: { title: "Lampe" }, style: {}, responsive: {}, blocks: [] }] }], assets: [] };

describe("Studio image insertion", () => {
  it("adds a reusable asset and updates the selected section image", () => {
    const next = applyStudioImage(document, { imageUrl: "https://fal.media/lamp.webp", selectedSectionId: "hero_1" });
    expect(next.assets).toContainEqual(expect.objectContaining({ type: "image", url: "https://fal.media/lamp.webp" }));
    expect(next.pages[0].sections[0].settings.image).toBe("https://fal.media/lamp.webp");
    expect(document.assets).toHaveLength(0);
  });

  it("creates an editable image section when no compatible section is selected", () => {
    const next = applyStudioImage(document, { imageUrl: "https://fal.media/lamp.webp", selectedSectionId: null });
    expect(next.pages[0].sections.some((section) => section.type === "imageText" && section.settings.image === "https://fal.media/lamp.webp")).toBe(true);
  });
});
