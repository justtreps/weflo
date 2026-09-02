import type { ArtDirectionId, ArtDirectionProfile, ProductTruthSheet } from "./types";

const PROFILES: Record<ArtDirectionId, ArtDirectionProfile> = {
  "warm-home": { id:"warm-home",label:"Maison chaleureuse",headingFont:"Manrope",bodyFont:"Inter",mediaRatio:"landscape",spacing:"airy",radius:"soft",proofMode:"editorial",buttonStyle:"solid",palette:["#F5F0E8","#273126","#C0784C","#FFFFFF"] },
  "editorial-beauty": { id:"editorial-beauty",label:"Beauté éditoriale",headingFont:"DM Sans",bodyFont:"Inter",mediaRatio:"portrait",spacing:"airy",radius:"none",proofMode:"editorial",buttonStyle:"solid",palette:["#F8F2EF","#241B1C","#C47B76","#FFFFFF"] },
  "clinical-wellness": { id:"clinical-wellness",label:"Soin clinique",headingFont:"Inter",bodyFont:"Inter",mediaRatio:"square",spacing:"balanced",radius:"soft",proofMode:"clinical",buttonStyle:"solid",palette:["#F2F7F5","#18332D","#70A99B","#FFFFFF"] },
  "technical-performance": { id:"technical-performance",label:"Performance technique",headingFont:"Space Grotesk",bodyFont:"Inter",mediaRatio:"square",spacing:"compact",radius:"soft",proofMode:"technical",buttonStyle:"solid",palette:["#F2F3F5","#11151B","#356AE6","#FFFFFF"] },
  "direct-response": { id:"direct-response",label:"Résolution directe",headingFont:"Arial",bodyFont:"Arial",mediaRatio:"square",spacing:"compact",radius:"soft",proofMode:"community",buttonStyle:"solid",palette:["#FFFFFF","#171717","#FFDB3D","#F3F3F3"] },
  "playful-gifting": { id:"playful-gifting",label:"Cadeau joyeux",headingFont:"Syne",bodyFont:"Inter",mediaRatio:"square",spacing:"balanced",radius:"round",proofMode:"community",buttonStyle:"pill",palette:["#FFF6D8","#2A2040","#FF7657","#FFFFFF"] },
  "premium-accessories": { id:"premium-accessories",label:"Accessoires premium",headingFont:"Cormorant Garamond",bodyFont:"Inter",mediaRatio:"portrait",spacing:"airy",radius:"none",proofMode:"editorial",buttonStyle:"outline",palette:["#F5F1E8","#171512","#A38152","#FFFFFF"] },
  "food-craft": { id:"food-craft",label:"Savoir-faire gourmand",headingFont:"Fraunces",bodyFont:"Inter",mediaRatio:"landscape",spacing:"balanced",radius:"soft",proofMode:"community",buttonStyle:"solid",palette:["#F7F0E2","#382719","#C65D32","#FFFFFF"] },
};

const KEYWORDS: Record<ArtDirectionId, RegExp> = {
  "warm-home": /(lamp|light|lumi|éclair|maison|home|decor|intérieur)/i,
  "editorial-beauty": /(beaut|maquill|cosmétique|parfum|hair|cheveu)/i,
  "clinical-wellness": /(serum|sérum|skin|peau|soin|wellness|vitamin|nutrition)/i,
  "technical-performance": /(tech|device|outil|performance|sport|battery|batterie|ergonom)/i,
  "direct-response": /(posture|correct|douleur|pain|support|solution|anti)/i,
  "playful-gifting": /(gift|cadeau|enfant|kid|toy|jouet|fun)/i,
  "premium-accessories": /(bag|sac|montre|watch|bijou|jewel|accessoire|cuir|leather)/i,
  "food-craft": /(café|coffee|thé|tea|chocolat|food|épice|spice|graine)/i,
};

const PRIORITY: ArtDirectionId[] = ["warm-home","clinical-wellness","editorial-beauty","direct-response","technical-performance","premium-accessories","food-craft","playful-gifting"];

export function selectArtDirection(truth: ProductTruthSheet): ArtDirectionProfile {
  const scored = PRIORITY.map((id, index) => ({ id, index, score: (truth.searchText.match(new RegExp(KEYWORDS[id].source, "gi")) ?? []).length }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return PROFILES[scored[0].score ? scored[0].id : "direct-response"];
}

export function artDirectionById(id: unknown): ArtDirectionProfile | null {
  return typeof id === "string" && id in PROFILES ? PROFILES[id as ArtDirectionId] : null;
}
