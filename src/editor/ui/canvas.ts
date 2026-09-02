import type { EditorBreakpoint, EditorDocument } from "../document";
import { renderEditorDocument } from "../render/render-document";
import { parseCanvasBridgeMessage } from "./canvas-bridge";
import { CANVAS_RUNTIME } from "./canvas-runtime";
import type { EditorStore } from "./store";
import { sectionMoveTarget } from "./drag-sections";

export type CanvasOptions = {
  mode: "edit" | "preview";
  breakpoint: EditorBreakpoint;
  selectedId?: string | null;
};

export function viewportLayout(breakpoint: EditorBreakpoint, availableWidth: number): { width: number; zoom: number } {
  const available = Math.max(1, Math.floor(availableWidth));
  if (breakpoint === "desktop") {
    if (available >= 700) return { width: available, zoom: 1 };
    return { width: 1440, zoom: Number((available / 1440).toFixed(4)) };
  }
  const target = breakpoint === "tablet" ? 834 : 390;
  return available >= target ? { width: target, zoom: 1 } : { width: target, zoom: Number((available / target).toFixed(4)) };
}

export function canvasSrcdoc(document: EditorDocument, options: CanvasOptions): string {
  const html = renderEditorDocument(document, {
    mode: options.mode,
    breakpoint: options.breakpoint,
    ...(options.selectedId ? { selectedId: options.selectedId } : {}),
  });
  return options.mode === "edit" ? html.replace("</body>", `${CANVAS_RUNTIME}</body>`) : html;
}

export const parseCanvasMessage = parseCanvasBridgeMessage;

export function mountCanvas(container: HTMLElement, store: EditorStore): () => void {
  const iframe = document.createElement("iframe");
  iframe.title = "Aperçu de la page";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  iframe.style.cssText = "display:block;height:100%;min-height:900px;border:0;background:#fff;transform-origin:top left";
  container.replaceChildren(iframe);

  let lastDocument: EditorDocument | null = null;
  let lastViewKey = "";
  const paint = (force = false) => {
    const state = store.getState();
    const layout = viewportLayout(state.breakpoint, container.clientWidth || 1440);
    const viewKey = `${state.mode}:${state.breakpoint}:${state.selectedId ?? ""}:${layout.width}:${layout.zoom}`;
    if (!force && state.document === lastDocument && viewKey === lastViewKey) return;
    lastDocument = state.document;
    lastViewKey = viewKey;
    iframe.width = String(layout.width);
    iframe.style.width = `${layout.width}px`;
    iframe.style.transform = layout.zoom === 1 ? "none" : `scale(${layout.zoom})`;
    iframe.srcdoc = canvasSrcdoc(state.document, { mode: state.mode, breakpoint: state.breakpoint, selectedId: state.selectedId });
  };
  const receive = async (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    const action = parseCanvasBridgeMessage(event.data);
    if (!action) return;
    if (action.type === "select") store.setState({ selectedId: action.sectionId, rightCollapsed: false });
    if (action.type === "inlineEdit") store.dispatch({ type: "updateSetting", sectionId: action.sectionId, key: action.key, value: action.value });
    if (action.type === "imageEdit") {
      const section = store.getState().document.pages.flatMap((page) => page.sections).find((item) => item.id === action.sectionId);
      const sourceUrl = section?.settings[action.key];
      const prompt = typeof sourceUrl === "string" ? window.prompt("Décris la nouvelle scène. Le produit restera exactement le même.", "Place exactement ce produit dans une scène premium") : null;
      if (section && typeof sourceUrl === "string" && prompt) {
        try {
          const response = await fetch("/api/images/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl, prompt }) });
          const result = await response.json() as { url?: string; message?: string };
          if (!response.ok || !result.url) throw new Error(result.message || "La modification de l’image a échoué.");
          store.dispatch({ type: "updateSetting", sectionId: section.id, key: action.key, value: result.url });
        } catch (error) { window.alert(error instanceof Error ? error.message : "La modification de l’image a échoué."); }
      }
    }
    if (action.type === "move") store.dispatch({ type: "moveSection", sectionId: action.sectionId, toPageId: store.getState().pageId, toIndex: action.toIndex });
    if (action.type === "action") {
      if (action.action === "hide") store.dispatch({ type: "toggleHidden", sectionId: action.sectionId });
      if (action.action === "remove") store.dispatch({ type: "removeSection", sectionId: action.sectionId });
      if (action.action === "duplicate") store.dispatch({ type: "duplicateSection", sectionId: action.sectionId, newSectionId: `${action.sectionId}-copy-${Date.now()}` });
      if (action.action === "moveUp" || action.action === "moveDown") {
        const target = sectionMoveTarget(store.getState().document, action.sectionId, action.action === "moveUp" ? -1 : 1);
        if (target) store.dispatch({ type: "moveSection", sectionId: action.sectionId, toPageId: target.pageId, toIndex: target.toIndex });
      }
    }
  };
  const resize = new ResizeObserver(() => paint(true));
  resize.observe(container);
  window.addEventListener("message", receive);
  const unsubscribe = store.subscribe(() => paint());
  paint(true);
  return () => { resize.disconnect(); window.removeEventListener("message", receive); unsubscribe(); };
}
