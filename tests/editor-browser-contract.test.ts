import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { editorSaveRequest, visualEditorInitialState } from "../src/hydrate/editor-v2";
import { parseCanvasBridgeMessage } from "../src/editor/ui/canvas-bridge";
import { runCanvasMoveAction } from "../src/editor/ui/canvas";
import { createEditorStore } from "../src/editor/ui/store";

describe("visual editor browser contract", () => {
  it("creates an editable state from the normalized API page", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    const state = visualEditorInitialState({ id: "pg_1", name: "Boutique", slug: "boutique", status: "draft", documentVersion: 3, document });
    expect(state.document.version).toBe(2);
    expect(state.pageId).toBe(document.pages[0].id);
    expect(state.breakpoint).toBe("desktop");
    expect(state.activePanel).toBe("commerce");
  });

  it("saves the v2 document with its expected server version", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    const request = editorSaveRequest(document, 7);
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(String(request.body))).toEqual({ document, name: "Boutique", expectedVersion: 7 });
  });

  it("accepts scoped canvas tier moves and applies them immutably", () => {
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
        { id: "cross-sell", type: "upsell", settings: {} },
        { id: "duo", type: "offer-tier", settings: {} },
      ],
    });
    const scenarios = [
      { name: "avant", blockId: "duo", targetBlockId: "solo", after: false, expected: ["duo", "solo", "cross-sell"] },
      { name: "après", blockId: "solo", targetBlockId: "duo", after: true, expected: ["cross-sell", "duo", "solo"] },
      { name: "haut", blockId: "duo", targetBlockId: "solo", after: false, expected: ["duo", "solo", "cross-sell"] },
      { name: "bas", blockId: "solo", targetBlockId: "duo", after: true, expected: ["cross-sell", "duo", "solo"] },
    ];

    for (const scenario of scenarios) {
      const store = createEditorStore(visualEditorInitialState({ id: "pg_1", name: "Boutique", slug: "boutique", status: "draft", documentVersion: 3, document }));
      const action = parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: scenario.blockId, targetBlockId: scenario.targetBlockId, after: scenario.after });
      expect(action, scenario.name).toEqual({ type: "blockMove", sectionId: "quantity-offer-1", blockId: scenario.blockId, targetBlockId: scenario.targetBlockId, after: scenario.after });
      if (!action || action.type !== "blockMove") throw new Error("Déplacement de palier non reconnu");

      runCanvasMoveAction(store, action);

      expect(store.getState().document.pages[0].sections.at(-1)?.blocks.map((block) => block.id), scenario.name).toEqual(scenario.expected);
      expect(store.getState().selectedId).toBe("quantity-offer-1");
      expect(store.getState().selectedBlockId).toBe(scenario.blockId);
    }
    expect(document.pages[0].sections.at(-1)?.blocks.map((block) => block.id)).toEqual(["solo", "cross-sell", "duo"]);
  });

  it("rejects malformed canvas tier moves", () => {
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "<duo>", targetBlockId: "solo", after: false })).toBeNull();
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "duo", targetBlockId: "<solo>", after: false })).toBeNull();
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "duo", targetBlockId: "solo", after: "false" })).toBeNull();
  });
});
