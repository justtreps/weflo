import type { EditorState } from "../store";

export function structurePanel(state: EditorState): string {
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  const rows = page.sections.map((section) => `<button type="button" class="editor-panel-row" data-panel-action="select" data-section-id="${section.id}" aria-pressed="${state.selectedId === section.id}"><span>${section.name}</span><small>${section.type}</small></button>`).join("");
  return `<section data-panel="structure"><p class="editor-panel-help">Sélectionne et organise les sections de cette page.</p><div class="editor-panel-list">${rows}</div></section>`;
}

