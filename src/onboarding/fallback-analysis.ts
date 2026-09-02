import type { OnboardingAnalysis } from "./analyser";
import type { ImportedProduct } from "./types";

function stem(product: ImportedProduct): string {
  const words = product.title.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 3);
  return words[0] || product.vendor || "Nova";
}

export function fallbackOnboardingAnalysis(product: ImportedProduct, language: string): OnboardingAnalysis {
  const base = stem(product);
  const french = language.toLowerCase().startsWith("fr");
  const light = /lamp|light|lumi|éclair/i.test(`${product.title} ${product.description}`);
  const names = light
    ? ["LumiWall", "AuraMount", "HaloBeam", "GlowMount", "Everlight", "Radiant Wall", "Beam & Base", "Zenith Glow"]
    : [`${base} Studio`, `${base} House`, `Maison ${base}`, `${base} & Co`, `${base} Lab`, `The ${base}`, `${base} Daily`, `${base} Works`];
  const personas = [
    { title: french ? "Locataire qui veut améliorer son intérieur" : "Renter upgrading their space", insight: french ? `Veut profiter de ${product.title} sans installation compliquée.` : `Wants ${product.title} without a complicated installation.`, icon: "🔑", tags: ["Problem-aware", "Researches first"] },
    { title: french ? "Passionné de décoration" : "Design-conscious decorator", insight: french ? "Cherche une finition cohérente avec un intérieur soigné." : "Looks for a finish that belongs in a considered interior.", icon: "✨", tags: ["Style-led", "Impulse buyer"] },
    { title: french ? "Acheteur pratique" : "Practical problem solver", insight: french ? "Privilégie un bénéfice clair, immédiat et simple à utiliser." : "Prioritises a clear, immediate benefit and easy use.", icon: "⚡", tags: ["Solution-aware", "Direct"] },
    { title: french ? "Acheteur prudent" : "Careful comparison buyer", insight: french ? "A besoin de preuves, d’avis et d’une garantie rassurante." : "Needs proof, reviews and a reassuring guarantee.", icon: "🛡️", tags: ["Trust-led", "Comparison shopper"] },
  ].map((item, index) => ({ id: `persona-${index + 1}`, ...item, selected: index === 0 }));
  const angles = [
    { title: french ? "Une marque digne de confiance" : "Buy from a trusted brand", description: french ? "Mets en avant la qualité, le service et les preuves clients." : "Lead with quality, service and customer evidence.", icon: "🛡️", tags: ["Reassuring", "Social proof"] },
    { title: french ? "Une transformation visible" : "A visible transformation", description: french ? `Montre comment ${product.title} améliore concrètement le quotidien.` : `Show how ${product.title} materially improves everyday life.`, icon: "✨", tags: ["Transformation", "Benefit-led"] },
    { title: french ? "Simple dès la première utilisation" : "Easy from the first use", description: french ? "Réduis la friction en expliquant l’installation et l’usage." : "Reduce friction by clarifying setup and everyday use.", icon: "⚡", tags: ["Practical", "Direct"] },
    { title: french ? "Une finition premium" : "A premium finish", description: french ? "Valorise le design, les matières et la sensation de qualité." : "Emphasise design, materials and perceived quality.", icon: "◆", tags: ["Premium", "Identity"] },
  ].map((item, index) => ({ id: `angle-${index + 1}`, ...item, selected: index === 0 }));
  return { brandNames: names, personas, angles };
}
