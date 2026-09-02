const TYPES = [
  ["hero", "Hero"], ["productHero", "Produit"], ["collectionGrid", "Collection"],
  ["benefits", "Bénéfices"], ["bundle", "Bundle"], ["reviews", "Témoignages"],
  ["guarantees", "Garanties"], ["faq", "FAQ"], ["cta", "Appel à l’action"],
] as const;

export function addSectionPanel(): string {
  return `<section data-panel="add"><p class="editor-panel-help">Ajoute une section après la sélection.</p><div class="editor-panel-grid">${TYPES.map(([type, label]) => `<button type="button" data-panel-action="insert" data-section-type="${type}"><span>${label}</span><small>Ajouter</small></button>`).join("")}</div></section>`;
}

