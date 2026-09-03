import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { parseCanvasBridgeMessage } from "../src/editor/ui/canvas-bridge";
import { CANVAS_RUNTIME, keyboardMoveDirection } from "../src/editor/ui/canvas-runtime";
import { blockDropTarget, pointerDropPosition, sectionDropTarget } from "../src/editor/ui/drag-sections";
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
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:select", sectionId: "hero-1", blockId: "duo" })).toEqual({ type: "select", sectionId: "hero-1", blockId: "duo" });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:inline-edit", sectionId: "hero-1", key: "title", value: "Nouveau titre" })).toEqual({ type: "inlineEdit", sectionId: "hero-1", key: "title", value: "Nouveau titre" });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:move", sectionId: "hero-1", toIndex: 3 })).toEqual({ type: "move", sectionId: "hero-1", toIndex: 3 });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "duo", toIndex: 2 })).toEqual({ type: "blockMove", sectionId: "quantity-offer-1", blockId: "duo", toIndex: 2 });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:action", sectionId: "hero-1", action: "hide" })).toEqual({ type: "action", sectionId: "hero-1", action: "hide" });
  });

  it("resolves section drops before or after the pointer midpoint", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    document.pages[0].id = "home";
    document.pages[0].sections = document.pages[0].sections.slice(1);
    document.pages[0].sections[1].id = "proof-1";

    expect(pointerDropPosition(149, { top: 100, height: 100 })).toBe("before");
    expect(pointerDropPosition(150, { top: 100, height: 100 })).toBe("after");
    expect(sectionDropTarget(document, "hero-1", "proof-1", false)).toEqual({ pageId: "home", toIndex: 1 });
    expect(sectionDropTarget(document, "hero-1", "proof-1", true)).toEqual({ pageId: "home", toIndex: 2 });
  });

  it("keeps offer-tier drop targets scoped to their parent section", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    document.pages[0].sections.push({
      id: "quantity-offer-1",
      type: "quantity-offer",
      name: "Offre quantité",
      hidden: false,
      locked: false,
      settings: {},
      style: {},
      responsive: {},
      blocks: [
        { id: "solo", type: "offer-tier", settings: {} },
        { id: "duo", type: "offer-tier", settings: {} },
        { id: "trio", type: "offer-tier", settings: {} },
      ],
    });
    document.pages[0].sections.push({
      id: "quantity-offer-2",
      type: "quantity-offer",
      name: "Autre offre",
      hidden: false,
      locked: false,
      settings: {},
      style: {},
      responsive: {},
      blocks: [{ id: "family", type: "offer-tier", settings: {} }],
    });

    expect(blockDropTarget(document, "quantity-offer-1", "solo", "quantity-offer-1", "duo", false)).toEqual({ sectionId: "quantity-offer-1", toIndex: 1 });
    expect(blockDropTarget(document, "quantity-offer-1", "solo", "quantity-offer-1", "duo", true)).toEqual({ sectionId: "quantity-offer-1", toIndex: 2 });
    expect(blockDropTarget(document, "quantity-offer-1", "solo", "quantity-offer-2", "family", false)).toBeNull();
  });

  it("moves only the section or tier that owns keyboard focus", () => {
    expect(keyboardMoveDirection("ArrowUp", true, true)).toBe(-1);
    expect(keyboardMoveDirection("ArrowDown", true, true)).toBe(1);
    expect(keyboardMoveDirection("ArrowUp", false, true)).toBeNull();
    expect(keyboardMoveDirection("ArrowUp", true, false)).toBeNull();
  });

  it("installs edit, drag and selection behavior in the iframe runtime", () => {
    const script = CANVAS_RUNTIME.slice(CANVAS_RUNTIME.indexOf("<script>") + 8, CANVAS_RUNTIME.lastIndexOf("</script>"));
    expect(() => new Function(script)).not.toThrow();
    expect(CANVAS_RUNTIME).toContain("contenteditable");
    expect(CANVAS_RUNTIME).toContain("dragstart");
    expect(CANVAS_RUNTIME).toContain("canvas:inline-edit");
    expect(CANVAS_RUNTIME).toContain("canvas:move");
    expect(CANVAS_RUNTIME).toContain("canvas:block-move");
    expect(CANVAS_RUNTIME).toContain("data-wf-drop-position");
    expect(CANVAS_RUNTIME).toContain("dragend");
    expect(CANVAS_RUNTIME).toContain("canvas:image-edit");
  });

  it("parses a direct image editing request", () => {
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:image-edit", sectionId: "hero-1", key: "image" })).toEqual({ type: "imageEdit", sectionId: "hero-1", key: "image" });
  });
});
