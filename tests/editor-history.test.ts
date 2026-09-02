import { describe, expect, it } from "vitest";
import { createHistory, dispatch, redo, undo } from "../src/editor/history";
import type { EditorDocument } from "../src/editor/document";

function document(): EditorDocument {
  return {
    version: 2, name: "History", path: "/history", kind: "landing", assets: [],
    theme: { background: "#fff", surface: "#fff", ink: "#111", muted: "#777", accent: "#fc3", display: "sans", radius: "soft" },
    pages: [{ id: "p1", name: "History", slug: "history", sections: [{ id: "s1", type: "hero", name: "Hero", hidden: false, locked: false, settings: { title: "A" }, style: {}, responsive: {}, blocks: [] }] }],
  };
}

describe("editor history", () => {
  it("undoes, redoes and clears redo after a new command", () => {
    const initial = createHistory(document());
    const changed = dispatch(initial, { type: "updateSetting", sectionId: "s1", key: "title", value: "B" });
    expect(changed.present.pages[0].sections[0].settings.title).toBe("B");
    const undone = undo(changed);
    expect(undone.present.pages[0].sections[0].settings.title).toBe("A");
    expect(redo(undone).present.pages[0].sections[0].settings.title).toBe("B");
    const branched = dispatch(undone, { type: "updateSetting", sectionId: "s1", key: "title", value: "C" });
    expect(branched.future).toHaveLength(0);
  });

  it("keeps at most 100 undo states", () => {
    let history = createHistory(document());
    for (let index = 0; index < 105; index += 1) {
      history = dispatch(history, { type: "updateSetting", sectionId: "s1", key: "title", value: `V${index}` });
    }
    expect(history.past).toHaveLength(100);
  });
});
