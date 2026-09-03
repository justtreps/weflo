import { premiumPack } from "./pack-factory";

export const brandStoryPacks = [
  premiumPack({ type: "brandManifesto", name: "Manifeste de marque", category: "brand", family: "brand-story", tags: ["marque", "manifeste", "valeurs"], layout: "editorial", variants: [["statement", "Déclaration", "Texte manifeste assumé."], ["principles", "Principes", "Valeurs séparées en principes."], ["letter", "Lettre", "Adresse personnelle de la marque."]] }),
  premiumPack({ type: "founderStory", name: "Histoire du fondateur", category: "brand", family: "brand-story", tags: ["fondateur", "histoire", "marque"], layout: "editorial", variants: [["portrait", "Portrait", "Photo et récit à la première personne."], ["timeline", "Chronologie", "Parcours structuré en moments clés."], ["letter", "Lettre du fondateur", "Message intime et direct."]] }),
  premiumPack({ type: "editorialChapter", name: "Chapitre éditorial", category: "brand", family: "brand-story", tags: ["chapitre", "récit", "marque"], layout: "editorial", variants: [["split", "Split", "Texte et image en dialogue."], ["full-bleed", "Plein cadre", "Média dominant et texte superposé."], ["quiet", "Lecture calme", "Colonne centrée avec rythme lent."]] }),
  premiumPack({ type: "campaignLookbook", name: "Lookbook de campagne", category: "media", family: "brand-story", tags: ["lookbook", "campagne", "médias"], variants: [["masonry", "Mosaïque", "Images de formats variés."], ["sequence", "Séquence", "Récit visuel dans l’ordre."], ["catalogue", "Catalogue", "Grille régulière et informative."]] }),
];
