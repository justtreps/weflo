import type { PageDocument, PageTheme, PageType, Section, SectionType } from "../types";

export const SECTION_TYPES: SectionType[] = [
  "navigation",
  "productHero",
  "benefits",
  "bundle",
  "guarantees",
  "reviews",
  "faq",
  "cta",
  "footer",
  "hero",
  "collectionGrid",
  "atelier",
  "article",
];

const TEMPLATES: Record<PageType, SectionType[]> = {
  sell: [
    "navigation",
    "productHero",
    "benefits",
    "bundle",
    "guarantees",
    "reviews",
    "faq",
    "cta",
    "footer",
  ],
  write: ["navigation", "article", "footer"],
  blank: ["navigation", "hero", "footer"],
};

export type PageModel = {
  id: string;
  name: string;
  brand: string;
  theme: string;
  type: PageType;
  description: string;
  price: string;
  cta: string;
  image: string;
  themeConfig: PageTheme;
  previewDesktop: string;
  previewMobile: string;
};

const THEMES: Record<string, PageTheme> = {
  "Nutrition": { background: "#F4F1DD", surface: "#FFFDF3", ink: "#182116", muted: "#66705D", accent: "#B8D865", display: "sans", radius: "round" },
  "Café & épicerie": { background: "#EFE3D3", surface: "#FFF9EF", ink: "#2B1B13", muted: "#786152", accent: "#D56A35", display: "serif", radius: "soft" },
  "Beauté & soin": { background: "#F3E8EB", surface: "#FFFAFC", ink: "#241A20", muted: "#796871", accent: "#DB8FA8", display: "serif", radius: "round" },
  "Maison & céramique": { background: "#EBE6DC", surface: "#FAF8F2", ink: "#211E19", muted: "#6E675D", accent: "#C89D5A", display: "serif", radius: "none" },
  "Mode & accessoires": { background: "#ECECEF", surface: "#FFFFFF", ink: "#171719", muted: "#6D6D75", accent: "#7C71D8", display: "condensed", radius: "none" },
  "Sport & plein air": { background: "#E5EDF2", surface: "#FBFDFF", ink: "#101820", muted: "#60717D", accent: "#FF6B35", display: "condensed", radius: "soft" },
};

export const DEFAULT_PAGE_THEME: PageTheme = {
  background: "#F4F2EC", surface: "#FFFFFF", ink: "#141310", muted: "#75736C",
  accent: "#FBC531", display: "sans", radius: "soft",
};

const MODEL_IMAGES: Record<string, string> = {
  proteo: "photo-1593095948071-474c5cc2989d", graine: "photo-1490645935967-10de6ba17061",
  cycle: "photo-1600185365483-26d7a4cc7519", brulerie: "photo-1447933601403-0c6688de566e",
  feuille: "photo-1544787219-7f47ccb76574", comptoir: "photo-1547592180-85f173990554",
  peau: "photo-1556228578-8c89e6adf883", saponaire: "photo-1607006483225-55c3e32e9ad4",
  onzieme: "photo-1541643600914-78b084683601", terre: "photo-1610701596007-11502861dcfa",
  fil: "photo-1615874959474-d609969a20ed", tenon: "photo-1555041469-a586c61ea9bc",
  cousu: "photo-1553062407-98eeb64c6a62", trame: "photo-1521572163474-6864f9cf17ab",
  orsecond: "photo-1515562141207-7a88fb7ce338", cadence: "photo-1485965120184-e220f721d03e",
  denivele: "photo-1551632811-561732d1e306", prise: "photo-1522163182402-834f871fd851",
};

function previewSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pageModel(id: string, name: string, brand: string, theme: string, description: string, price: string, cta: string): PageModel {
  const imageId = MODEL_IMAGES[id] ?? MODEL_IMAGES.proteo;
  const preview = `/assets/editor-preview-${previewSlug(brand)}`;
  return {
    id, name, brand, theme, type: "sell", description, price, cta,
    image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1400&q=85`,
    themeConfig: THEMES[theme] ?? DEFAULT_PAGE_THEME,
    previewDesktop: `${preview}-desktop.webp`,
    previewMobile: `${preview}-mobile.webp`,
  };
}

export const PAGE_MODELS: PageModel[] = [
  pageModel("proteo", "Compléments du sport", "Protéo", "Sport & plein air", "Une formule nette pour récupérer plus vite et repartir plus fort.", "39 €", "Choisir ma formule"),
  pageModel("graine", "Épicerie santé", "Graine & Cie", "Nutrition", "Des essentiels du placard, sourcés simplement et expliqués clairement.", "12,90 €", "Composer mon panier"),
  pageModel("cycle", "Nutrition féminine", "Cycle", "Nutrition", "Une routine pensée pour accompagner chaque phase sans compliquer les journées.", "34 €", "Découvrir la routine"),
  pageModel("brulerie", "Torréfaction de quartier", "Brûlerie Sud", "Café & épicerie", "Un café de caractère, torréfié en petite série au cœur du quartier.", "14 €", "Choisir mon café"),
  pageModel("feuille", "Thé et infusions", "Feuille Nord", "Café & épicerie", "Des feuilles entières, des origines précises et une tasse qui prend son temps.", "16 €", "Infuser maintenant"),
  pageModel("comptoir", "Épicerie fine locale", "Comptoir 44", "Café & épicerie", "Le meilleur des producteurs voisins réuni dans un comptoir généreux.", "28 €", "Remplir mon panier"),
  pageModel("peau", "Soin minimaliste", "Peau Nue", "Beauté & soin", "Trois actifs essentiels pour une peau calme, souple et lumineuse.", "42 €", "Adopter le rituel"),
  pageModel("saponaire", "Savonnerie artisanale", "Saponaire", "Beauté & soin", "Des savons saponifiés à froid, doux pour la peau et beaux dans la salle de bain.", "9 €", "Choisir mon savon"),
  pageModel("onzieme", "Parfums de niche", "Onzième", "Beauté & soin", "Un sillage intime construit autour de matières inattendues et durables.", "96 €", "Trouver mon sillage"),
  pageModel("terre", "Céramique utilitaire", "Terre Brute", "Maison & céramique", "Des pièces tournées à la main pour rendre chaque repas plus tactile.", "32 €", "Voir les pièces"),
  pageModel("fil", "Linge de maison", "Fil Écru", "Maison & céramique", "Du lin lavé qui vit, se patine et rend la maison immédiatement plus douce.", "68 €", "Habiller la maison"),
  pageModel("tenon", "Mobilier en kit", "Tenon", "Maison & céramique", "Un mobilier précis à monter sans outil, conçu pour suivre tous les espaces.", "189 €", "Configurer mon meuble"),
  pageModel("cousu", "Maroquinerie", "Cousu Main", "Mode & accessoires", "Des sacs tracés, coupés et assemblés pour durer bien au-delà des saisons.", "220 €", "Choisir mon cuir"),
  pageModel("trame", "Vêtement essentiel", "Trame", "Mode & accessoires", "La bonne coupe, la bonne matière et rien qui ne soit pas nécessaire.", "79 €", "Trouver ma taille"),
  pageModel("orsecond", "Bijoux fondus", "Or Second", "Mode & accessoires", "Des métaux dormants refondus en bijoux singuliers, pièce après pièce.", "120 €", "Voir la collection"),
  pageModel("cadence", "Vélo et pièces", "Cadence", "Sport & plein air", "Des composants fiables pour rouler plus longtemps et entretenir facilement.", "59 €", "Équiper mon vélo"),
  pageModel("denivele", "Randonnée légère", "Dénivelé", "Sport & plein air", "Moins de poids sur le dos, plus de kilomètres et de liberté devant soi.", "149 €", "Préparer ma sortie"),
  pageModel("prise", "Escalade", "Prise Franche", "Sport & plein air", "Du matériel précis pour grimper concentré, du premier mouvement au relais.", "74 €", "Choisir mon équipement"),
];

export function initialDocument(name: string, type: PageType): PageDocument {
  const sections: Section[] = TEMPLATES[type].map((sectionType, i) => ({
    id: `${sectionType}-${i}`,
    type: sectionType,
    settings: { title: name },
  }));
  return { name, path: "/", sections };
}

export function blankDocument(name: string): PageDocument {
  const doc = initialDocument(name, "blank");
  return {
    ...doc,
    modelId: "blank",
    theme: DEFAULT_PAGE_THEME,
    sections: doc.sections.map((section) => ({
      ...section,
      settings: section.type === "hero"
        ? { title: "Ton idée commence ici", subtitle: name, text: "Ajoute une section ou demande à Canardo de construire la page.", cta_label: "Commencer" }
        : { title: name },
    })),
  };
}

export function needsModelPicker(doc: PageDocument): boolean {
  if (doc.modelId) return false;
  const content = doc.sections.filter((s) => s.type !== "navigation" && s.type !== "footer");
  if (content.length === 0) return true;
  return content.every((section) =>
    Object.entries(section.settings).every(
      ([key, value]) => key === "title" || value === undefined || value === "",
    ),
  );
}

function fillSettings(type: SectionType, name: string, model: PageModel): Record<string, unknown> {
  const { brand, image, description, price, cta } = model;
  switch (type) {
    case "navigation":
    case "footer":
      return { title: brand };
    case "productHero":
      return {
        title: name,
        subtitle: brand,
        text: description,
        price,
        image,
        cta_label: cta,
      };
    case "hero":
      return {
        title: name,
        subtitle: brand,
        text: `La boutique ${brand}, montée section par section.`,
        image,
        cta_label: "Voir la collection",
      };
    case "benefits":
      return { title: "Pourquoi ça change tout", text: `${description} Une promesse claire, soutenue par trois bénéfices concrets.` };
    case "bundle":
      return { title: "Le duo qui part le plus", text: `Deux références ${brand} à prix pack.`, price: "64 €" };
    case "guarantees":
      return { title: "Garanties", text: "Paiement sécurisé, retours 14 jours, suivi colis." };
    case "reviews":
      return { title: "Avis", text: "« Enfin une page qui ressemble à une vraie boutique. »" };
    case "faq":
      return { title: "Livraison", text: "Expédition sous 48h ouvrées, suivi par e-mail." };
    case "cta":
      return { title: `Rejoins ${brand}`, text: "Première commande, page déjà en ligne.", cta_label: cta };
    case "collectionGrid":
      return { title: "La collection", text: `Six produits ${brand}.` };
    case "atelier":
      return { title: `L'atelier ${brand}`, text: "Petites séries, photos et copy déjà posés.", image };
    case "article":
      return { title: name, text: `Journal ${brand} — un article, des sections, un thème Shopify.` };
    default:
      return { title: name };
  }
}

export function documentFromModel(modelId: string, pageName: string): PageDocument {
  const model = PAGE_MODELS.find((m) => m.id === modelId) ?? PAGE_MODELS[0];
  const name = pageName.trim() || model.name;
  const base = initialDocument(name, model.type);
  return {
    ...base,
    name,
    modelId: model.id,
    theme: { ...model.themeConfig },
    referencePreviews: { desktop: model.previewDesktop, mobile: model.previewMobile },
    sections: base.sections.map((section) => ({
      ...section,
      settings: fillSettings(section.type, name, model),
    })),
  };
}

export function modelByName(name: string): PageModel | undefined {
  return PAGE_MODELS.find((m) => m.name === name);
}

export function modelById(id: string): PageModel | undefined {
  return PAGE_MODELS.find((model) => model.id === id);
}
