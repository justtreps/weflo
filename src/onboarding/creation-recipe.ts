import type { ArtDirectionProfile } from "./types";
import { defaultRecipeForFormat, recipeForTemplate } from "./template-recipe";

export type CreationFormatId = "store" | "product" | "landing" | "advertorial" | "quiz" | "home" | "blog" | "blank";

const CREATION_FORMATS = new Set<CreationFormatId>(["store", "product", "landing", "advertorial", "quiz", "home", "blog", "blank"]);

export function isCreationFormat(value: unknown): value is CreationFormatId {
  return typeof value === "string" && CREATION_FORMATS.has(value as CreationFormatId);
}

export function isProductLedCreationFormat(format: CreationFormatId): format is "store" | "product" {
  return format === "store" || format === "product";
}

export function sectionTypesForCreation(format: CreationFormatId, _profile: ArtDirectionProfile["id"], _proof: "reviews" | "testimonials", templateId?: string | null): string[] {
  if (format === "blank") return [];
  const recipe = templateId ? recipeForTemplate(templateId) : defaultRecipeForFormat(format);
  if (recipe.format !== format) throw new Error(`Template ${recipe.id} is not compatible with ${format}`);
  return [...recipe.sections];
}
