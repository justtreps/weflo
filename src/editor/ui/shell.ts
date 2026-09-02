import type { EditorState, EditorStore } from "./store";
import { bindLeftRail, editorPanelMarkup } from "./left-rail";

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
    <aside class="weflo-editor__inspector" data-editor-inspector><header><strong>Réglages</strong><button type="button" data-editor-collapse-right aria-label="Fermer les réglages">×</button></header><div data-editor-inspector-content><p>Sélectionne une section pour la modifier.</p></div></aside>
    <section class="weflo-editor__canardo" data-editor-canardo><span aria-hidden="true">🐥</span><input aria-label="Demander à Canardo" placeholder="Décris la section ou la modification…"><button type="button" aria-label="Envoyer à Canardo">↑</button></section>
  </div>`;
}

export function mountEditorShell(root: HTMLElement, store: EditorStore): () => void {
  const render = (state: EditorState) => { root.innerHTML = editorShellMarkup(state); };
  render(store.getState());
  const unsubscribe = store.subscribe(render);
  const unbind = bindLeftRail(root, store);
  return () => { unsubscribe(); unbind(); };
}
