import type { EditorDocument, EditorSection } from "../editor/document";
import type { BrandKit, ImportedProduct } from "../onboarding/types";
import type { PageTheme } from "../types";

export type PreviewArchetype = "beauty" | "home" | "gadget" | "fashion" | "sport" | "wellness" | "food" | "design";
export type PreviewViewport = "desktop" | "mobile";

export type SectionPreviewFixture = {
  id: string;
  archetypes: PreviewArchetype[];
  brand: BrandKit & { name: string };
  theme: PageTheme;
  product: ImportedProduct;
  previewOnly: {
    benefits: Array<{ title: string; text: string }>;
    reviews: Array<{ author: string; title: string; text: string; rating: number }>;
    faqs: Array<{ question: string; answer: string }>;
    bundles: Array<{ title: string; quantity: number; price: string; badge?: string }>;
  };
};

export type MaterializeInput = { document: EditorDocument; sectionType: string; variantId: string; sectionId: string };
export type MaterializeResult = { section: EditorSection; missingFields: string[] };
