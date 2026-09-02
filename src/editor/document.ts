import type { PageTheme } from "../types";
import type { ArtDirectionProfile, BrandKit, BuyerPersona, ImportedProduct, MarketingAngle, ProductTruthSheet } from "../onboarding/types";

export type EditorPageKind = "landing" | "product" | "collection" | "home";
export type EditorAssetType = "image" | "video";
export type EditorBreakpoint = "desktop" | "tablet" | "mobile";
export type SettingPrimitive = string | number | boolean | null;
export type SettingValue = SettingPrimitive | SettingPrimitive[];
export type StyleValue = string | number | boolean | null;
export type StyleSettings = Record<string, StyleValue>;
export type ResponsiveSettings = Partial<Record<EditorBreakpoint, StyleSettings>>;

export type EditorBlock = {
  id: string;
  type: string;
  settings: Record<string, SettingValue>;
};

export type EditorSection = {
  id: string;
  type: string;
  name: string;
  hidden: boolean;
  locked: boolean;
  settings: Record<string, SettingValue>;
  style: StyleSettings;
  responsive: ResponsiveSettings;
  blocks: EditorBlock[];
};

export type EditorPage = {
  id: string;
  name: string;
  slug: string;
  sections: EditorSection[];
};

export type AssetReference = {
  id: string;
  type: EditorAssetType;
  url: string;
  alt?: string;
};

export type ShopifyBindings = {
  productId?: string;
  collectionId?: string;
  menuId?: string;
  publicationStrategy?: "active" | "duplicate_active" | "new_weflo";
  themeId?: string;
};

export type EditorCommerce = {
  sourceProduct: ImportedProduct;
  personas: BuyerPersona[];
  angles: MarketingAngle[];
  brandKit: BrandKit;
  storefrontLanguage: string;
  productTruth?: ProductTruthSheet;
  artDirection?: ArtDirectionProfile;
  recipeId?: string;
};

export type EditorDocument = {
  version: 2;
  name: string;
  path: string;
  kind: EditorPageKind;
  modelId?: string;
  theme: PageTheme;
  pages: EditorPage[];
  assets: AssetReference[];
  commerce?: EditorCommerce;
  shopify?: ShopifyBindings;
};

export function isEditorDocument(value: unknown): value is EditorDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EditorDocument>;
  return candidate.version === 2 && Array.isArray(candidate.pages);
}
