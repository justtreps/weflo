import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { editorSaveRequest, visualEditorInitialState } from "../src/hydrate/editor-v2";

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
});
