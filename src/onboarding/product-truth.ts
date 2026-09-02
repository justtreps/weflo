import type { ImportedProduct, ProductTruthSheet } from "./types";

function sentences(value: string): string[] {
  return value.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

export function buildProductTruthSheet(product: ImportedProduct): ProductTruthSheet {
  const searchText = [product.title, product.description, product.vendor, ...product.variants.map((variant) => variant.title)].join(" ").toLowerCase();
  const inferences: string[] = [];
  if (/(lamp|light|lumi|éclair|maison|home|decor)/i.test(searchText)) inferences.push("Le contexte suggère un achat lié à l’ambiance ou à la décoration.");
  if (/(serum|sérum|skin|peau|beaut|soin|cosm)/i.test(searchText)) inferences.push("Le contexte suggère un parcours de réassurance beauté ou soin.");
  if (/(posture|ergonom|support|correct|douleur|pain)/i.test(searchText)) inferences.push("Le contexte suggère un achat motivé par la résolution d’un problème.");
  if (!inferences.length) inferences.push("Le bénéfice principal doit être confirmé par le marchand avant publication.");
  return {
    observedFacts: {
      sourceUrl: product.sourceUrl, title: product.title, description: product.description, vendor: product.vendor,
      currency: product.currency, price: product.price, compareAtPrice: product.compareAtPrice,
      images: [...product.images], variants: product.variants.map((variant) => ({ ...variant })), rating: product.rating,
      reviewCount: product.reviewCount, reviews: product.reviews.map((review) => ({ ...review })),
    },
    supplierClaims: sentences(product.description),
    inferences,
    searchText,
  };
}
