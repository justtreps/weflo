import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { applyInspectorValue, inspectorChangeFromControl, inspectorMarkup } from "../src/editor/ui/inspector";
import { createEditorStore } from "../src/editor/ui/store";

function store(selected = true) {
  const document = migrateDocument(blankDocument("Boutique"));
  return createEditorStore({
    document,
    pageId: document.pages[0].id,
    selectedId: selected ? document.pages[0].sections[1].id : null,
    activePanel: "structure",
    breakpoint: "desktop",
    mode: "edit",
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved",
  });
}

describe("section inspector", () => {
  it("renders contextual content style layout responsive and animation controls", () => {
    const html = inspectorMarkup(store().getState());
    for (const tab of ["Contenu", "Style", "Disposition", "Responsive", "Animation"]) expect(html).toContain(tab);
    expect(html).toContain('data-inspector-key="title"');
    expect(html).toContain('data-inspector-control="color"');
  });

  it("updates settings, base styles and mobile overrides immediately", () => {
    const editor = store();
    applyInspectorValue(editor, { scope: "settings", key: "title", value: "Nouveau titre" });
    applyInspectorValue(editor, { scope: "style", key: "paddingTop", value: 96 });
    applyInspectorValue(editor, { scope: "responsive", breakpoint: "mobile", key: "paddingTop", value: 28 });
    const section = editor.getState().document.pages[0].sections[1];
    expect(section.settings.title).toBe("Nouveau titre");
    expect(section.style.paddingTop).toBe(96);
    expect(section.responsive.mobile?.paddingTop).toBe(28);
  });

  it("shows a directional empty state and rejects invalid colors", () => {
    expect(inspectorMarkup(store(false).getState())).toContain("Sélectionne une section");
    expect(() => applyInspectorValue(store(), { scope: "style", key: "backgroundColor", value: "red; color: blue" })).toThrow("Invalid color");
  });

  it("normalizes browser control values before applying them", () => {
    expect(inspectorChangeFromControl({ scope: "style", key: "paddingTop", type: "number", value: "48", checked: false, breakpoint: "mobile" })).toEqual({ scope: "style", key: "paddingTop", value: 48, breakpoint: "mobile" });
    expect(inspectorChangeFromControl({ scope: "settings", key: "enabled", type: "toggle", value: "", checked: true, breakpoint: "desktop" })?.value).toBe(true);
  });
});
