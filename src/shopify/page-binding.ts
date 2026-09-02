import type { EditorDocument } from "../editor/document";

export type ShopifyPageBinding = { resource: "page" | "product" | "collection"; resourceId?: string; create: boolean; templateSuffix: string };

export function bindingForDocument(document: EditorDocument, templateSuffix: string): ShopifyPageBinding {
  if (document.kind === "product" && document.shopify?.productId) return { resource: "product", resourceId: document.shopify.productId, create: false, templateSuffix };
  if (document.kind === "collection" && document.shopify?.collectionId) return { resource: "collection", resourceId: document.shopify.collectionId, create: false, templateSuffix };
  return { resource: "page", create: true, templateSuffix };
}
