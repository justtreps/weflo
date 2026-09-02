import type { AssetReference, EditorDocument, EditorSection } from "./document";

function id(prefix: string): string { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

export function applyStudioImage(document: EditorDocument, input: { imageUrl: string; selectedSectionId: string | null }): EditorDocument {
  const next = structuredClone(document);
  const asset: AssetReference = { id: id("asset"), type: "image", url: input.imageUrl, alt: "Visuel généré dans le Studio Weflo" };
  next.assets.push(asset);
  const selected = next.pages.flatMap((page) => page.sections).find((section) => section.id === input.selectedSectionId);
  if (selected) selected.settings.image = input.imageUrl;
  else {
    const section: EditorSection = { id: id("section"), type: "imageText", name: "Visuel Studio", hidden: false, locked: false, settings: { image: input.imageUrl, eyebrow: "NOTRE UNIVERS", title: "Une image pensée pour ta marque", text: "Modifie ce texte, la mise en page et le visuel directement dans l’éditeur.", cta: "Découvrir" }, style: {}, responsive: {}, blocks: [] };
    next.pages[0].sections.splice(Math.min(1, next.pages[0].sections.length), 0, section);
  }
  return next;
}
