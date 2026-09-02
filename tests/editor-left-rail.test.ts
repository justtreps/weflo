import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { activateEditorPanel, editorPanelMarkup, runPanelAction } from "../src/editor/ui/left-rail";
import { createEditorStore, type EditorPanel } from "../src/editor/ui/store";

function store() {
  const document = migrateDocument(blankDocument("Boutique"));
  return createEditorStore({
    document,
    pageId: document.pages[0].id,
    selectedId: null,
    activePanel: "structure",
    breakpoint: "desktop",
    mode: "edit",
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved",
  });
}

describe("editor left rail", () => {
  for (const panel of ["structure", "add", "layers", "pages", "media", "commerce"] as EditorPanel[]) {
    it(`opens the ${panel} panel`, () => {
      const editor = store();
      activateEditorPanel(editor, panel);
      expect(editor.getState().activePanel).toBe(panel);
      expect(editor.getState().leftCollapsed).toBe(false);
      expect(editorPanelMarkup(editor.getState())).toContain(`data-panel="${panel}"`);
    });
  }

  it("selects a section, toggles visibility and inserts a section", () => {
    const editor = store();
    const hero = editor.getState().document.pages[0].sections[1];
    runPanelAction(editor, { action: "select", sectionId: hero.id });
    expect(editor.getState().selectedId).toBe(hero.id);

    runPanelAction(editor, { action: "toggleHidden", sectionId: hero.id });
    expect(editor.getState().document.pages[0].sections[1].hidden).toBe(true);

    runPanelAction(editor, { action: "insert", sectionType: "reviews" });
    expect(editor.getState().document.pages[0].sections[2].type).toBe("reviews");
    expect(editor.getState().saveStatus).toBe("modified");
  });

  it("inserts a selected premium variant without preview-only data", () => {
    const editor = store();
    runPanelAction(editor, { action: "insertVariant", sectionType: "productHero", variantId: "beauty-editorial" });
    const inserted = editor.getState().document.pages[0].sections.find((section) => section.settings.variant === "beauty-editorial");
    expect(inserted?.type).toBe("productHero");
    expect(JSON.stringify(inserted)).not.toMatch(/previewOnly|aurea-serum/);
  });

  it("explains how to connect Shopify when commerce is unavailable", () => {
    const editor = store();
    activateEditorPanel(editor, "commerce");
    expect(editorPanelMarkup(editor.getState())).toContain("Connexion et publication Shopify");
    expect(editorPanelMarkup(editor.getState())).toContain("/dashboard#shopify");
  });

  it("adds a page and assigns an imported image to the selected section", () => {
    const editor = store();
    const hero = editor.getState().document.pages[0].sections[1];
    runPanelAction(editor, { action: "addPage", name: "À propos" });
    expect(editor.getState().document.pages.map((page) => page.slug)).toEqual(["boutique", "a-propos"]);
    expect(editor.getState().pageId).toBe("page-a-propos");

    runPanelAction(editor, { action: "selectPage", pageId: "page-boutique" });
    runPanelAction(editor, { action: "select", sectionId: hero.id });
    runPanelAction(editor, { action: "addAsset", asset: { id: "asset-new", type: "image", url: "/uploads/product.webp", alt: "Produit" } });
    runPanelAction(editor, { action: "pickMedia", assetId: "asset-new" });
    expect(editor.getState().document.assets).toHaveLength(1);
    expect(editor.getState().document.pages[0].sections[1].settings.image).toBe("/uploads/product.webp");
  });
});
