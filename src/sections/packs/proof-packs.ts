import { premiumPack } from "./pack-factory";

export const proofPacks = [
  premiumPack({ type: "benefits-results", name: "Bénéfices et résultats", category: "conversion", family: "benefits-results", tags: ["bénéfices", "résultats", "preuve"], capabilities: [], variants: [
    ["outcome-grid", "Grille de résultats", "Cartes en grille pour une lecture rapide."],
    ["proof-timeline", "Chronologie de preuve", "Résultats organisés en séquence progressive."],
    ["feature-led", "Caractéristiques", "Lecture structurée par détails et bénéfices."],
  ] }),
  premiumPack({ type: "product-media", name: "Démonstration produit", category: "media", family: "product-media", tags: ["démo", "vidéo", "galerie"], capabilities: [], layout: "editorial", variants: [
    ["video-first", "Vidéo d’abord", "Média principal immersif avant les détails."],
    ["masonry", "Mosaïque", "Galerie de formats variés et visuels rapprochés."],
    ["step-demo", "Démonstration par étapes", "Séquence de médias qui explique l’usage."],
  ] }),
  premiumPack({ type: "before-after", name: "Avant / après", category: "media", family: "before-after", tags: ["résultats", "transformation", "comparaison"], capabilities: [], variants: [
    ["slider", "Curseur", "Une comparaison focalisée sur une paire de visuels."],
    ["side-by-side", "Côte à côte", "Deux états visibles simultanément."],
    ["results-story", "Histoire de résultat", "Comparaison intégrée à un récit et des notes."],
  ] }),
  premiumPack({ type: "reviews-ugc", name: "Avis et UGC", category: "conversion", family: "reviews-ugc", tags: ["avis", "ugc", "preuve sociale"], capabilities: [], variants: [
    ["filmstrip", "Filmstrip UGC", "Défilement visuel de contenus clients."],
    ["spotlight", "Témoignage phare", "Un avis dominant entouré de signaux secondaires."],
    ["review-wall", "Mur d’avis", "Accumulation dense de retours structurés."],
  ] }),
  premiumPack({ type: "faq-trust", name: "FAQ et garanties", category: "content", family: "faq-trust", tags: ["faq", "garantie", "confiance"], capabilities: [], variants: [
    ["accordion", "Accordéon", "Questions compactes révélées à la demande."],
    ["guarantee-cards", "Cartes de garantie", "Réassurance présentée comme preuves indépendantes."],
    ["support-columns", "Colonnes support", "Intro de confiance et réponses détaillées séparées."],
  ] }),
];
