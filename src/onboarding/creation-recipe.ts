import type { ArtDirectionProfile } from "./types";

export type CreationFormatId = "store" | "product" | "landing" | "advertorial" | "quiz" | "home" | "blog" | "blank";

const FORMAT_RECIPES: Record<Exclude<CreationFormatId, "store">, string[]> = {
  product: ["announcement", "navigation", "productHero", "gallery", "productMain", "benefits", "reviews", "bundle", "shipping", "faq", "cta", "footer"],
  landing: ["announcement", "navigation", "hero", "benefits", "imageText", "comparison", "reviews", "productMain", "guarantees", "faq", "cta", "footer"],
  advertorial: ["navigation", "hero", "press", "richText", "imageText", "benefits", "reviews", "comparison", "productMain", "guarantees", "faq", "cta", "footer"],
  quiz: ["navigation", "hero", "benefits", "quiz", "form", "testimonials", "productMain", "guarantees", "faq", "cta", "footer"],
  home: ["announcement", "navigation", "hero", "collectionGrid", "imageText", "benefits", "testimonials", "newsletter", "footer"],
  blog: ["navigation", "hero", "richText", "imageText", "press", "newsletter", "footer"],
  blank: ["navigation", "hero", "footer"],
};

export function isCreationFormat(value: unknown): value is CreationFormatId {
  return typeof value === "string" && (value === "store" || value in FORMAT_RECIPES);
}

export function sectionTypesForCreation(format: CreationFormatId, _profile: ArtDirectionProfile["id"], proof: "reviews" | "testimonials"): string[] {
  if (format === "store") return [];
  return FORMAT_RECIPES[format].map((type) => type === "reviews" ? proof : type);
}
