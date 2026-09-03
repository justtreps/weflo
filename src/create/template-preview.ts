import type { EditorBlock, EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { renderEditorDocument } from "../editor/render/render-document";
import { buildStoreDocument } from "../onboarding/compile-store";
import { recipeForTemplate } from "../onboarding/template-recipe";
import type { ImportedProduct } from "../onboarding/types";
import { fixtureById } from "../section-preview/fixtures";
import { getSectionDefinition } from "../sections/index";
import type { CreationTemplate } from "./format-flow";

export type TemplatePreviewViewport = "desktop" | "mobile";

const fixtureByTemplate: Record<string, string> = {
  "store-editorial-commerce": "aurea-serum", "store-conversion-modern": "pulse-recovery", "store-maison-premium": "forma-table",
  "product-buybox-premium": "noma-bag", "product-demonstration": "halo-lamp", "product-bundle-first": "pulse-recovery",
  "landing-direct-response": "pulse-recovery", "landing-editorial-premium": "aurea-serum", "landing-visual-demo": "halo-lamp",
  "advertorial-journal": "brume-coffee", "advertorial-founder-story": "forma-table", "advertorial-comparison": "halo-lamp",
  "quiz-diagnostic": "aurea-serum", "quiz-routine": "aurea-serum", "quiz-recommendation": "pulse-recovery",
  "home-brand-editorial": "noma-bag", "home-catalogue-premium": "forma-table", "home-story-first": "brume-coffee",
  "blog-magazine": "noma-bag", "blog-guide": "forma-table", "blog-study": "pulse-recovery",
};

const previewAnswers: Record<string, string> = {
  activity: "Objets pensés pour le quotidien", positioning: "Des objets utiles, bien dessinés et faits pour durer.", collections: "Nouveautés\nEssentiels\nIdées cadeaux",
  products: "12", identity: "Calme, matière, précision", objective: "Découvrir une sélection choisie", benefits: "Simple à utiliser\nPensé avec précision\nFait pour durer",
  objections: "Est-ce facile à utiliser ?\nComment cela s’intègre-t-il au quotidien ?\nPuis-je changer d’avis ?", offer: "Une sélection à composer selon votre rythme.", variants: "Classique\nDuo\nCollection",
  proof: "Démonstration fictive pour présenter la mise en page.", campaign: "Une sélection pour ralentir", audience: "Les personnes qui cherchent des objets simples et durables.",
  promise: "Faire de la place aux choses qui comptent.", traffic: "Découverte", cta: "Découvrir l’exemple", angle: "Choisir moins, choisir mieux.", author: "L’équipe Atelier",
  product: "La pièce présentée dans cet exemple", segments: "Premier besoin\nUsage régulier\nChoix éclairé", result: "Une recommandation adaptée à vos réponses.", steps: "3",
  destination: "Recevoir une recommandation", brand: "Atelier fictif", story: "Une démonstration fictive de la hiérarchie, du rythme et de la lecture d’une page.",
  topic: "Comment choisir un objet qui vous suit longtemps", intent: "Repérer les critères utiles avant de choisir.", relatedProducts: "La sélection du moment\nLe guide des matières",
};

function fictitiousProduct(templateId: string): ImportedProduct {
  const fixture = fixtureById(fixtureIdForTemplate(templateId));
  return {
    ...fixture.product,
    images: fixture.product.images.map((_, index) => `https://template-preview-fixture.local/${fixture.id}-${index + 1}.svg`),
    reviews: fixture.previewOnly.reviews.map((review) => ({ ...review })),
  };
}

function fixtureIdForTemplate(templateId: string): string {
  const id = fixtureByTemplate[templateId];
  if (!id) throw new Error(`Unknown template preview: ${templateId}`);
  return id;
}

function previewBlocks(type: string, sectionId: string, product: ImportedProduct): EditorBlock[] {
  const fixture = fixtureById(fixtureIdForTemplateIdFromProduct(product));
  const item = (suffix: string, title: string, text = "", extra: Record<string, SettingValue> = {}): EditorBlock => ({ id: `${sectionId}-${suffix}`, type: "item", settings: { title, text, ...extra } });
  if (type === "testimonials" || type === "reviews") return product.reviews.map((review, index) => item(`review-${index + 1}`, review.title || review.author, review.text, { author: review.author, rating: review.rating ?? 5, image: review.image ?? product.images[index % product.images.length] }));
  if (type === "benefits") return fixture.previewOnly.benefits.map((benefit, index) => item(`benefit-${index + 1}`, benefit.title, benefit.text));
  if (type === "faq") return fixture.previewOnly.faqs.map((faq, index) => item(`faq-${index + 1}`, faq.question, faq.answer));
  if (type === "gallery") return product.images.map((image, index) => item(`image-${index + 1}`, `Vue ${index + 1}`, "", { image, image_alt: product.title }));
  if (type === "collectionGrid") return ["Nouveautés", "Les essentiels", "Pour offrir"].map((title, index) => item(`collection-${index + 1}`, title, "Une sélection fictive."));
  if (type === "navigation" || type === "footer") return ["Découvrir", "La sélection", "Le journal"].map((title, index) => item(`link-${index + 1}`, title, "", { label: title, link: `#${index + 1}` }));
  if (type === "comparison" || type === "steps" || type === "quiz") return ["Observer", "Choisir", "Profiter"].map((title, index) => item(`step-${index + 1}`, title, "Exemple fictif à personnaliser."));
  return [];
}

function fixtureIdForTemplateIdFromProduct(product: ImportedProduct): string {
  const match = product.sourceUrl.match(/demo\.weflo\.app\/([^/]+)$/);
  if (!match) throw new Error("Template preview requires a fixture product");
  return match[1]!;
}

function decoratePreviewDocument(document: EditorDocument, templateId: string, product: ImportedProduct): EditorDocument {
  const fixture = fixtureById(fixtureIdForTemplate(templateId));
  const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: product.currency }).format(product.price ?? 0);
  const sections = document.pages[0]!.sections.map((section, index): EditorSection => {
    const definition = getSectionDefinition(section.type);
    if (!definition) throw new Error(`Unknown section type: ${section.type}`);
    const settings: Record<string, SettingValue> = {
      ...definition.defaults,
      ...section.settings,
      title: section.type === "navigation" || section.type === "footer" ? fixture.brand.name : product.title,
      subtitle: "Exemple fictif",
      text: product.description,
      body: product.description,
      image: product.images[index % product.images.length]!,
      image_alt: product.title,
      price: money,
      compare_at_price: product.compareAtPrice ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: product.currency }).format(product.compareAtPrice) : "",
      cta_label: "Découvrir l’exemple",
      previewOnly: true,
      previewFixtureId: fixture.id,
    };
    return { ...section, settings, blocks: previewBlocks(section.type, section.id, product) };
  });
  return {
    ...document,
    name: `Exemple fictif — ${fixture.brand.name}`,
    pages: [{ ...document.pages[0]!, sections }],
    assets: product.images.map((url, index) => ({ id: `preview-fixture-${index + 1}`, type: "image", url, alt: product.title })),
    commerce: {
      sourceProduct: product,
      personas: [],
      angles: [],
      brandKit: fixture.brand,
      storefrontLanguage: "fr",
    },
  };
}

export function previewDocumentForTemplate(templateId: string): EditorDocument {
  const recipe = recipeForTemplate(templateId);
  const fixture = fixtureById(fixtureIdForTemplate(templateId));
  const common = { language: "fr", brandName: fixture.brand.name, modelId: "template-preview-fixture", personas: [], angles: [], brandKit: fixture.brand, templateId, answers: previewAnswers };
  const product = fictitiousProduct(templateId);
  const document = recipe.format === "store" || recipe.format === "product"
    ? buildStoreDocument({ ...common, creationFormat: recipe.format, product })
    : buildStoreDocument({ ...common, creationFormat: recipe.format });
  return decoratePreviewDocument(document, templateId, product);
}

export function renderTemplatePreview(templateId: string, viewport: TemplatePreviewViewport): string {
  const html = renderEditorDocument(previewDocumentForTemplate(templateId), { mode: "preview", breakpoint: viewport });
  return html
    .replace("<body ", '<body data-template-preview="true" data-preview-fixture="true" ')
    .replace("</body>", '<aside class="template-preview-fixture-label" aria-label="Exemple fictif">Exemple fictif</aside></body>');
}

export function templatePreviewPaths(template: CreationTemplate): { desktop: string; mobile: string } {
  return { desktop: `/template-previews/${template.id}-desktop.webp`, mobile: `/template-previews/${template.id}-mobile.webp` };
}
