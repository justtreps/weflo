import { describe, expect, it } from "vitest";
import { createEditorStore } from "../src/editor/ui/store";
import { editorShellMarkup, runEditorShellAction } from "../src/editor/ui/shell";
import { migrateDocument } from "../src/editor/migrate";
import { blankDocument } from "../src/lib/catalog";

function state() {
  return {
    document: migrateDocument(blankDocument("Page produit"), "product"),
    pageId: "page-page-produit",
    selectedId: null,
    activePanel: "structure" as const,
    breakpoint: "desktop" as const,
    mode: "edit" as const,
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved" as const,
  };
}

describe("visual editor shell", () => {
  it("renders all stable non-overlapping editor regions", () => {
    const html = editorShellMarkup(state());
    for (const region of ["topbar", "left-rail", "sidebar", "canvas", "inspector", "canardo"]) {
      expect(html).toContain(`data-editor-${region}`);
    }
    expect(html).toContain('aria-label="Outils de l’éditeur"');
    expect(html).toContain('data-active-panel="structure"');
  });

  it("updates state immutably and notifies subscribers", () => {
    const store = createEditorStore(state());
    const seen: string[] = [];
    store.subscribe((next) => seen.push(next.breakpoint));

    store.setState({ breakpoint: "mobile" });

    expect(store.getState().breakpoint).toBe("mobile");
    expect(seen).toEqual(["mobile"]);
  });

  it("controls viewport, preview, panels and undo redo from the topbar", () => {
    const store = createEditorStore(state());
    store.dispatch({ type: "updateSetting", sectionId: "hero-1", key: "title", value: "Changed" });
    runEditorShellAction(store, "undo");
    expect(store.getState().document.pages[0].sections[1].settings.title).toBe("Ton idée commence ici");
    runEditorShellAction(store, "redo");
    expect(store.getState().document.pages[0].sections[1].settings.title).toBe("Changed");
    runEditorShellAction(store, "mobile");
    runEditorShellAction(store, "preview");
    runEditorShellAction(store, "collapseLeft");
    expect(store.getState()).toMatchObject({ breakpoint: "mobile", mode: "preview", leftCollapsed: true });
  });
});
