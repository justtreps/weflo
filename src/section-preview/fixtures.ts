import type { PreviewArchetype, SectionPreviewFixture } from "./types";

const images = (ids: string[]) => ids.map((id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=88`);

function fixture(input: {
  id: string; archetypes: PreviewArchetype[]; name: string; title: string; description: string;
  price: number; compareAtPrice: number; currency?: string; colors: [string,string,string,string];
  fonts: [string,string]; images: string[]; benefits: string[]; faqs: string[];
}): SectionPreviewFixture {
  const [background, surface, ink, accent] = input.colors;
  return {
    id: input.id,
    archetypes: input.archetypes,
    brand: {
      name: input.name,
      palette: input.colors,
      headingFont: input.fonts[0], bodyFont: input.fonts[1],
      schemes: [{ name: "Clair", background, text: ink, accent }, { name: "Surface", background: surface, text: ink, accent }],
    },
    theme: { background, surface, ink, muted: `${ink}A8`, accent, display: input.fonts[0].includes("Playfair") || input.fonts[0].includes("Libre") ? "serif" : "sans", radius: "soft" },
    product: {
      sourceUrl: `https://demo.weflo.app/${input.id}`, title: input.title, description: input.description,
      vendor: input.name, currency: input.currency ?? "EUR", price: input.price, compareAtPrice: input.compareAtPrice,
      images: images(input.images), rating: 4.8, reviewCount: 327,
      variants: [{ id: "classic", title: "Classique", price: input.price }, { id: "duo", title: "Duo", price: Math.round(input.price * 1.72) }],
      reviews: [],
    },
    previewOnly: {
      benefits: input.benefits.map((text, index) => ({ title: ["Pensé avec précision", "Simple au quotidien", "Une qualité durable"][index] ?? `Bénéfice ${index + 1}`, text })),
      reviews: [
        { author: "Lina M.", title: "Encore mieux qu’espéré", text: `Une expérience ${input.name} très soignée, du produit à la livraison.`, rating: 5 },
        { author: "Camille R.", title: "Beau et vraiment utile", text: "Tout est clair, simple et la qualité se remarque immédiatement.", rating: 5 },
        { author: "Noa B.", title: "Je recommande", text: "Une belle découverte que j’utilise maintenant chaque semaine.", rating: 5 },
      ],
      faqs: input.faqs.map((question, index) => ({ question, answer: ["Oui, tout a été conçu pour une prise en main immédiate.", "La commande est suivie et préparée sous 48 heures.", "Tu disposes de trente jours pour changer d’avis."][index] ?? "Notre équipe te répond rapidement." })),
      bundles: [{ title: "L’essentiel", quantity: 1, price: `${input.price} €` }, { title: "Le duo", quantity: 2, price: `${Math.round(input.price * 1.72)} €`, badge: "Le plus choisi" }, { title: "La routine", quantity: 3, price: `${Math.round(input.price * 2.28)} €`, badge: "Meilleure valeur" }],
    },
  };
}

export const SECTION_PREVIEW_FIXTURES: SectionPreviewFixture[] = [
  fixture({ id:"aurea-serum", archetypes:["beauty","wellness"], name:"Auréa", title:"Sérum Éclat 03", description:"Un concentré lumineux qui hydrate, apaise et révèle l’éclat naturel de la peau.", price:48, compareAtPrice:62, colors:["#F3ECE7","#FFFDFC","#261B17","#C87557"], fonts:["Playfair Display","Inter"], images:["photo-1620916566398-39f1143ab7be","photo-1556228578-8c89e6adf883","photo-1598440947619-2c35fc9aa908"], benefits:["Une formule courte aux actifs essentiels.","Une texture légère pensée pour chaque matin.","Un flacon durable et une routine sans complication."], faqs:["Convient-il aux peaux sensibles ?","Quand appliquer le sérum ?","Puis-je l’essayer sans risque ?"] }),
  fixture({ id:"halo-lamp", archetypes:["home","gadget","design"], name:"Halo", title:"Lampe murale Halo One", description:"Une lumière chaude, magnétique et sans fil qui se place exactement où tu en as besoin.", price:59, compareAtPrice:79, colors:["#EDE9E1","#FFFEFA","#171713","#D4A72C"], fonts:["Manrope","Inter"], images:["photo-1507473885765-e6ed057f782c","photo-1540932239986-30128078f3c5","photo-1513506003901-1e6a229e2d15"], benefits:["Installation sans câble ni perçage.","Orientation magnétique en un geste.","Lumière chaude rechargeable et apaisante."], faqs:["La fixation tient-elle durablement ?","Quelle est l’autonomie ?","Comment la recharger ?"] }),
  fixture({ id:"noma-bag", archetypes:["fashion"], name:"Noma", title:"Sac Week-end N°2", description:"Un sac souple et structuré, conçu pour voyager léger sans renoncer aux beaux détails.", price:189, compareAtPrice:229, colors:["#EEE9E0","#FBF8F1","#211B16","#8A5638"], fonts:["Libre Baskerville","Inter"], images:["photo-1553062407-98eeb64c6a62","photo-1548036328-c9fa89d128fa","photo-1594223274512-ad4803739b7c"], benefits:["Une ouverture large et des poches utiles.","Une matière résistante qui se patine bien.","Le bon format pour deux à quatre jours."], faqs:["Passe-t-il en cabine ?","Comment entretenir la matière ?","Est-il garanti ?"] }),
  fixture({ id:"pulse-recovery", archetypes:["sport","wellness"], name:"Pulse", title:"Recovery Daily", description:"La formule quotidienne pensée pour mieux récupérer et retrouver ton rythme dès le lendemain.", price:39, compareAtPrice:49, colors:["#E9F0E7","#FCFFF9","#132016","#79B96A"], fonts:["Space Grotesk","Inter"], images:["photo-1593095948071-474c5cc2989d","photo-1579722821273-0f6c1ddde163","photo-1538805060514-97d9cc17730c"], benefits:["Une dose simple après l’effort.","Des ingrédients clairement expliqués.","Un format pensé pour trente jours."], faqs:["Quand prendre la formule ?","Que contient-elle ?","Convient-elle à tous les sports ?"] }),
  fixture({ id:"brume-coffee", archetypes:["food"], name:"Brume", title:"Assemblage Matin Calme", description:"Un café rond et précis, torréfié en petite série pour une tasse douce chaque matin.", price:16, compareAtPrice:19, colors:["#EFE3D3","#FFF9EF","#2B1B13","#D56A35"], fonts:["Libre Baskerville","Inter"], images:["photo-1447933601403-0c6688de566e","photo-1495474472287-4d71bcdd2085","photo-1512568400610-62da28bc8a13"], benefits:["Des grains sourcés avec transparence.","Une torréfaction fraîche chaque semaine.","Un profil doux, chocolaté et équilibré."], faqs:["Quelle mouture choisir ?","Quand le café est-il torréfié ?","Comment le conserver ?"] }),
  fixture({ id:"forma-table", archetypes:["home","design"], name:"Forma", title:"Service Ondes", description:"Des pièces de table sculpturales et faciles à vivre, dessinées pour les repas de tous les jours.", price:84, compareAtPrice:104, colors:["#E9E4DA","#FAF8F3","#1F211B","#6C7B4B"], fonts:["Playfair Display","Inter"], images:["photo-1610701596007-11502861dcfa","photo-1578749556568-bc2c40e68b61","photo-1612196808214-b8e1d6145a8c"], benefits:["Des formes empilables et agréables en main.","Une finition mate résistante au quotidien.","Chaque pièce possède de légères nuances."], faqs:["Les pièces passent-elles au lave-vaisselle ?","Sont-elles fabriquées à la main ?","Puis-je compléter le service plus tard ?"] }),
];

export function fixtureById(id: string): SectionPreviewFixture {
  const found = SECTION_PREVIEW_FIXTURES.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown preview fixture: ${id}`);
  return found;
}

export function fixturesForArchetypes(archetypes: PreviewArchetype[]): SectionPreviewFixture[] {
  return SECTION_PREVIEW_FIXTURES.filter((fixture) => fixture.archetypes.some((item) => archetypes.includes(item)));
}
