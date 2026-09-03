import type { EditorBlock, EditorPageKind, EditorSection, SettingValue } from "../editor/document";
import type { InspectorControl } from "../editor/section-schema";

export type SectionCapability =
  | "product-form" | "variant-selection" | "quantity-breaks"
  | "collection-binding" | "recommendations" | "fixed-bundle"
  | "custom-bundle" | "discount-rules" | "selling-plan" | "preorder" | "cart-drawer"
  | "app-blocks" | "markets" | "localization";

export type SectionFamily =
  | "headers-navigation" | "heroes" | "product-purchase" | "variants-options"
  | "bundles-offers" | "subscriptions-preorders" | "benefits" | "demo-media"
  | "before-after" | "reviews-ugc" | "comparison" | "ingredients-materials"
  | "collections-recommendations" | "brand-story" | "advertorial" | "listicle"
  | "quiz-forms" | "faq-trust" | "conversion-capture" | "footer-utilities" | "custom"
  | "product-hero" | "buy-box" | "variant-selector" | "quantity-offer"
  | "fixed-bundle" | "benefits-results" | "product-media" | "reviews-ugc-premium"
  | "recommendations";

export type SectionCategory = "brand" | "media" | "commerce" | "conversion" | "content" | "layout";

export type SectionRenderContext = {
  section: EditorSection;
  pageName: string;
  editor?: boolean;
};

export type BlockDefinition = {
  type: string;
  name: string;
  defaults: Record<string, SettingValue>;
  settings: InspectorControl[];
};

export type SectionDefinition = {
  type: string;
  name: string;
  category: SectionCategory;
  defaults: Record<string, SettingValue>;
  settings: InspectorControl[];
  blocks: BlockDefinition[];
  previewVariants?: string[];
  renderWeb(context: SectionRenderContext): string;
  renderLiquid(section?: EditorSection): string;
};

export type SectionVariantDefinition = {
  id: string;
  name: string;
  description: string;
  /** A concise description of a structural or interaction difference. */
  composition: string;
  /** Preview-only metadata; it is never copied into an editor section. */
  previewFixtureId: string;
  defaults: Record<string, SettingValue>;
  compatibleArchetypes?: string[];
};

export type SectionPackDefinition = SectionDefinition & {
  packVersion: 1;
  families: SectionFamily[];
  tags: string[];
  supportedPages: EditorPageKind[];
  supportedMarkets: string[];
  capabilities: SectionCapability[];
  variants: SectionVariantDefinition[];
  assets: string[];
  renderSchema(section: EditorSection): Record<string, unknown>;
  migrate(section: EditorSection, fromPackVersion: number): EditorSection;
};

export type SectionFactoryOptions = Omit<SectionDefinition, "renderWeb" | "renderLiquid"> & {
  renderWeb: SectionDefinition["renderWeb"];
  renderLiquid: SectionDefinition["renderLiquid"];
};

export type NormalizedBlock = EditorBlock & { settings: Record<string, SettingValue> };
