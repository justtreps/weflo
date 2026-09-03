import type { CreationFormatId } from "./creation-recipe";
import "../sections/index";
import { listSectionPacks } from "../sections/registry";
import type { SectionFamily } from "../sections/types";

export const TEMPLATE_RECIPE_VERSION = 1;

export type TemplateRecipe = {
  id: string;
  format: Exclude<CreationFormatId, "blank">;
  sections: string[];
  variants: Record<string, string>;
};

export const TEMPLATE_RECIPES: TemplateRecipe[] = [
  {
    id: "store-editorial-commerce", format: "store",
    sections: ["announcement", "navigation", "hero", "imageText", "collectionGrid", "productMain", "benefits", "reviews", "newsletter", "footer"],
    variants: { hero: "editorial", imageText: "story", collectionGrid: "curated", productMain: "calm-buy-box", reviews: "editorial-stories" },
  },
  {
    id: "store-conversion-modern", format: "store",
    sections: ["announcement", "navigation", "productHero", "productMain", "benefits", "bundle", "reviews", "shipping", "faq", "cta", "footer"],
    variants: { productHero: "problem-solution", productMain: "conversion-split", benefits: "icon-grid", bundle: "quantity-break", reviews: "results-wall" },
  },
  {
    id: "store-maison-premium", format: "store",
    sections: ["announcement", "navigation", "hero", "collectionGrid", "imageText", "press", "benefits", "productMain", "newsletter", "footer"],
    variants: { hero: "split", collectionGrid: "premium", imageText: "brand-story", press: "press-quotes", productMain: "luxury-buy-box" },
  },
  {
    id: "product-buybox-premium", format: "product",
    sections: ["announcement", "navigation", "productHero", "gallery", "productMain", "benefits", "reviews", "shipping", "faq", "cta", "footer"],
    variants: { productHero: "ambient-editorial", productMain: "premium", reviews: "featured" },
  },
  {
    id: "product-demonstration", format: "product",
    sections: ["navigation", "productHero", "gallery", "imageText", "benefits", "comparison", "productMain", "reviews", "faq", "cta", "footer"],
    variants: { productHero: "problem-solution", gallery: "demonstration", benefits: "visual", comparison: "feature-led", productMain: "technical-buy-box" },
  },
  {
    id: "product-bundle-first", format: "product",
    sections: ["announcement", "navigation", "productHero", "productMain", "bundle", "benefits", "shipping", "reviews", "faq", "cta", "footer"],
    variants: { productHero: "conversion-split", productMain: "bundle-led", bundle: "quantity-break", benefits: "icon-grid" },
  },
  {
    id: "landing-direct-response", format: "landing",
    sections: ["announcement", "navigation", "hero", "benefits", "comparison", "faq", "form", "conversionClose", "cta", "footer"],
    variants: { hero: "direct-response", benefits: "icon-grid", comparison: "feature-led", form: "lead-capture", conversionClose: "offer-stack", cta: "repeated" },
  },
  {
    id: "landing-editorial-premium", format: "landing",
    sections: ["navigation", "hero", "imageText", "richText", "benefits", "faq", "cta", "footer"],
    variants: { hero: "editorial", imageText: "story", richText: "longform", benefits: "editorial" },
  },
  {
    id: "landing-visual-demo", format: "landing",
    sections: ["navigation", "hero", "gallery", "benefits", "steps", "comparison", "form", "cta", "footer"],
    variants: { hero: "visual", gallery: "demonstration", benefits: "diagram", steps: "process", comparison: "feature-led" },
  },
  {
    id: "advertorial-journal", format: "advertorial",
    sections: ["navigation", "advertorialMasthead", "authorLine", "hero", "press", "editorialBody", "richText", "evidenceCallout", "inlineProduct", "imageText", "comparison", "faq", "conversionClose", "cta", "footer"],
    variants: { advertorialMasthead: "journal", authorLine: "byline", hero: "editorial", press: "inline", editorialBody: "longform", richText: "journal", evidenceCallout: "citation", inlineProduct: "compact", imageText: "story", conversionClose: "final-cta" },
  },
  {
    id: "advertorial-founder-story", format: "advertorial",
    sections: ["navigation", "hero", "richText", "imageText", "benefits", "form", "cta", "footer"],
    variants: { hero: "founder", richText: "narrative", imageText: "founder", benefits: "editorial" },
  },
  {
    id: "advertorial-comparison", format: "advertorial",
    sections: ["navigation", "hero", "comparison", "richText", "benefits", "faq", "cta", "footer"],
    variants: { hero: "comparison", comparison: "feature-led", richText: "evidence", benefits: "icon-grid" },
  },
  {
    id: "quiz-diagnostic", format: "quiz",
    sections: ["navigation", "hero", "quizProgress", "quizQuestion", "benefits", "quiz", "quizResult", "productRecommendation", "leadCapture", "form", "faq", "cta", "footer"],
    variants: { hero: "diagnostic", quizProgress: "steps", quizQuestion: "single-choice", quiz: "diagnostic", quizResult: "profile", productRecommendation: "best-for", leadCapture: "consent", form: "stepper", benefits: "icon-grid" },
  },
  {
    id: "quiz-routine", format: "quiz",
    sections: ["navigation", "hero", "richText", "quiz", "benefits", "form", "newsletter", "footer"],
    variants: { hero: "editorial", richText: "routine", quiz: "routine", benefits: "editorial" },
  },
  {
    id: "quiz-recommendation", format: "quiz",
    sections: ["announcement", "navigation", "hero", "quiz", "comparison", "form", "cta", "footer"],
    variants: { hero: "recommendation", quiz: "recommendation", comparison: "result", form: "stepper", cta: "result" },
  },
  {
    id: "home-brand-editorial", format: "home",
    sections: ["announcement", "navigation", "hero", "imageText", "collectionGrid", "testimonials", "newsletter", "footer"],
    variants: { hero: "editorial", imageText: "brand-story", collectionGrid: "curated", testimonials: "editorial-stories" },
  },
  {
    id: "home-catalogue-premium", format: "home",
    sections: ["announcement", "navigation", "hero", "collectionGrid", "benefits", "imageText", "newsletter", "footer"],
    variants: { hero: "catalogue", collectionGrid: "premium", benefits: "icon-grid", imageText: "editorial" },
  },
  {
    id: "home-story-first", format: "home",
    sections: ["navigation", "hero", "richText", "imageText", "press", "collectionGrid", "newsletter", "footer"],
    variants: { hero: "story", richText: "manifesto", imageText: "brand-story", press: "press-quotes", collectionGrid: "curated" },
  },
  {
    id: "blog-magazine", format: "blog",
    sections: ["navigation", "hero", "listicleIndex", "numberedReason", "richText", "comparisonInsert", "imageText", "productRecommendation", "press", "newsletter", "footer"],
    variants: { hero: "magazine", listicleIndex: "numbered", numberedReason: "editorial", richText: "longform", comparisonInsert: "quick-table", imageText: "editorial", productRecommendation: "editor-choice", press: "inline" },
  },
  {
    id: "blog-guide", format: "blog",
    sections: ["navigation", "hero", "richText", "benefits", "faq", "newsletter", "footer"],
    variants: { hero: "guide", richText: "guide", benefits: "steps", faq: "inline" },
  },
  {
    id: "blog-study", format: "blog",
    sections: ["navigation", "hero", "richText", "comparison", "press", "newsletter", "footer"],
    variants: { hero: "study", richText: "analysis", comparison: "evidence", press: "sources" },
  },
];

const recipesById = new Map(TEMPLATE_RECIPES.map((recipe) => [recipe.id, recipe]));

export function recipeForTemplate(id: string): TemplateRecipe {
  const recipe = recipesById.get(id);
  if (!recipe) throw new Error(`Unknown template recipe: ${id}`);
  return recipe;
}

export function defaultRecipeForFormat(format: Exclude<CreationFormatId, "blank">): TemplateRecipe {
  const recipe = TEMPLATE_RECIPES.find((candidate) => candidate.format === format);
  if (!recipe) throw new Error(`No template recipe registered for ${format}`);
  return recipe;
}

/** Registry-driven helper used by page-format catalogues and recipe validation. */
export function packTypesFor(family: SectionFamily): string[] {
  return listSectionPacks().filter((pack) => pack.families.includes(family)).map((pack) => pack.type);
}

const FORMAT_REQUIRED_TYPES: Record<"advertorial" | "listicle" | "quiz" | "landing", string[]> = {
  advertorial: ["advertorialMasthead", "editorialBody", "evidenceCallout", "inlineProduct", "conversionClose"],
  listicle: ["listicleIndex", "numberedReason", "comparisonInsert", "productRecommendation"],
  quiz: ["quizProgress", "quizQuestion", "quizResult", "productRecommendation", "leadCapture"],
  landing: ["conversionClose"],
};

export function validateRecipe(format: keyof typeof FORMAT_REQUIRED_TYPES): { missing: string[] } {
  const available = new Set(listSectionPacks().map((pack) => pack.type));
  return { missing: FORMAT_REQUIRED_TYPES[format].filter((type) => !available.has(type)) };
}
