import { premiumPack } from "./pack-factory";
import type { InspectorControl } from "../../editor/section-schema";

const select = (key: string, label: string, options: string[]): InspectorControl => ({ key, label, type: "select", scope: "settings", options });

export const offerPacks = [
  premiumPack({ type: "quantity-offer", name: "Offre quantité", category: "commerce", family: "quantity-offer", tags: ["quantité", "volume", "économie"], capabilities: ["product-form", "quantity-breaks"], layout: "product", extraDefaults: { quantity_breaks: "1,2,3", quantity_label: "Choisir la quantité", quantity_suffix: "unités" }, variants: [
    ["single-duo-trio", "Solo, duo, trio", "Trois offres égales et immédiatement comparables."],
    ["tier-table", "Table de paliers", "Lecture par niveau de quantité et économie."],
    ["volume-ladder", "Échelle de volume", "Progression verticale guidant vers le meilleur volume."],
  ] }),
  premiumPack({ type: "fixed-bundle", name: "Bundle fixe", category: "commerce", family: "fixed-bundle", tags: ["bundle", "multipack", "offre"], capabilities: ["product-form", "fixed-bundle"], layout: "product", extraDefaults: { bundle_note: "Ce produit correspond à un bundle fixe Shopify." }, variants: [
    ["routine", "Routine complète", "Produits complémentaires ordonnés par usage."],
    ["multipack", "Multipack", "Même produit décliné en quantité avec économie."],
    ["gift-set", "Coffret", "Composition cadeau avec contenu présenté comme un ensemble."],
  ] }),
  premiumPack({ type: "subscription-selector", name: "Abonnement", category: "commerce", family: "subscriptions-preorders", tags: ["abonnement", "selling plan", "récurrence"], capabilities: ["product-form", "selling-plan"], layout: "product", extraDefaults: { selling_plan_label: "Fréquence" }, variants: [
    ["inline", "Choix direct", "Options d’achat ponctuel et récurrent dans le formulaire."],
    ["benefit-led", "Avantages visibles", "Avantages de l’abonnement présentés près du choix."],
    ["compact", "Compact", "Sélecteur réduit pour une buy box dense."],
  ] }),
  premiumPack({ type: "preorder-selector", name: "Précommande", category: "commerce", family: "subscriptions-preorders", tags: ["précommande", "lancement", "attente"], capabilities: ["product-form", "preorder"], layout: "product", extraDefaults: { preorder_provider: "", preorder_note: "Précommande — expédition selon les conditions indiquées." }, extraSettings: [select("preorder_provider", "Fournisseur de précommande", ["", "preorder-provider"])], variants: [
    ["launch", "Lancement", "Information de disponibilité et bouton de réservation."],
    ["date-led", "Date de livraison", "Date et conditions mises au premier plan."],
    ["limited", "Série limitée", "Disponibilité limitée accompagnée d’une réassurance."],
  ] }),
];
