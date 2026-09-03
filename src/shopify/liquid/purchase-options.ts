import type { ProductFormLiquidOptions } from "./product-form";
import { renderProductFormLiquid } from "./product-form";

export type PurchaseOptionLiquidInput = ProductFormLiquidOptions & {
  strategy: "fixed-bundle" | "multipack" | "selling-plan" | "preorder";
};

/** Keeps each purchase model explicit; custom bundles live in the app extension. */
export function renderPurchaseOptionsLiquid(input: PurchaseOptionLiquidInput): string {
  return renderProductFormLiquid({
    ...input,
    includeQuantityOffers: input.strategy === "multipack",
  });
}
