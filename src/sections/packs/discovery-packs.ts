import { premiumPack } from "./pack-factory";

export const discoveryPacks = [
  premiumPack({ type: "recommendations", name: "Recommandations produit", category: "commerce", family: "recommendations", tags: ["collection", "cross-sell", "découverte"], capabilities: ["collection-binding", "recommendations"], variants: [
    ["related-grid", "Produits associés", "Grille directe de suggestions complémentaires."],
    ["editorial-picks", "Sélection éditoriale", "Recommandations contextualisées par un angle de marque."],
    ["cross-sell-stack", "Ajouts utiles", "Offres complémentaires dans une pile priorisée."],
  ] }),
];
