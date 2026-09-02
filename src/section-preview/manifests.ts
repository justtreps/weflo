import { fixtureById } from "./fixtures";
import type { PreviewArchetype } from "./types";

export type SectionPreviewCategory = "hero" | "product" | "benefits" | "proof" | "offer" | "faq";
export type SectionPreviewManifest = {
  sectionType: string; variantId: string; title: string; conversionGoal: string; category: SectionPreviewCategory;
  supportedArchetypes: PreviewArchetype[]; defaultFixtureId: string; compatibleFixtureIds: string[];
  preview: { desktop: string; mobile: string }; previewVersion: number;
};

const item = (sectionType:string, variantId:string, title:string, conversionGoal:string, category:SectionPreviewCategory, supportedArchetypes:PreviewArchetype[], defaultFixtureId:string, compatibleFixtureIds:string[]):SectionPreviewManifest => {
  const base = `/assets/section-previews/${sectionType}/${variantId}-${defaultFixtureId}`;
  return { sectionType, variantId, title, conversionGoal, category, supportedArchetypes, defaultFixtureId, compatibleFixtureIds, preview:{desktop:`${base}-desktop.webp`,mobile:`${base}-mobile.webp`}, previewVersion:1 };
};

export const SECTION_PREVIEW_MANIFESTS: SectionPreviewManifest[] = [
  item("productHero","beauty-editorial","Éditorial beauté","Créer le désir dès le premier écran","hero",["beauty","wellness"],"aurea-serum",["aurea-serum","pulse-recovery"]),
  item("productHero","object-editorial","Objet signature","Présenter le produit comme une pièce désirable","hero",["home","design","fashion"],"halo-lamp",["halo-lamp","noma-bag","forma-table"]),
  item("productMain","conversion-split","Buy box conversion","Réduire les hésitations au moment d’acheter","product",["beauty","home","gadget","fashion","sport","wellness","food","design"],"halo-lamp",["aurea-serum","halo-lamp","noma-bag","pulse-recovery","brume-coffee","forma-table"]),
  item("productMain","bundle-led","Produit + offre groupée","Faire choisir une offre avant l’ajout au panier","product",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"]),
  item("benefits","ritual-cards","Cartes rituel","Projeter le produit dans une routine","benefits",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"]),
  item("benefits","technical-grid","Grille technique","Expliquer clairement les bénéfices fonctionnels","benefits",["home","gadget","sport","design"],"halo-lamp",["halo-lamp","pulse-recovery","forma-table"]),
  item("testimonials","editorial-stories","Histoires éditoriales","Donner une preuve humaine et premium","proof",["beauty","fashion","food","design"],"noma-bag",["aurea-serum","noma-bag","brume-coffee","forma-table"]),
  item("testimonials","ugc-grid","Galerie clients","Accumuler des preuves visuelles crédibles","proof",["beauty","home","gadget","sport"],"halo-lamp",["aurea-serum","halo-lamp","pulse-recovery"]),
  item("bundle","routine-set","Routine complète","Augmenter le panier par complémentarité","offer",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"]),
  item("bundle","quantity-break","Prix par quantité","Augmenter le volume avec une économie claire","offer",["beauty","home","gadget","sport","wellness","food"],"pulse-recovery",["aurea-serum","halo-lamp","pulse-recovery","brume-coffee"]),
  item("faq","editorial-accordion","FAQ éditoriale","Lever les objections sans alourdir la page","faq",["beauty","fashion","food","design"],"brume-coffee",["aurea-serum","noma-bag","brume-coffee","forma-table"]),
  item("faq","support-columns","Centre d’aide","Rendre les réponses immédiatement scannables","faq",["home","gadget","sport","wellness"],"halo-lamp",["halo-lamp","pulse-recovery"]),
];

const keys = new Set<string>();
for (const manifest of SECTION_PREVIEW_MANIFESTS) {
  const key = `${manifest.sectionType}:${manifest.variantId}`;
  if (keys.has(key)) throw new Error(`Duplicate section preview manifest: ${key}`);
  keys.add(key);
  fixtureById(manifest.defaultFixtureId);
  for (const id of manifest.compatibleFixtureIds) fixtureById(id);
  if (!manifest.compatibleFixtureIds.includes(manifest.defaultFixtureId)) throw new Error(`Default fixture is incompatible: ${key}`);
}

export function previewManifest(sectionType:string, variantId:string):SectionPreviewManifest {
  const found = SECTION_PREVIEW_MANIFESTS.find((item)=>item.sectionType===sectionType&&item.variantId===variantId);
  if (!found) throw new Error(`Unknown section preview manifest: ${sectionType}:${variantId}`);
  return found;
}
export function previewManifestsForCategory(category?:string):SectionPreviewManifest[] { return category ? SECTION_PREVIEW_MANIFESTS.filter((item)=>item.category===category) : [...SECTION_PREVIEW_MANIFESTS]; }
