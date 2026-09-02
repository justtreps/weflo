import type { EditorState } from "../store";

export function structurePanel(state: EditorState): string {
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  const rows = page.sections.map((section, index) => `<button type="button" class="editor-panel-row" data-panel-action="select" data-section-id="${section.id}" aria-pressed="${state.selectedId === section.id}"><i>${String(index + 1).padStart(2,"0")}</i><span>${section.name}</span><small>${section.hidden ? "Masquée" : "Modifier"}</small></button>`).join("");
  return `<section data-panel="structure"><p class="editor-panel-help">Sélectionne, modifie et réorganise chaque section réelle de la boutique.</p><div class="editor-panel-list">${rows}</div></section>`;
}
