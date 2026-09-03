import type { StoreBlueprint } from "./types";

export type BlueprintScore = { score: number; hardFailures: string[]; notes: string[] };

export function scoreBlueprint(blueprint: StoreBlueprint): BlueprintScore {
  const hardFailures: string[] = [];
  const notes: string[] = [];
  const counts = new Map<string, number>();
  for (const section of blueprint.sections) counts.set(section.sectionType, (counts.get(section.sectionType) ?? 0) + 1);
  if (!blueprint.sections.some((section) => /hero|productMain|productHero/i.test(section.sectionType))) hardFailures.push("La page ne présente pas clairement le produit.");
  if (!blueprint.sections.some((section) => /cta|productMain|bundle/i.test(section.sectionType))) hardFailures.push("La page ne contient pas de chemin de conversion.");
  const repeats = [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  if (repeats) notes.push(`${repeats} rythme(s) de section répété(s).`);
  if (!blueprint.sections.some((section) => /review|faq|guarantee|press|comparison/i.test(section.sectionType))) notes.push("Ajoutez une preuve ou une réponse aux objections dans l’éditeur.");
  const capabilityPenalty = blueprint.sections.filter((section) => section.requiredCapabilities.length > 0).length * 3;
  return { score: Math.max(0, 100 - repeats * 12 - capabilityPenalty - hardFailures.length * 60), hardFailures, notes };
}
