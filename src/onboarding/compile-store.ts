import type { EditorBlock, EditorDocument, EditorPageKind, EditorSection, SettingValue } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import { selectArtDirection } from "./art-direction";
import { isProductLedCreationFormat, type CreationFormatId } from "./creation-recipe";
import { buildProductTruthSheet } from "./product-truth";
import { buildStoreRecipe } from "./store-recipe";
import { defaultRecipeForFormat, recipeForTemplate, TEMPLATE_RECIPE_VERSION, type TemplateRecipe } from "./template-recipe";
import type { BrandKit, BuyerPersona, ImportedProduct, MarketingAngle } from "./types";

type BuildStoreCommonInput = {
  language: string;
  brandName: string;
  modelId: string;
  personas: BuyerPersona[];
  angles: MarketingAngle[];
  brandKit: BrandKit;
};

type TemplateBuildFields = {
  templateId: string | null;
  answers: Record<string, string>;
};

type ProductLedFormat = "store" | "product";
type NonProductLedFormat = Exclude<CreationFormatId, ProductLedFormat>;

export type BuildStoreInput =
  | BuildStoreCommonInput & TemplateBuildFields & { creationFormat?: ProductLedFormat; product: ImportedProduct }
  | BuildStoreCommonInput & TemplateBuildFields & { creationFormat: NonProductLedFormat; product?: never };

type LegacyProductBuildStoreInput = BuildStoreCommonInput & {
  product: ImportedProduct;
  creationFormat?: ProductLedFormat;
  templateId?: null;
  answers?: Record<string, string>;
};

type NormalizedBuildStoreInput = BuildStoreCommonInput & TemplateBuildFields & {
  creationFormat?: CreationFormatId;
  product?: ImportedProduct;
};

type CompiledRecipe = {
  id: string | null;
  sections: string[];
  variants: Record<string, string>;
  purposes: Record<string, string>;
};

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

function money(value: number | null, currency: string): string {
  if (value === null) return "";
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

function answer(answers: Record<string, string>, key: string): string {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
}

function listAnswer(answers: Record<string, string>, key: string): string[] {
  return answer(answers, key).split(/\r?\n|[,;]+/).map((value) => value.trim()).filter(Boolean);
}

function first(...values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function item(id: string, title: string, text = "", extra: Record<string, SettingValue> = {}): EditorBlock {
  return { id, type: "item", settings: { title, text, ...extra } };
}

function makeSection(type: string, index: number, settings: Record<string, SettingValue>, blocks: EditorBlock[] = []): EditorSection {
  const definition = getSectionDefinition(type);
  if (!definition) throw new Error(`Unknown section type: ${type}`);
  return {
    id: `${type}-${index + 1}`,
    type,
    name: definition.name,
    hidden: false,
    locked: false,
    settings: {
      ...definition.defaults,
      title: "[Ajoutez un titre]",
      subtitle: "",
      text: "",
      cta_label: "",
      cta_link: "#",
      image: "",
      image_alt: "",
      price: "",
      compare_at_price: "",
      ...settings,
    },
    style: {},
    responsive: {},
    blocks,
  };
}

function pageKind(format: CreationFormatId): EditorPageKind {
  if (format === "home") return "home";
  if (format === "store" || format === "product") return "product";
  return "landing";
}

function chooseRecipe(input: NormalizedBuildStoreInput, format: CreationFormatId, product: ImportedProduct | undefined): CompiledRecipe {
  if (format === "blank") {
    if (input.templateId !== null) throw new Error("Blank documents cannot use a template recipe");
    return { id: null, sections: [], variants: {}, purposes: {} };
  }
  if (input.templateId) {
    const recipe: TemplateRecipe = recipeForTemplate(input.templateId);
    if (recipe.format !== format) throw new Error(`Template ${recipe.id} is not compatible with ${format}`);
    return { id: recipe.id, sections: [...recipe.sections], variants: { ...recipe.variants }, purposes: {} };
  }
  if (format === "store" && product) {
    const truth = buildProductTruthSheet(product);
    const direction = selectArtDirection(truth);
    const legacy = buildStoreRecipe({ product, truth, artDirection: direction, personas: input.personas, angles: input.angles });
    return {
      id: null,
      sections: legacy.sections.map((section) => section.type),
      variants: Object.fromEntries(legacy.sections.map((section) => [section.type, section.variant])),
      purposes: Object.fromEntries(legacy.sections.map((section) => [section.type, section.purpose])),
    };
  }
  const recipe = defaultRecipeForFormat(format);
  return { id: null, sections: [...recipe.sections], variants: { ...recipe.variants }, purposes: {} };
}

function contentForSection(type: string, index: number, input: NormalizedBuildStoreInput, product: ImportedProduct | undefined): { settings: Record<string, SettingValue>; blocks: EditorBlock[] } {
  const answers = input.answers;
  const selectedPersonas = input.personas.filter((persona) => persona.selected);
  const selectedAngles = input.angles.filter((angle) => angle.selected);
  const productTitle = product?.title ?? "";
  const productText = product?.description ?? "";
  const price = product ? money(product.price, product.currency) : "";
  const compareAtPrice = product ? money(product.compareAtPrice, product.currency) : "";
  const brand = first(answer(answers, "brand"), input.brandName, product?.vendor);
  const collections = listAnswer(answers, "collections");
  const benefits = listAnswer(answers, "benefits");
  const objections = listAnswer(answers, "objections");
  const segments = listAnswer(answers, "segments");
  const relatedProducts = listAnswer(answers, "relatedProducts");
  const submittedVariants = listAnswer(answers, "variants");
  const primaryTitle = first(productTitle, answer(answers, "promise"), answer(answers, "topic"), answer(answers, "objective"), answer(answers, "angle"), answer(answers, "campaign"), answer(answers, "positioning"), input.brandName);
  const primaryText = first(productText, answer(answers, "story"), answer(answers, "intent"), answer(answers, "audience"), answer(answers, "result"), answer(answers, "positioning"), answer(answers, "angle"));
  const cta = first(answer(answers, "cta"), product ? (input.language.toLowerCase().startsWith("fr") ? "Ajouter au panier" : "Add to cart") : "");
  const settings: Record<string, SettingValue> = {};
  let blocks: EditorBlock[] = [];

  switch (type) {
    case "announcement":
      Object.assign(settings, { title: "[Ajoutez une annonce]", text: answer(answers, "offer") });
      break;
    case "navigation":
      Object.assign(settings, { title: brand || "[Ajoutez le nom de la marque]", cta_label: "" });
      blocks = collections.map((title, blockIndex) => item(`navigation-${index + 1}-${blockIndex + 1}`, title, "", { label: title, link: `#${slugify(title)}` }));
      break;
    case "hero":
      Object.assign(settings, { title: primaryTitle || "[Ajoutez votre titre principal]", subtitle: [answer(answers, "activity"), answer(answers, "campaign"), answer(answers, "traffic"), answer(answers, "author"), answer(answers, "angle"), product?.vendor ?? ""].filter(Boolean).join(" · "), text: primaryText, image: product?.images[0] ?? "", image_alt: productTitle, cta_label: cta, cta_link: cta ? "#action" : "#" });
      break;
    case "productHero":
      Object.assign(settings, { title: productTitle, subtitle: product?.vendor ?? "", text: productText, price, compare_at_price: compareAtPrice, image: product?.images[0] ?? "", image_alt: productTitle, cta_label: cta, cta_link: "#product" });
      break;
    case "gallery":
      Object.assign(settings, { title: product ? productTitle : "[Ajoutez vos visuels]" });
      blocks = (product?.images ?? []).map((url, blockIndex) => item(`gallery-${index + 1}-${blockIndex + 1}`, productTitle, "", { image: url, image_alt: productTitle }));
      break;
    case "productMain":
      Object.assign(settings, { title: productTitle, text: first(selectedAngles[0]?.description, productText), price, compare_at_price: compareAtPrice, image: product?.images[0] ?? "", cta_label: cta, product_handle: slugify(productTitle) });
      blocks = product?.variants.length
        ? product.variants.map((variant, blockIndex) => ({ id: `variant-${index + 1}-${blockIndex + 1}`, type: "variant", settings: { title: variant.title, variant_id: variant.id, price: money(variant.price, product.currency), image: variant.image ?? "" } }))
        : submittedVariants.map((title, blockIndex) => ({ id: `variant-${index + 1}-${blockIndex + 1}`, type: "variant", settings: { title, variant_id: "", price: "", image: "" } }));
      break;
    case "bundle":
      Object.assign(settings, { title: answer(answers, "offer") || "[Décrivez votre offre groupée]", text: answer(answers, "offer"), price: "", cta_label: cta });
      break;
    case "benefits": {
      const submitted = first(answer(answers, "promise"), answer(answers, "positioning"), answer(answers, "angle"));
      const values = benefits.length ? benefits : submitted ? [submitted] : [];
      Object.assign(settings, { title: answer(answers, "objective") || "[Présentez les bénéfices]", subtitle: answer(answers, "proof"), text: "" });
      blocks = values.map((value, blockIndex) => item(`benefit-${index + 1}-${blockIndex + 1}`, value));
      break;
    }
    case "imageText":
      Object.assign(settings, { title: first(answer(answers, "story"), answer(answers, "angle"), answer(answers, "topic"), productTitle) || "[Ajoutez votre histoire]", text: first(answer(answers, "story"), answer(answers, "angle"), answer(answers, "intent"), productText), image: product?.images[1] ?? "", image_alt: productTitle });
      break;
    case "comparison": {
      const values = objections.length ? objections : benefits.length ? benefits : segments;
      Object.assign(settings, { title: first(answer(answers, "angle"), answer(answers, "objective")) || "[Ajoutez votre comparaison]", text: answer(answers, "proof") });
      blocks = values.map((value, blockIndex) => item(`comparison-${index + 1}-${blockIndex + 1}`, value));
      break;
    }
    case "richText":
      Object.assign(settings, { title: first(answer(answers, "topic"), answer(answers, "angle"), answer(answers, "story"), primaryTitle) || "[Ajoutez le titre de l’article]", subtitle: answer(answers, "author"), text: [answer(answers, "intent"), answer(answers, "angle"), answer(answers, "story"), answer(answers, "proof")].filter(Boolean).join("\n\n") || primaryText });
      blocks = relatedProducts.map((value, blockIndex) => item(`related-${index + 1}-${blockIndex + 1}`, value));
      break;
    case "press": {
      const proof = answer(answers, "proof");
      Object.assign(settings, { title: proof ? "Éléments de preuve fournis" : "[Ajoutez vos sources ou mentions]", text: "" });
      blocks = proof ? [item(`proof-${index + 1}-1`, "Preuve fournie", proof)] : [];
      break;
    }
    case "quiz": {
      const objective = answer(answers, "objective");
      Object.assign(settings, { title: objective || "[Ajoutez l’objectif du quiz]", subtitle: answer(answers, "steps"), text: answer(answers, "result") });
      blocks = segments.map((segment, blockIndex) => item(`quiz-${index + 1}-${blockIndex + 1}`, objective || `[Question ${blockIndex + 1}]`, segment));
      break;
    }
    case "form":
      Object.assign(settings, { title: first(answer(answers, "destination"), answer(answers, "result")) || "[Ajoutez le titre du formulaire]", text: "", cta_label: cta || "[Ajoutez le libellé du bouton]" });
      break;
    case "collectionGrid":
      Object.assign(settings, { title: answer(answers, "activity") || "[Présentez vos collections]", subtitle: answer(answers, "products"), text: answer(answers, "positioning") });
      blocks = collections.map((title, blockIndex) => item(`collection-${index + 1}-${blockIndex + 1}`, title));
      break;
    case "newsletter":
      Object.assign(settings, { title: "[Ajoutez le titre de votre newsletter]", text: "", cta_label: "[Ajoutez le libellé d’inscription]" });
      break;
    case "testimonials":
      Object.assign(settings, { title: "[Ajoutez uniquement des témoignages réels]", text: "" });
      blocks = [];
      break;
    case "reviews":
      Object.assign(settings, { title: "Avis clients", subtitle: product?.rating === null || product?.rating === undefined ? "" : `${product.rating}/5`, text: "" });
      blocks = (product?.reviews ?? []).map((review, blockIndex) => item(`review-${index + 1}-${blockIndex + 1}`, review.title || review.author, review.text, { author: review.author, rating: review.rating, image: review.image ?? "" }));
      break;
    case "shipping":
      Object.assign(settings, { title: "[Ajoutez vos informations de livraison]", text: "" });
      break;
    case "guarantees":
      Object.assign(settings, { title: "[Ajoutez uniquement vos garanties confirmées]", text: "" });
      break;
    case "faq":
      Object.assign(settings, { title: "Questions fréquentes", text: "" });
      blocks = objections.map((objection, blockIndex) => item(`faq-${index + 1}-${blockIndex + 1}`, objection, "[Ajoutez votre réponse]"));
      break;
    case "steps": {
      const values = segments.length ? segments : benefits;
      Object.assign(settings, { title: answer(answers, "objective") || "[Ajoutez les étapes]", text: "" });
      blocks = values.map((value, blockIndex) => item(`step-${index + 1}-${blockIndex + 1}`, value));
      break;
    }
    case "cta":
      Object.assign(settings, { title: first(answer(answers, "product"), answer(answers, "promise"), answer(answers, "objective"), answer(answers, "result"), productTitle) || "[Ajoutez votre appel à l’action]", text: first(answer(answers, "audience"), selectedPersonas[0]?.insight, productText), cta_label: cta || "[Ajoutez le libellé du bouton]", cta_link: "#action" });
      break;
    case "footer":
      Object.assign(settings, { title: brand || "[Ajoutez le nom de la marque]", text: answer(answers, "identity"), cta_label: "" });
      blocks = collections.map((title, blockIndex) => item(`footer-${index + 1}-${blockIndex + 1}`, title, "", { label: title, link: `#${slugify(title)}` }));
      break;
    default:
      Object.assign(settings, { title: primaryTitle || "[Ajoutez un titre]", text: primaryText });
  }
  return { settings, blocks };
}

export function buildStoreDocument(input: BuildStoreInput): EditorDocument;
export function buildStoreDocument(input: LegacyProductBuildStoreInput): EditorDocument;
export function buildStoreDocument(rawInput: BuildStoreInput | LegacyProductBuildStoreInput): EditorDocument {
  const input: NormalizedBuildStoreInput = { ...rawInput, templateId: rawInput.templateId ?? null, answers: rawInput.answers ?? {} };
  const format = input.creationFormat ?? "store";
  const product = isProductLedCreationFormat(format) ? input.product : undefined;
  if (isProductLedCreationFormat(format) && !product) throw new Error(`A source product is required for ${format} creation`);
  const selected = chooseRecipe(input, format, product);
  const truth = product ? buildProductTruthSheet(product) : undefined;
  const artDirection = truth ? selectArtDirection(truth) : undefined;
  const firstScheme = input.brandKit.schemes[0];
  const secondScheme = input.brandKit.schemes[1];
  const sections = selected.sections.map((type, index) => {
    const content = contentForSection(type, index, input, product);
    return makeSection(type, index, { ...content.settings, variant: selected.variants[type] ?? "default", purpose: selected.purposes[type] ?? "" }, content.blocks);
  });
  const name = input.brandName.trim() || answer(input.answers, "brand") || answer(input.answers, "topic") || "Nouvelle page";
  return {
    version: 2,
    name,
    path: "/",
    kind: pageKind(format),
    modelId: input.modelId,
    templateId: selected.id,
    templateVersion: TEMPLATE_RECIPE_VERSION,
    theme: {
      background: artDirection?.palette[0] ?? firstScheme?.background ?? input.brandKit.palette[0] ?? "#ffffff",
      surface: artDirection?.palette[3] ?? secondScheme?.background ?? input.brandKit.palette[3] ?? "#f4f1ec",
      ink: artDirection?.palette[1] ?? firstScheme?.text ?? "#111111",
      muted: "#6d6963",
      accent: artDirection?.palette[2] ?? firstScheme?.accent ?? input.brandKit.palette[1] ?? "#111111",
      display: "sans",
      radius: "soft",
    },
    pages: [{ id: `page-${slugify(name)}`, name, slug: slugify(name), sections }],
    assets: (product?.images ?? []).map((url, index) => ({ id: `source-image-${index + 1}`, type: "image", url, alt: `${product?.title ?? ""} ${index + 1}`.trim() })),
    ...(product && truth && artDirection ? { commerce: { sourceProduct: product, personas: input.personas, angles: input.angles, brandKit: input.brandKit, storefrontLanguage: input.language, productTruth: truth, artDirection, recipeId: selected.id ?? `recipe-${artDirection.id}` } } : {}),
  };
}
