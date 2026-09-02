import { afterEach, describe, expect, it, vi } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { AutosaveConflictError, createEditorAutosave } from "../src/editor/ui/autosave";
import { createEditorStore } from "../src/editor/ui/store";

function editor() {
  const document = migrateDocument(blankDocument("Boutique"));
  return createEditorStore({ document, pageId: document.pages[0].id, selectedId: null, activePanel: "structure", breakpoint: "desktop", mode: "edit", leftCollapsed: false, rightCollapsed: false, saveStatus: "saved" });
}

afterEach(() => vi.useRealTimers());

describe("editor autosave", () => {
  it("stores a local draft immediately and saves to the server after 600ms", async () => {
    vi.useFakeTimers();
    const store = editor();
    const local = new Map<string, string>();
    const save = vi.fn(async () => ({ documentVersion: 2 }));
    const autosave = createEditorAutosave({ store, pageId: "pg_1", initialVersion: 1, save, draftStorage: { setItem: (key, value) => local.set(key, value), removeItem: (key) => local.delete(key) } });

    store.dispatch({ type: "updateSetting", sectionId: "hero-1", key: "title", value: "Nouveau" });
    expect(local.get("weflo-editor-draft:pg_1")).toContain("Nouveau");
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledOnce();
    expect(store.getState().saveStatus).toBe("saved");
    expect(autosave.version()).toBe(2);
    autosave.destroy();
  });

  it("shows a conflict without discarding the local document", async () => {
    vi.useFakeTimers();
    const store = editor();
    const save = vi.fn(async () => { throw new AutosaveConflictError({ name: "Serveur" }); });
    const autosave = createEditorAutosave({ store, pageId: "pg_1", initialVersion: 4, save });
    store.dispatch({ type: "updateSetting", sectionId: "hero-1", key: "title", value: "Local" });
    await vi.advanceTimersByTimeAsync(600);
    expect(store.getState().saveStatus).toBe("conflict");
    expect(store.getState().document.pages[0].sections[1].settings.title).toBe("Local");
    expect(autosave.conflict()?.name).toBe("Serveur");
    autosave.destroy();
  });
});
