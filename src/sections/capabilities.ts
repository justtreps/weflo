import type { SectionCapability } from "./types";

export const SECTION_CAPABILITIES: readonly SectionCapability[] = [
  "product-form", "variant-selection", "quantity-breaks", "collection-binding",
  "recommendations", "fixed-bundle", "custom-bundle", "discount-rules", "selling-plan", "preorder",
  "cart-drawer", "app-blocks", "markets", "localization",
];

export function hasSectionCapability(value: unknown): value is SectionCapability {
  return typeof value === "string" && (SECTION_CAPABILITIES as readonly string[]).includes(value);
}
