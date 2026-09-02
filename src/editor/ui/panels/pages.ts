import type { EditorState } from "../store";

export function pagesPanel(state: EditorState): string {
  return `<section data-panel="pages"><button type="button" class="editor-panel-primary" data-panel-action="addPage">Ajouter une page</button>${state.document.pages.map((page) => `<button type="button" class="editor-panel-row" data-panel-action="selectPage" data-page-id="${page.id}" aria-pressed="${page.id === state.pageId}"><span>${page.name}</span><small>/${page.slug}</small></button>`).join("")}</section>`;
}

