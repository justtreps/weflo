import type { InspectorControl } from "../editor/section-schema";
import type { SettingValue } from "../editor/document";
import type { BlockDefinition, SectionCapability } from "../sections/types";

/** The only layout vocabulary a custom Canardo section may use. */
export type CustomNode =
  | { kind: "stack" | "grid"; token: string; children: CustomNode[] }
  | { kind: "heading" | "text" | "button" | "image" | "icon"; binding: string; token: string }
  | { kind: "repeater"; blockType: string; min: number; max: number; template: CustomNode[] }
  | { kind: "product-form" | "variant-selector" | "quantity-selector"; capability: SectionCapability };

export type CustomSectionSpecV1 = {
  version: 1;
  id: string;
  name: string;
  purpose: string;
  nodes: CustomNode[];
  settings: InspectorControl[];
  blocks: BlockDefinition[];
  requiredCapabilities: SectionCapability[];
};

export type CustomSectionSpec = CustomSectionSpecV1;
export type CustomSettingDefaults = Record<string, SettingValue>;

export const CUSTOM_PRIMITIVES = ["stack", "grid", "heading", "text", "button", "image", "icon", "repeater", "product-form", "variant-selector", "quantity-selector"] as const;
export const CUSTOM_TOKENS = [
  "surface", "ink", "accent", "muted", "border", "display", "body",
  "space-xs", "space-sm", "space-md", "space-lg", "space-xl",
  "radius-sm", "radius-md", "radius-lg", "one", "two", "three",
] as const;
