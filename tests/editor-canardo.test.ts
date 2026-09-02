import { describe, expect, it } from "vitest";
import { buildModelDocument } from "../src/models/model-manifest";
import { canardoRequest, isConsequentialCanardoResponse, applyCanardoDocument } from "../src/editor/ui/canardo";
import { createEditorStore } from "../src/editor/ui/store";

describe("editor Canardo workflow", () => {
  it("builds a focused request with the selection", () => {
    expect(JSON.parse(String(canardoRequest("Change le titre", "hero-1").body))).toEqual({ prompt: "Change le titre", selectedId: "hero-1" });
  });

  it("recognizes changes requiring explicit review", () => {
    expect(isConsequentialCanardoResponse({ requiresConfirmation: true })).toBe(true);
    expect(isConsequentialCanardoResponse({ requiresConfirmation: false })).toBe(false);
  });

  it("applies a generated document as one undoable history step", () => {
    const document = buildModelDocument("proteo", "Shop");
    const store = createEditorStore({ document, pageId: document.pages[0].id, selectedId: null, activePanel: "structure", breakpoint: "desktop", mode: "edit", leftCollapsed: false, rightCollapsed: false, saveStatus: "saved" });
    const next = structuredClone(document);
    next.pages[0].sections[2].settings.title = "Nouveau";
    applyCanardoDocument(store, next);
    expect(store.getState().document.pages[0].sections[2].settings.title).toBe("Nouveau");
    store.undo();
    expect(store.getState().document.pages[0].sections[2].settings.title).not.toBe("Nouveau");
  });
});
