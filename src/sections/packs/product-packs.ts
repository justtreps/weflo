import { premiumPack } from "./pack-factory";

export const productPacks = [
  premiumPack({ type: "product-hero", name: "Hero produit", category: "commerce", family: "product-hero", tags: ["produit", "désir", "premier écran"], capabilities: ["product-form", "markets"], layout: "product", variants: [
    ["gallery-led", "Galerie immersive", "Média pleine hauteur suivi d’une proposition d’achat."],
    ["editorial-split", "Split éditorial", "Texte de marque et visuel dissymétrique côte à côte."],
    ["clinical-proof", "Preuve clinique", "Hiérarchie factuelle avec zone de réassurance."],
  ] }),
  premiumPack({ type: "buy-box", name: "Buy box", category: "commerce", family: "buy-box", tags: ["achat", "prix", "panier"], capabilities: ["product-form", "variant-selection", "cart-drawer"], layout: "product", variants: [
    ["clean", "Minimal net", "Formulaire vertical sans distraction."],
    ["premium", "Premium détaillé", "Prix, réassurance et offre structurés en colonnes."],
    ["sticky", "Achat persistant", "Résumé compact pensé pour rester disponible au défilement."],
  ] }),
  premiumPack({ type: "variant-selector", name: "Sélecteur de variantes", category: "commerce", family: "variant-selector", tags: ["variantes", "options", "couleurs"], capabilities: ["variant-selection", "product-form"], layout: "product", variants: [
    ["pills", "Pastilles", "Choix horizontal par boutons compacts."],
    ["swatches", "Nuanciers", "Options visuelles avec repères couleur."],
    ["image-cards", "Cartes image", "Choix présenté sous forme de cartes média."],
  ] }),
];
