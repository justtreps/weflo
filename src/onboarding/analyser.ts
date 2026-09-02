import type { BuyerPersona, ImportedProduct, MarketingAngle } from "./types";

export type OnboardingAnalysis = { brandNames: string[]; personas: BuyerPersona[]; angles: MarketingAngle[] };
export type ImageOnboardingAnalysis = { product: ImportedProduct; analysis: OnboardingAnalysis };
export type OnboardingAiPort = {
  analyse(input: { product: ImportedProduct; language: string }): Promise<OnboardingAnalysis>;
  analyseImage?(input: { imageDataUrl: string; fileName: string; language: string }): Promise<ImageOnboardingAnalysis>;
};

function clean(value: unknown, max = 180): string { return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function tags(value: unknown): string[] { return Array.isArray(value) ? value.map((tag) => clean(tag, 24)).filter(Boolean).slice(0, 4) : []; }

function personas(value: unknown): BuyerPersona[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).slice(0, 4).map((item, index) => ({
    id: clean(item.id, 40) || `persona-${index + 1}`,
    title: clean(item.title, 80) || `Customer ${index + 1}`,
    insight: clean(item.insight, 260),
    icon: clean(item.icon, 8) || "●",
    tags: tags(item.tags),
    selected: item.selected === true,
  }));
}

function angles(value: unknown): MarketingAngle[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).slice(0, 4).map((item, index) => ({
    id: clean(item.id, 40) || `angle-${index + 1}`,
    title: clean(item.title, 80) || `Angle ${index + 1}`,
    description: clean(item.description, 260),
    icon: clean(item.icon, 8) || "●",
    tags: tags(item.tags),
    selected: item.selected === true,
  }));
}

export function validateOnboardingAnalysis(value: unknown, _product: ImportedProduct): OnboardingAnalysis {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const brandNames = [...new Set((Array.isArray(input.brandNames) ? input.brandNames : []).map((name) => clean(name, 40)).filter(Boolean))].slice(0, 8);
  if (brandNames.length !== 8) throw new Error("Analysis must contain eight unique brand names.");
  const normalizedPersonas = personas(input.personas);
  const normalizedAngles = angles(input.angles);
  if (normalizedPersonas.length !== 4 || normalizedAngles.length !== 4) throw new Error("Analysis must contain four personas and four angles.");
  return { brandNames, personas: normalizedPersonas, angles: normalizedAngles };
}
