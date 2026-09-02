import { sectionCatalogShellMarkup } from "../section-catalog";

export function addSectionPanel(): string {
  return `<section data-panel="add"><p class="editor-panel-help">Choisis une vraie composition, teste-la avec un produit fictif puis adapte-la à ta marque.</p>${sectionCatalogShellMarkup()}</section>`;
}
