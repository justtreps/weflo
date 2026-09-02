import { describe, expect, it } from "vitest";
import type { EditorCommand } from "../src/editor/commands";
import { applyCommand, invertCommand } from "../src/editor/commands";
import type { EditorDocument, EditorSection } from "../src/editor/document";

function section(id: string): EditorSection {
  return {
    id, type: "hero", name: id, hidden: false, locked: false,
    settings: { title: id }, style: {}, responsive: {},
    blocks: [
      { id: `${id}-b1`, type: "text", settings: { text: "A" } },
      { id: `${id}-b2`, type: "text", settings: { text: "B" } },
    ],
  };
}

function document(): EditorDocument {
  return {
    version: 2, name: "Test", path: "/test", kind: "landing",
    theme: { background: "#fff", surface: "#fff", ink: "#111", muted: "#777", accent: "#fc3", display: "sans", radius: "soft" },
    assets: [],
    pages: [{ id: "p1", name: "Test", slug: "test", sections: [section("s1"), section("s2")] }],
  };
}

describe("editor commands", () => {
  const cases: Array<{ name: string; command: EditorCommand; verify(after: EditorDocument): void }> = [
    { name: "insert section", command: { type: "insertSection", pageId: "p1", index: 1, section: section("s3") }, verify: (d) => expect(d.pages[0].sections.map(s => s.id)).toEqual(["s1", "s3", "s2"]) },
    { name: "move section", command: { type: "moveSection", sectionId: "s1", toPageId: "p1", toIndex: 2 }, verify: (d) => expect(d.pages[0].sections.map(s => s.id)).toEqual(["s2", "s1"]) },
    { name: "update setting", command: { type: "updateSetting", sectionId: "s1", key: "title", value: "Changed" }, verify: (d) => expect(d.pages[0].sections[0].settings.title).toBe("Changed") },
    { name: "update style", command: { type: "updateStyle", sectionId: "s1", key: "paddingTop", value: 80 }, verify: (d) => expect(d.pages[0].sections[0].style.paddingTop).toBe(80) },
    { name: "duplicate section", command: { type: "duplicateSection", sectionId: "s1", newSectionId: "s1-copy", index: 1 }, verify: (d) => expect(d.pages[0].sections[1].id).toBe("s1-copy") },
    { name: "remove section", command: { type: "removeSection", sectionId: "s1" }, verify: (d) => expect(d.pages[0].sections.map(s => s.id)).toEqual(["s2"]) },
    { name: "toggle hidden", command: { type: "toggleHidden", sectionId: "s1" }, verify: (d) => expect(d.pages[0].sections[0].hidden).toBe(true) },
    { name: "toggle locked", command: { type: "toggleLocked", sectionId: "s1" }, verify: (d) => expect(d.pages[0].sections[0].locked).toBe(true) },
    { name: "insert block", command: { type: "insertBlock", sectionId: "s1", index: 1, block: { id: "new-block", type: "button", settings: { label: "Go" } } }, verify: (d) => expect(d.pages[0].sections[0].blocks[1].id).toBe("new-block") },
    { name: "move block", command: { type: "moveBlock", sectionId: "s1", blockId: "s1-b1", toIndex: 2 }, verify: (d) => expect(d.pages[0].sections[0].blocks.map(b => b.id)).toEqual(["s1-b2", "s1-b1"]) },
    { name: "remove block", command: { type: "removeBlock", sectionId: "s1", blockId: "s1-b1" }, verify: (d) => expect(d.pages[0].sections[0].blocks.map(b => b.id)).toEqual(["s1-b2"]) },
  ];

  for (const entry of cases) {
    it(`${entry.name} and reverses it exactly`, () => {
      const before = document();
      const after = applyCommand(before, entry.command);
      entry.verify(after);
      expect(applyCommand(after, invertCommand(before, entry.command))).toEqual(before);
      expect(after).not.toBe(before);
    });
  }

  it("rejects edits on locked sections and duplicate ids", () => {
    const locked = applyCommand(document(), { type: "toggleLocked", sectionId: "s1" });
    expect(() => applyCommand(locked, { type: "updateSetting", sectionId: "s1", key: "title", value: "No" })).toThrow("Section is locked: s1");
    expect(() => applyCommand(document(), { type: "insertSection", pageId: "p1", index: 0, section: section("s2") })).toThrow("Duplicate section id: s2");
  });
});
