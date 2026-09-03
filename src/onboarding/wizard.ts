import type { WizardAnswer, WizardStepId, WizardSuggestion } from "./types";

export const WIZARD_STEPS: readonly WizardStepId[] = [
  "source", "audience", "problem-outcome", "reasons-to-buy", "offer", "brand-personality", "market", "page-scope", "review",
] as const;

export const WIZARD_COPY: Record<WizardStepId, { title: string; prompt: string; multiple: boolean }> = {
  source: { title: "Confirmons votre produit", prompt: "Quelle facette du produit doit guider la page ?", multiple: false },
  audience: { title: "À qui s’adresse cette page ?", prompt: "Choisissez votre audience prioritaire.", multiple: true },
  "problem-outcome": { title: "Quel résultat compte le plus ?", prompt: "Décrivez le problème résolu ou le résultat recherché.", multiple: false },
  "reasons-to-buy": { title: "Pourquoi acheter maintenant ?", prompt: "Sélectionnez les raisons d’achat à mettre en avant.", multiple: true },
  offer: { title: "Quelle offre proposer ?", prompt: "Choisissez un modèle d’offre réaliste pour ce produit.", multiple: false },
  "brand-personality": { title: "Quelle personnalité pour la marque ?", prompt: "Définissez le ton et la direction visuelle.", multiple: true },
  market: { title: "Quel marché viser ?", prompt: "Choisissez le pays, la langue et la devise de la page.", multiple: false },
  "page-scope": { title: "Quel objectif pour cette page ?", prompt: "Déterminez la portée de la page et son objectif de conversion.", multiple: false },
  review: { title: "Prêt à construire ?", prompt: "Vérifiez vos choix avant de générer votre Blueprint.", multiple: false },
};

export function isWizardStepId(value: unknown): value is WizardStepId {
  return typeof value === "string" && (WIZARD_STEPS as readonly string[]).includes(value);
}

export function nextWizardStep(stepId: WizardStepId, answers: WizardAnswer[]): WizardStepId | null {
  const index = WIZARD_STEPS.indexOf(stepId);
  if (index < 0 || !answers.some((answer) => answer.stepId === stepId && (answer.selectedSuggestionIds.length || answer.customText.trim()))) return stepId;
  return WIZARD_STEPS[index + 1] ?? null;
}

export function previousWizardStep(stepId: WizardStepId): WizardStepId | null {
  const index = WIZARD_STEPS.indexOf(stepId);
  return index > 0 ? WIZARD_STEPS[index - 1] : null;
}

export function normalizeWizardAnswer(value: unknown, suggestions: WizardSuggestion[], stepId: WizardStepId): WizardAnswer | null {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!input) return null;
  const available = new Set(suggestions.map((suggestion) => suggestion.id));
  const selectedSuggestionIds = Array.isArray(input.selectedSuggestionIds)
    ? [...new Set(input.selectedSuggestionIds.filter((id): id is string => typeof id === "string" && available.has(id)))].slice(0, 4)
    : [];
  const customText = typeof input.customText === "string" ? input.customText.replace(/\s+/g, " ").trim().slice(0, 1_000) : "";
  if (!selectedSuggestionIds.length && !customText) return null;
  return { stepId, selectedSuggestionIds, customText, acceptedAt: new Date().toISOString() };
}
