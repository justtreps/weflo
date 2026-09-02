import type { EditorState, EditorStore } from "./store";
import { bindLeftRail, editorPanelMarkup } from "./left-rail";
import { bindInspector, inspectorMarkup } from "./inspector";
import { mountCanvas } from "./canvas";
import "./layout.css";

const ICONS = {
  structure: "☷",
  add: "+",
  layers: "◇",
  pages: "▤",
  media: "▧",
  commerce: "⌂",
} as const;

const LABELS = {
  structure: "Structure",
  add: "Ajouter",
  layers: "Calques",
  pages: "Pages",
  media: "Médias",
  commerce: "Commerce",
} as const;

export function editorShellMarkup(state: EditorState): string {
  const rail = Object.entries(LABELS).map(([id, label]) => `<button type="button" data-editor-panel-button="${id}" aria-label="${label}" aria-pressed="${state.activePanel === id}"><span aria-hidden="true">${ICONS[id as keyof typeof ICONS]}</span><small>${label}</small></button>`).join("");
  return `<div class="weflo-editor" data-editor-shell data-active-panel="${state.activePanel}" data-left-collapsed="${state.leftCollapsed}" data-right-collapsed="${state.rightCollapsed}">
    <header class="weflo-editor__topbar" data-editor-topbar>
      <div class="weflo-editor__identity"><a href="/dashboard" aria-label="Retour au dashboard">B</a><strong>${state.document.name}</strong></div>
      <div class="weflo-editor__history"><button type="button" data-editor-undo aria-label="Annuler">↶</button><button type="button" data-editor-redo aria-label="Refaire">↷</button></div>
      <div class="weflo-editor__viewports" aria-label="Format de l’aperçu"><button type="button" data-editor-breakpoint="desktop" aria-pressed="${state.breakpoint === "desktop"}">Bureau</button><button type="button" data-editor-breakpoint="tablet" aria-pressed="${state.breakpoint === "tablet"}">Tablette</button><button type="button" data-editor-breakpoint="mobile" aria-pressed="${state.breakpoint === "mobile"}">Mobile</button></div>
      <span class="weflo-editor__save" data-editor-save-status="${state.saveStatus}">${state.saveStatus === "saved" ? "Enregistré" : "Modifié"}</span>
      <button type="button" data-editor-preview>${state.mode === "edit" ? "Aperçu" : "Édition"}</button>
      <button type="button" class="weflo-editor__publish" data-editor-publish>Publier</button>
    </header>
    <nav class="weflo-editor__rail" data-editor-left-rail aria-label="Outils de l’éditeur">${rail}</nav>
    <aside class="weflo-editor__sidebar" data-editor-sidebar><header><strong>${LABELS[state.activePanel]}</strong><button type="button" data-editor-collapse-left aria-label="Fermer le panneau">×</button></header><div data-editor-sidebar-content>${editorPanelMarkup(state)}</div></aside>
    <main class="weflo-editor__stage" data-editor-canvas><div class="weflo-editor__viewport" data-editor-viewport data-breakpoint="${state.breakpoint}"></div></main>
    <aside class="weflo-editor__inspector" data-editor-inspector><header><strong>Réglages</strong><button type="button" data-editor-collapse-right aria-label="Fermer les réglages">×</button></header><div data-editor-inspector-content>${inspectorMarkup(state)}</div></aside>
    <section class="weflo-editor__canardo" data-editor-canardo><span aria-hidden="true">🐥</span><input aria-label="Demander à Canardo" placeholder="Décris la section ou la modification…"><button type="button" aria-label="Envoyer à Canardo">↑</button></section>
  </div>`;
}

export function mountEditorShell(root: HTMLElement, store: EditorStore): () => void {
  root.innerHTML = editorShellMarkup(store.getState());
  const viewport = root.querySelector<HTMLElement>("[data-editor-viewport]");
  if (!viewport) throw new Error("Editor viewport missing");
  const unmountCanvas = mountCanvas(viewport, store);
  const patch = (state: EditorState) => {
    const shell = root.querySelector<HTMLElement>("[data-editor-shell]");
    if (shell) {
      shell.dataset.activePanel = state.activePanel;
      shell.dataset.leftCollapsed = String(state.leftCollapsed);
      shell.dataset.rightCollapsed = String(state.rightCollapsed);
    }
    root.querySelectorAll<HTMLElement>("[data-editor-panel-button]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.editorPanelButton === state.activePanel)));
    const sidebarTitle = root.querySelector<HTMLElement>("[data-editor-sidebar]>header strong");
    if (sidebarTitle) sidebarTitle.textContent = LABELS[state.activePanel];
    const sidebar = root.querySelector<HTMLElement>("[data-editor-sidebar-content]");
    if (sidebar) sidebar.innerHTML = editorPanelMarkup(state);
    const inspector = root.querySelector<HTMLElement>("[data-editor-inspector-content]");
    if (inspector) inspector.innerHTML = inspectorMarkup(state);
    root.querySelectorAll<HTMLElement>("[data-editor-breakpoint]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.editorBreakpoint === state.breakpoint)));
    const save = root.querySelector<HTMLElement>("[data-editor-save-status]");
    if (save) { save.dataset.editorSaveStatus = state.saveStatus; save.textContent = state.saveStatus === "saved" ? "Enregistré" : state.saveStatus === "saving" ? "Enregistrement…" : "Modifié"; }
  };
  const unsubscribe = store.subscribe(patch);
  const unbind = bindLeftRail(root, store);
  const unbindInspector = bindInspector(root, store);
  return () => { unsubscribe(); unbind(); unbindInspector(); unmountCanvas(); };
}
