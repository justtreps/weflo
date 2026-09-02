import type { EditorBlock, EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { PAGE_MODELS, type PageModel } from "../lib/catalog";
import { getSectionDefinition } from "../sections/index";
import { assetsForModel } from "./assets";
import { MODEL_SPECIALTY_BATCH_1 } from "./manifests/batch-1";
import { MODEL_SPECIALTY_BATCH_2 } from "./manifests/batch-2";
import { MODEL_SPECIALTY_BATCH_3 } from "./manifests/batch-3";

const SPECIALTIES = { ...MODEL_SPECIALTY_BATCH_1, ...MODEL_SPECIALTY_BATCH_2, ...MODEL_SPECIALTY_BATCH_3 };
export const modelManifestIds = Object.keys(SPECIALTIES);

function block(sectionId: string, index: number, title: string, text: string, extra: Record<string, SettingValue> = {}): EditorBlock {
  return { id: `${sectionId}-block-${index}`, type: "item", settings: { title, text, ...extra } };
}

function blocksFor(type: string, id: string, model: PageModel): EditorBlock[] {
  if (type === "navigation") return [block(id, 1, "Boutique", "", { label: "Boutique", link: "#produit" }), block(id, 2, "Notre histoire", "", { label: "Notre histoire", link: "#histoire" })];
  if (type === "productMain") return [{ id: `${id}-variant-1`, type: "variant", settings: { title: "Format signature", variant_id: "" } }];
  if (type === "reviews" || type === "testimonials") return [block(id, 1, "Camille", `« ${model.brand} a dépassé mes attentes. »`, { rating: 5 }), block(id, 2, "Nicolas", "Simple, beau et vraiment bien pensé.", { rating: 5 }), block(id, 3, "Inès", "Je recommande sans hésiter.", { rating: 5 })];
  if (type === "faq") return [block(id, 1, "Quand vais-je recevoir ma commande ?", "Expédition sous 48 h avec suivi."), block(id, 2, "Puis-je changer d’avis ?", "Oui, les retours sont possibles pendant 14 jours.")];
  if (type === "gallery") return [block(id, 1, "Détail", "Matières et finitions", { image: model.image, image_alt: model.name }), block(id, 2, "En situation", "Pensé pour le quotidien", { image: model.image, image_alt: model.name })];
  return [block(id, 1, "Conçu avec intention", model.description), block(id, 2, "Livré simplement", "Suivi clair et assistance humaine."), block(id, 3, "Adopté durablement", "Une expérience faite pour durer.")];
}

function section(type: string, index: number, model: PageModel, pageName: string): EditorSection {
  const definition = getSectionDefinition(type);
  const id = `${type}-${index + 1}`;
  const common: Record<string, SettingValue> = { ...(definition?.defaults ?? {}), title: definition?.name ?? type };
  if (type === "navigation") Object.assign(common, { title: model.brand, cta_label: "Panier", cta_link: "#panier" });
  if (type === "announcement") Object.assign(common, { text: "Livraison offerte dès 60 € — retours sous 14 jours", cta_label: "", cta_link: "#" });
  if (type === "productHero") Object.assign(common, { title: pageName, subtitle: model.brand, text: model.description, price: model.price, image: model.image, image_alt: `${pageName} par ${model.brand}`, cta_label: model.cta, cta_link: "#produit" });
  if (type === "productMain") Object.assign(common, { title: "Choisis ta version", text: "Sélectionne ton option et ajoute-la au panier.", cta_label: "Ajouter au panier" });
  if (type === "reviews") Object.assign(common, { title: "Des clients conquis", subtitle: "Avis vérifiés", text: "" });
  if (type === "faq") Object.assign(common, { title: "Tout savoir avant de commander", text: "" });
  if (type === "cta") Object.assign(common, { title: `Prêt à découvrir ${model.brand} ?`, text: model.description, cta_label: model.cta, cta_link: "#produit" });
  if (type === "footer") Object.assign(common, { title: model.brand, text: "Qualité, clarté et service attentionné.", cta_label: "", cta_link: "#" });
  if (type === SPECIALTIES[model.id]) Object.assign(common, { title: `${model.brand}, jusque dans les détails`, subtitle: model.theme, text: model.description, image: model.image, image_alt: pageName, cta_label: "En savoir plus", cta_link: "#produit" });
  return { id, type, name: definition?.name ?? type, hidden: false, locked: false, settings: common, style: {}, responsive: {}, blocks: blocksFor(type, id, model) };
}

export function buildModelDocument(modelId: string, pageName: string): EditorDocument {
  const model = PAGE_MODELS.find((item) => item.id === modelId) ?? PAGE_MODELS[0];
  const name = pageName.trim() || model.name;
  const types = ["navigation", "announcement", "productHero", SPECIALTIES[model.id] ?? "benefits", "productMain", "reviews", "faq", "cta", "footer"];
  return {
    version: 2,
    name,
    path: "/",
    kind: "product",
    modelId: model.id,
    theme: { ...model.themeConfig },
    pages: [{ id: `page-${model.id}`, name, slug: model.id, sections: types.map((type, index) => section(type, index, model, name)) }],
    assets: assetsForModel(model),
  };
}
