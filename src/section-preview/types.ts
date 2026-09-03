import type { EditorDocument, EditorSection } from "../editor/document";
import type { BrandKit, ImportedProduct } from "../onboarding/types";
import type { PageTheme } from "../types";

/**
 * The catalog deliberately owns a presentation-shaped type instead of leaking
 * the registry contract into the editor.  Packs can add metadata over time and
 * the adapter in `manifests.ts` will pick it up without forcing old packs to
 * migrate in lockstep.
 */
export type SectionCatalogFamily =
  | "headers-navigation" | "heroes" | "product-purchase" | "variants-options"
  | "bundles-offers" | "subscriptions-preorders" | "benefits" | "demo-media"
  | "before-after" | "reviews-ugc" | "comparison" | "ingredients-materials"
  | "collections-recommendations" | "brand-story" | "advertorial" | "listicle"
  | "quiz-forms" | "faq-trust" | "conversion-capture" | "footer-utilities" | "custom";

export type SectionCapabilityState = "native" | "app-required" | "unavailable";

export type SectionCatalogQuery = {
  family?: SectionCatalogFamily;
  /** Legacy category support, retained for existing editor integrations. */
  category?: string;
  search?: string;
  pageKind?: string;
  market?: string;
  capability?: string;
  sort?: "recommended" | "newest" | "popular";
};

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
