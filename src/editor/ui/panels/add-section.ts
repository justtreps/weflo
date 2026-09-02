import { listSectionDefinitions } from "../../../sections/index";

export function addSectionPanel(): string {
  const groups = listSectionDefinitions().reduce((result, definition) => {
    const entries = result.get(definition.category) ?? [];
    entries.push(definition);
    result.set(definition.category, entries);
    return result;
  }, new Map<string, ReturnType<typeof listSectionDefinitions>>());
  const labels: Record<string,string> = { commerce: "Produit et offre", conversion: "Conversion", media: "Histoire et médias", content: "Contenu", layout: "Mise en page" };
  return `<section data-panel="add"><p class="editor-panel-help">Ajoute une section entièrement modifiable après la sélection actuelle.</p>${[...groups].map(([category, definitions]) => `<h3 class="editor-panel-heading">${labels[category] ?? category}</h3><div class="editor-panel-grid">${definitions.map((definition) => `<button type="button" data-panel-action="insert" data-section-type="${definition.type}"><i class="editor-section-thumb editor-section-thumb--${definition.type}"><span></span><span></span><span></span></i><b>${definition.name}</b><small>+ Ajouter la section</small></button>`).join("")}</div>`).join("")}</section>`;
}
