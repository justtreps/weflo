import type { EditorDocument } from "../editor/document";
import { createEditorAutosave, AutosaveConflictError } from "../editor/ui/autosave";
import { mountEditorShell } from "../editor/ui/shell";
import { createEditorStore, type EditorState } from "../editor/ui/store";
import { renderPublishPaywall } from "./publish-access";

export type VisualEditorPage = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published_hosted" | "published_shopify";
  documentVersion: number;
  document: EditorDocument;
};

export function visualEditorInitialState(page: VisualEditorPage): EditorState {
  return {
    document: page.document,
    pageId: page.document.pages[0].id,
    selectedId: null,
    activePanel: "structure",
    breakpoint: "desktop",
    mode: "edit",
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved",
  };
}

export function editorSaveRequest(document: EditorDocument, expectedVersion: number): RequestInit {
  return {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document, name: document.name, expectedVersion }),
  };
}

function showProDialog(): void {
  const overlay = document.createElement("div");
  overlay.dataset.publishPaywall = "1";
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(20,19,16,.58);backdrop-filter:blur(8px)";
  overlay.innerHTML = `<style>.publish-paywall{position:relative;width:min(480px,100%);padding:34px;border-radius:18px;background:#fff;color:#141310;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}.publish-paywall__close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #e6e5e0;border-radius:50%;background:#fff}.publish-paywall__mark{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;background:#141310;color:#fbc531;font-weight:800}.publish-paywall__label{color:#75736c;font-size:12px}.publish-paywall h2{font-size:34px;line-height:1;margin:12px 0}.publish-paywall ul{display:grid;gap:8px;padding:18px 0;border-block:1px solid #e6e5e0;list-style:none}.publish-paywall li:before{content:'✓';margin-right:8px;color:#2fa36b}.publish-paywall>a{display:flex;justify-content:center;padding:14px;border-radius:8px;background:#fbc531;color:#141310;font-weight:700;text-decoration:none}</style>${renderPublishPaywall()}`;
  const close = () => overlay.remove();
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.querySelector("[data-paywall-close]")?.addEventListener("click", close);
  document.body.appendChild(overlay);
}

export async function hydrateVisualEditor(pageId: string): Promise<void> {
  const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}?documentVersion=2`);
  if (response.status === 401) { location.assign("/connexion"); return; }
  if (!response.ok) { location.assign("/dashboard"); return; }
  const page = await response.json() as VisualEditorPage;
  const store = createEditorStore(visualEditorInitialState(page));
  document.documentElement.style.height = "100%";
  if (!document.querySelector('link[data-weflo-editor-css]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/hydrate/editeur.css";
    stylesheet.dataset.wefloEditorCss = "1";
    document.head.appendChild(stylesheet);
  }
  document.body.style.margin = "0";
  document.body.replaceChildren();
  const root = document.createElement("div");
  root.id = "weflo-editor-root";
  document.body.appendChild(root);
  mountEditorShell(root, store);

  const autosave = createEditorAutosave({
    store,
    pageId: page.id,
    initialVersion: page.documentVersion,
    async save(documentValue, expectedVersion) {
      const result = await fetch(`/api/pages/${encodeURIComponent(page.id)}`, editorSaveRequest(documentValue, expectedVersion));
      const body = await result.json().catch(() => ({})) as { documentVersion?: number; serverPage?: unknown };
      if (result.status === 409) throw new AutosaveConflictError(body.serverPage);
      if (!result.ok || typeof body.documentVersion !== "number") throw new Error("save failed");
      return { documentVersion: body.documentVersion };
    },
  });

  root.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-editor-publish]");
    if (!target) return;
    target.setAttribute("aria-busy", "true");
    target.textContent = "Publication…";
    try {
      await autosave.flush();
      const publish = await fetch(`/api/pages/${encodeURIComponent(page.id)}/publish`, { method: "POST" });
      if (publish.status === 402) { showProDialog(); return; }
      if (!publish.ok) throw new Error("publish failed");
      target.textContent = "Publié";
    } catch {
      target.textContent = "Réessayer";
    } finally {
      target.removeAttribute("aria-busy");
      if (target.textContent === "Publication…") target.textContent = "Publier";
    }
  });
}
