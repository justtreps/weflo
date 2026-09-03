import type { CreationFormatId } from "../onboarding/creation-recipe";
import templatePreviewManifest from "../../public/template-previews/manifest.json";

export type CreationSource = "link" | "image" | "description" | "shopify";
export type IntakeField = { id: string; label: string; placeholder: string; kind: "text" | "textarea" | "list"; required: boolean };
export type CreationTemplate = {
  id: string; format: CreationFormatId; name: string; description: string;
  artProfile: "editorial" | "conversion" | "minimal";
  sectionVariants: Record<string, string>;
  previewDesktop: string; previewMobile: string;
};
export type FormatFlow = {
  id: CreationFormatId; title: string; description: string; pageType: "sell" | "write" | "blank";
  allowedSources: CreationSource[]; intake: IntakeField[]; templates: CreationTemplate[];
};

const TEMPLATE_IDS = {
  store: ["store-editorial-commerce", "store-conversion-modern", "store-maison-premium"],
  product: ["product-buybox-premium", "product-demonstration", "product-bundle-first"],
  landing: ["landing-direct-response", "landing-editorial-premium", "landing-visual-demo"],
  advertorial: ["advertorial-journal", "advertorial-founder-story", "advertorial-comparison"],
  quiz: ["quiz-diagnostic", "quiz-routine", "quiz-recommendation"],
  home: ["home-brand-editorial", "home-catalogue-premium", "home-story-first"],
  blog: ["blog-magazine", "blog-guide", "blog-study"],
  blank: [],
} as const;

type TemplateDetails = Pick<CreationTemplate, "name" | "description" | "artProfile" | "sectionVariants">;

const templateDetails: Record<string, TemplateDetails> = {
  "store-editorial-commerce": { name: "Commerce éditorial", description: "Une boutique guidée par l’univers de marque.", artProfile: "editorial", sectionVariants: { hero: "editorial", collectionGrid: "curated" } },
  "store-conversion-modern": { name: "Conversion moderne", description: "Une boutique pensée pour guider rapidement vers l’achat.", artProfile: "conversion", sectionVariants: { hero: "conversion", productMain: "buybox" } },
  "store-maison-premium": { name: "Maison premium", description: "Une composition raffinée pour les collections haut de gamme.", artProfile: "minimal", sectionVariants: { hero: "split", collectionGrid: "premium" } },
  "product-buybox-premium": { name: "Fiche produit premium", description: "Une fiche produit détaillée avec une offre claire.", artProfile: "conversion", sectionVariants: { productMain: "premium", reviews: "featured" } },
  "product-demonstration": { name: "Démonstration produit", description: "Une fiche centrée sur l’usage et les bénéfices.", artProfile: "editorial", sectionVariants: { hero: "demonstration", benefits: "visual" } },
  "product-bundle-first": { name: "Offre groupée", description: "Une fiche qui met les packs et quantités en avant.", artProfile: "conversion", sectionVariants: { productMain: "bundle-led", bundle: "quantity-break" } },
  "landing-direct-response": { name: "Réponse directe", description: "Une page de campagne focalisée sur une action.", artProfile: "conversion", sectionVariants: { hero: "direct-response", cta: "repeated" } },
  "landing-editorial-premium": { name: "Éditorial premium", description: "Une landing page narrative et haut de gamme.", artProfile: "editorial", sectionVariants: { hero: "editorial", imageText: "story" } },
  "landing-visual-demo": { name: "Démonstration visuelle", description: "Une page qui rend le mécanisme visible dès le départ.", artProfile: "minimal", sectionVariants: { hero: "visual", benefits: "diagram" } },
  "advertorial-journal": { name: "Journal", description: "Un récit éditorial qui mène naturellement vers l’offre.", artProfile: "editorial", sectionVariants: { richText: "journal", press: "inline" } },
  "advertorial-founder-story": { name: "Histoire du fondateur", description: "Un témoignage de marque personnel et crédible.", artProfile: "editorial", sectionVariants: { hero: "founder", richText: "narrative" } },
  "advertorial-comparison": { name: "Comparatif", description: "Une argumentation structurée autour des différences produit.", artProfile: "conversion", sectionVariants: { comparison: "feature-led", productMain: "inline" } },
  "quiz-diagnostic": { name: "Diagnostic", description: "Un parcours de questions pour qualifier un besoin.", artProfile: "minimal", sectionVariants: { quiz: "diagnostic", form: "stepper" } },
  "quiz-routine": { name: "Routine", description: "Un questionnaire qui compose une routine personnalisée.", artProfile: "editorial", sectionVariants: { quiz: "routine", productMain: "recommendation" } },
  "quiz-recommendation": { name: "Recommandation", description: "Un funnel qui mène vers une recommandation utile.", artProfile: "conversion", sectionVariants: { quiz: "recommendation", cta: "result" } },
  "home-brand-editorial": { name: "Éditorial de marque", description: "Une vitrine de marque riche en histoire et en collections.", artProfile: "editorial", sectionVariants: { hero: "editorial", imageText: "brand-story" } },
  "home-catalogue-premium": { name: "Catalogue premium", description: "Une page d’accueil qui donne la priorité aux collections.", artProfile: "minimal", sectionVariants: { hero: "catalogue", collectionGrid: "premium" } },
  "home-story-first": { name: "L’histoire d’abord", description: "Une page d’accueil qui présente d’abord le récit de marque.", artProfile: "editorial", sectionVariants: { hero: "story", richText: "manifesto" } },
  "blog-magazine": { name: "Magazine", description: "Un article de marque avec une lecture éditoriale forte.", artProfile: "editorial", sectionVariants: { hero: "magazine", richText: "longform" } },
  "blog-guide": { name: "Guide", description: "Un contenu pratique, structuré pour être facilement consulté.", artProfile: "minimal", sectionVariants: { richText: "guide", faq: "inline" } },
  "blog-study": { name: "Étude", description: "Une analyse approfondie avec preuves et sources.", artProfile: "editorial", sectionVariants: { hero: "study", press: "sources" } },
};

type TemplatePreviewManifest = Record<string, { desktop: string; mobile: string }>;
const generatedTemplatePreviews = templatePreviewManifest as TemplatePreviewManifest;

function template(id: string, format: CreationFormatId): CreationTemplate {
  const details = templateDetails[id];
  if (!details) throw new Error(`Missing creation template details for ${id}`);
  const generated = generatedTemplatePreviews[id];
  return {
    id,
    format,
    ...details,
    previewDesktop: generated?.desktop ?? `/template-previews/${id}-desktop.webp`,
    previewMobile: generated?.mobile ?? `/template-previews/${id}-mobile.webp`,
  };
}

function fields(...intake: IntakeField[]): IntakeField[] { return intake; }
const field = (id: string, label: string, placeholder: string, kind: IntakeField["kind"] = "text", required = true): IntakeField => ({ id, label, placeholder, kind, required });
const productSources = ["link", "image", "shopify"] as CreationSource[];

export const FORMAT_FLOWS: FormatFlow[] = [
  { id: "store", title: "Boutique complète", description: "Accueil, produit, offre et confiance", pageType: "sell", allowedSources: productSources, intake: fields(field("activity", "Activité", "Ex. soins naturels pour peaux sensibles"), field("positioning", "Positionnement", "Ce qui rend votre marque différente", "textarea"), field("collections", "Collections", "Ex. Visage, corps, coffrets", "list"), field("products", "Nombre de produits", "Ex. 12"), field("identity", "Identité de marque", "Ton, univers et références", "textarea"), field("objective", "Objectif", "Ex. présenter la marque et vendre", "textarea")), templates: TEMPLATE_IDS.store.map((id) => template(id, "store")) },
  { id: "product", title: "Page produit", description: "Une fiche de vente Shopify complète", pageType: "sell", allowedSources: productSources, intake: fields(field("benefits", "Bénéfices", "Les bénéfices essentiels", "list"), field("objections", "Objections", "Les freins à lever", "list"), field("offer", "Offre", "Prix, bundle ou garantie", "textarea"), field("variants", "Variantes", "Tailles, couleurs ou déclinaisons", "list"), field("proof", "Preuves disponibles", "Études, certifications ou témoignages", "textarea", false)), templates: TEMPLATE_IDS.product.map((id) => template(id, "product")) },
  { id: "landing", title: "Landing page", description: "Une campagne, une promesse, une action", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("campaign", "Campagne", "Le nom ou contexte de la campagne"), field("audience", "Audience", "À qui la page doit-elle parler ?", "textarea"), field("promise", "Promesse", "Le résultat principal proposé", "textarea"), field("traffic", "Source du trafic", "Ex. Meta Ads, email, recherche"), field("cta", "Action attendue", "Ex. Découvrir l’offre")), templates: TEMPLATE_IDS.landing.map((id) => template(id, "landing")) },
  { id: "advertorial", title: "Advertorial", description: "Un récit éditorial qui mène vers l’offre", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("angle", "Angle narratif", "L’idée centrale de l’article", "textarea"), field("author", "Auteur", "Qui porte ce récit ?"), field("proof", "Niveau de preuve", "Études, expérience ou démonstration", "textarea"), field("product", "Produit final", "Le produit ou l’offre vers lequel conduire")), templates: TEMPLATE_IDS.advertorial.map((id) => template(id, "advertorial")) },
  { id: "quiz", title: "Quiz et funnel", description: "Questions, recommandation et capture", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("objective", "Objectif", "Le résultat que doit produire le quiz", "textarea"), field("segments", "Segments", "Les profils ou besoins à distinguer", "list"), field("result", "Recommandation", "Ce que chaque profil doit recevoir", "textarea"), field("steps", "Nombre d’étapes", "Ex. 5", "text", false), field("destination", "Destination des réponses", "Ex. une recommandation produit", "textarea", false)), templates: TEMPLATE_IDS.quiz.map((id) => template(id, "quiz")) },
  { id: "home", title: "Page d’accueil", description: "La vitrine complète d’une marque", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("brand", "Nom de la marque", "Le nom affiché sur votre page"), field("activity", "Activité", "Ex. objets durables pour la maison"), field("promise", "Promesse", "La promesse principale de la marque", "textarea"), field("collections", "Collections principales", "Ex. Nouveautés, best-sellers, cadeaux", "list"), field("story", "Histoire de la marque", "Ce que vous voulez raconter", "textarea")), templates: TEMPLATE_IDS.home.map((id) => template(id, "home")) },
  { id: "blog", title: "Article de blog", description: "Contenu de marque structuré et lisible", pageType: "write", allowedSources: ["description", "shopify"], intake: fields(field("topic", "Sujet", "Le thème de l’article"), field("intent", "Intention de recherche", "La question à laquelle répondre", "textarea"), field("angle", "Angle", "Votre point de vue ou approche", "textarea"), field("relatedProducts", "Produits liés", "Les produits à citer si nécessaire", "list", false)), templates: TEMPLATE_IDS.blog.map((id) => template(id, "blog")) },
  { id: "blank", title: "Page vierge", description: "Construire librement dans l’éditeur", pageType: "blank", allowedSources: [], intake: [], templates: [] },
];

export function flowForFormat(id: CreationFormatId): FormatFlow {
  const flow = FORMAT_FLOWS.find((candidate) => candidate.id === id);
  if (!flow) throw new Error(`Unknown creation format: ${id}`);
  return flow;
}

export function templatesForFormat(id: CreationFormatId): CreationTemplate[] {
  return flowForFormat(id).templates;
}

export function templateById(id: string): CreationTemplate {
  const template = FORMAT_FLOWS.flatMap((flow) => flow.templates).find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Unknown creation template: ${id}`);
  return template;
}
