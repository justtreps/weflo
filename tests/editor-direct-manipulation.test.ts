import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { parseCanvasBridgeMessage } from "../src/editor/ui/canvas-bridge";
import { CANVAS_RUNTIME } from "../src/editor/ui/canvas-runtime";
import { selectionToolbarMarkup } from "../src/editor/ui/selection-overlay";

describe("direct canvas manipulation", () => {
  it("marks editable copy and renders contextual section actions", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    const html = renderEditorDocument(document, { mode: "edit", breakpoint: "desktop" });
    expect(html).toContain('data-wf-edit-key="title"');
    expect(selectionToolbarMarkup("hero-1")).toContain('data-canvas-action="duplicate"');
    expect(selectionToolbarMarkup("hero-1")).toContain('data-canvas-action="remove"');
  });

  it("parses inline edit, reorder and toolbar messages", () => {
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:inline-edit", sectionId: "hero-1", key: "title", value: "Nouveau titre" })).toEqual({ type: "inlineEdit", sectionId: "hero-1", key: "title", value: "Nouveau titre" });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:move", sectionId: "hero-1", toIndex: 3 })).toEqual({ type: "move", sectionId: "hero-1", toIndex: 3 });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:action", sectionId: "hero-1", action: "hide" })).toEqual({ type: "action", sectionId: "hero-1", action: "hide" });
  });

  it("installs edit, drag and selection behavior in the iframe runtime", () => {
    expect(CANVAS_RUNTIME).toContain("contenteditable");
    expect(CANVAS_RUNTIME).toContain("dragstart");
    expect(CANVAS_RUNTIME).toContain("canvas:inline-edit");
    expect(CANVAS_RUNTIME).toContain("canvas:move");
  });
});
