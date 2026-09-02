import type { AssetReference, EditorSection } from "../document";
import { addSectionPanel } from "./panels/add-section";
import { commercePanel } from "./panels/commerce";
import { layersPanel } from "./panels/layers";
import { mediaPanel } from "./panels/media";
import { pagesPanel } from "./panels/pages";
import { structurePanel } from "./panels/structure";
import type { EditorPanel, EditorState, EditorStore } from "./store";

export type PanelAction =
  | { action: "select" | "toggleHidden" | "toggleLocked"; sectionId: string }
  | { action: "insert"; sectionType: string }
  | { action: "selectPage"; pageId: string }
  | { action: "addPage"; name: string }
  | { action: "addAsset"; asset: AssetReference }
  | { action: "pickMedia"; assetId: string };

export function activateEditorPanel(store: EditorStore, panel: EditorPanel): void {
  store.setState({ activePanel: panel, leftCollapsed: false });
}

export function editorPanelMarkup(state: EditorState): string {
  switch (state.activePanel) {
    case "structure": return structurePanel(state);
    case "add": return addSectionPanel();
    case "layers": return layersPanel(state);
    case "pages": return pagesPanel(state);
    case "media": return mediaPanel(state);
    case "commerce": return commercePanel();
  }
}

function nextSection(state: EditorState, type: string): EditorSection {
  const used = new Set(state.document.pages.flatMap((page) => page.sections.map((section) => section.id)));
  let index = 1;
  while (used.has(`${type}-${index}`)) index += 1;
  return {
    id: `${type}-${index}`,
    type,
    name: type === "reviews" ? "Témoignages" : type === "productHero" ? "Produit" : type,
    hidden: false,
    locked: false,
    settings: { title: type === "reviews" ? "Ils en parlent mieux que nous" : "Nouvelle section" },
    style: {}, responsive: {}, blocks: [],
  };
}

export function runPanelAction(store: EditorStore, action: PanelAction): void {
  const state = store.getState();
  if (action.action === "select") store.setState({ selectedId: action.sectionId, rightCollapsed: false });
  if (action.action === "toggleHidden" || action.action === "toggleLocked") {
    store.dispatch({ type: action.action, sectionId: action.sectionId });
  }
  if (action.action === "selectPage") store.setState({ pageId: action.pageId, selectedId: null });
  if (action.action === "addPage") {
    const name = action.name.trim() || "Nouvelle page";
    const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
    const slugs = new Set(state.document.pages.map((page) => page.slug));
    let slug = base;
    let suffix = 2;
    while (slugs.has(slug)) slug = `${base}-${suffix++}`;
    const page = { id: `page-${slug}`, name, slug, sections: [] };
    store.setState({ document: { ...state.document, pages: [...state.document.pages, page] }, pageId: page.id, selectedId: null, saveStatus: "modified" });
  }
  if (action.action === "addAsset") {
    store.setState({ document: { ...state.document, assets: [...state.document.assets.filter((asset) => asset.id !== action.asset.id), action.asset] }, saveStatus: "modified" });
  }
  if (action.action === "pickMedia") {
    const asset = state.document.assets.find((item) => item.id === action.assetId);
    if (asset && state.selectedId) store.dispatch({ type: "updateSetting", sectionId: state.selectedId, key: "image", value: asset.url });
  }
  if (action.action === "insert") {
    const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
    const selectedIndex = page.sections.findIndex((section) => section.id === state.selectedId);
    const section = nextSection(state, action.sectionType);
    store.dispatch({ type: "insertSection", pageId: page.id, index: selectedIndex < 0 ? page.sections.length : selectedIndex + 1, section });
    store.setState({ selectedId: section.id, activePanel: "structure", rightCollapsed: false });
  }
}

export function bindLeftRail(root: HTMLElement, store: EditorStore): () => void {
  const click = (event: Event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-editor-panel-button],[data-panel-action]");
    if (!target) return;
    const panel = target.dataset.editorPanelButton as EditorPanel | undefined;
    if (panel) return activateEditorPanel(store, panel);
    const action = target.dataset.panelAction;
    const sectionId = target.dataset.sectionId;
    if ((action === "select" || action === "toggleHidden" || action === "toggleLocked") && sectionId) runPanelAction(store, { action, sectionId });
    if (action === "insert" && target.dataset.sectionType) runPanelAction(store, { action, sectionType: target.dataset.sectionType });
    if (action === "selectPage" && target.dataset.pageId) runPanelAction(store, { action, pageId: target.dataset.pageId });
    if (action === "addPage") runPanelAction(store, { action, name: window.prompt("Nom de la page", "Nouvelle page") ?? "Nouvelle page" });
    if (action === "pickMedia" && target.dataset.assetId) runPanelAction(store, { action, assetId: target.dataset.assetId });
    if (action === "uploadMedia") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,video/*";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (typeof reader.result !== "string") return;
          runPanelAction(store, { action: "addAsset", asset: { id: `asset-${Date.now()}`, type: file.type.startsWith("video/") ? "video" : "image", url: reader.result, alt: file.name } });
        });
        reader.readAsDataURL(file);
      });
      input.click();
    }
  };
  root.addEventListener("click", click);
  return () => root.removeEventListener("click", click);
}
