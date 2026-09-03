import type { EditorDocument, EditorPageKind, SettingValue } from "../editor/document";
import type { SectionCapability } from "../sections/types";
import type { CreationFormatId } from "./creation-recipe";
import type { DesignProfile } from "../design/profile";

export type OnboardingStatus = "extracting" | "analysing" | "questions" | "building" | "ready" | "claimed" | "failed";
export type BuildStageState = "waiting" | "running" | "complete" | "failed";
export type BuildStage = { id: string; label: string; state: BuildStageState };

export type ImportedProduct = {
  sourceUrl: string;
  title: string;
  description: string;
  vendor: string;
  currency: string;
  price: number | null;
  compareAtPrice: number | null;
  images: string[];
  variants: Array<{ id: string; title: string; price: number | null; image?: string }>;
  rating: number | null;
  reviewCount: number | null;
  reviews: Array<{ author: string; rating: number | null; title: string; text: string; image?: string }>;
};

export type ShopifyCatalogProduct = ImportedProduct & { id: string };

export type ProductTruthSheet = {
  observedFacts: Pick<ImportedProduct, "sourceUrl" | "title" | "description" | "vendor" | "currency" | "price" | "compareAtPrice" | "images" | "variants" | "rating" | "reviewCount" | "reviews">;
  supplierClaims: string[];
  inferences: string[];
  searchText: string;
};

export type ArtDirectionId = "editorial-beauty" | "clinical-wellness" | "technical-performance" | "warm-home" | "playful-gifting" | "premium-accessories" | "food-craft" | "direct-response";
export type ArtDirectionProfile = {
  id: ArtDirectionId;
  label: string;
  headingFont: string;
  bodyFont: string;
  mediaRatio: "portrait" | "square" | "landscape";
  spacing: "compact" | "balanced" | "airy";
  radius: "none" | "soft" | "round";
  proofMode: "editorial" | "clinical" | "technical" | "community";
  buttonStyle: "solid" | "outline" | "pill";
  palette: string[];
};

export type BuyerPersona = { id: string; title: string; insight: string; icon: string; tags: string[]; selected: boolean };
export type MarketingAngle = { id: string; title: string; description: string; icon: string; tags: string[]; selected: boolean };
export type BrandKit = {
  palette: string[];
  headingFont: string;
  bodyFont: string;
  schemes: Array<{ name: string; background: string; text: string; accent: string }>;
};

/** The nine questions are deliberately stable: they are persisted in drafts. */
export type WizardStepId = "source" | "audience" | "problem-outcome" | "reasons-to-buy" | "offer" | "brand-personality" | "market" | "page-scope" | "review";
export type WizardSuggestion = { id: string; title: string; explanation: string; tags: string[] };
export type WizardAnswer = { stepId: WizardStepId; selectedSuggestionIds: string[]; customText: string; acceptedAt: string };
export type WizardState = { currentStep: WizardStepId; answers: WizardAnswer[]; suggestions: Partial<Record<WizardStepId, WizardSuggestion[]>> };

export type BlueprintPage = { id: string; kind: EditorPageKind; name: string; slug: string };
export type BlueprintSection = {
  pageId: string;
  sectionType: string;
  variantId: string;
  purpose: string;
  content: Record<string, SettingValue>;
  bindings: Record<string, string>;
  requiredCapabilities: SectionCapability[];
};
export type StoreBlueprint = {
  version: 1;
  name: string;
  market: string;
  language: string;
  currency: string;
  designProfile: DesignProfile;
  pages: BlueprintPage[];
  sections: BlueprintSection[];
};

export type OnboardingDraft = {
  version: 1;
  id: string;
  status: OnboardingStatus;
  claimTokenHash: string;
  sourceUrl: string;
  product: ImportedProduct | null;
  language: string;
  modelId: string | null;
  creationFormat: CreationFormatId;
  templateId: string | null;
  answers: Record<string, string>;
  brandNames: string[];
  brandName: string;
  personas: BuyerPersona[];
  angles: MarketingAngle[];
  brandKit: BrandKit | null;
  stages: BuildStage[];
  wizard: WizardState;
  blueprint: StoreBlueprint | null;
  document: EditorDocument | null;
  error: string | null;
  claimedUserId: string | null;
  claimedPageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOnboardingDraftInput = Omit<OnboardingDraft, "id" | "createdAt" | "updatedAt">;
export type OnboardingDraftPatch = Partial<Omit<OnboardingDraft, "version" | "id" | "claimTokenHash" | "createdAt" | "updatedAt">>;
