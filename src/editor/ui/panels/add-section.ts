import { listSectionDefinitions } from "../../../sections/index";

export function addSectionPanel(): string {
  const groups = listSectionDefinitions().reduce((result, definition) => {
    const entries = result.get(definition.category) ?? [];
    entries.push(definition);
    result.set(definition.category, entries);
    return result;
  }, new Map<string, ReturnType<typeof listSectionDefinitions>>());
  return `<section data-panel="add"><p class="editor-panel-help">Ajoute une section après la sélection.</p>${[...groups].map(([category, definitions]) => `<h3 class="editor-panel-heading">${category}</h3><div class="editor-panel-grid">${definitions.map((definition) => `<button type="button" data-panel-action="insert" data-section-type="${definition.type}"><span>${definition.name}</span><small>Ajouter</small></button>`).join("")}</div>`).join("")}</section>`;
}
