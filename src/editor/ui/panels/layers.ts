import type { EditorState } from "../store";

export function layersPanel(state: EditorState): string {
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  return `<section data-panel="layers"><p class="editor-panel-help">Masque ou verrouille sans supprimer.</p>${page.sections.map((section) => `<div class="editor-layer"><button type="button" data-panel-action="select" data-section-id="${section.id}">${section.name}</button><button type="button" data-panel-action="toggleHidden" data-section-id="${section.id}" aria-label="${section.hidden ? "Afficher" : "Masquer"}">${section.hidden ? "○" : "●"}</button><button type="button" data-panel-action="toggleLocked" data-section-id="${section.id}" aria-label="${section.locked ? "Déverrouiller" : "Verrouiller"}">${section.locked ? "▣" : "□"}</button></div>`).join("")}</section>`;
}

