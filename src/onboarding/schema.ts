import type { BuildStage, CreateOnboardingDraftInput, OnboardingDraft, StoreBlueprint, WizardState } from "./types";

export const BUILD_STAGE_LABELS = [
  "Analyse des avis",
  "Identification des douleurs clients",
  "Analyse des concurrents",
  "Compréhension du client idéal",
  "Création de l’identité de marque",
  "Rédaction du copywriting de conversion",
  "Génération des visuels de conversion",
  "Structuration de l’offre",
  "Construction de la buy box",
  "Ajout des éléments de confiance et de preuve sociale",
  "Mise en avant des meilleurs avis",
  "Renforcement de la proposition de valeur",
  "Optimisation du panier moyen",
  "Réduction des frictions avant achat",
  "Optimisation pour les acheteurs mobiles",
  "Optimisation de chaque détail pour la conversion",
  "Création du brand kit",
] as const;

export function initialBuildStages(): BuildStage[] {
  return BUILD_STAGE_LABELS.map((label, index) => ({ id: `stage-${index + 1}`, label, state: "waiting" }));
}

export function initialWizardState(): WizardState {
  return { currentStep: "source", answers: [], suggestions: {} };
}

/** Keeps persisted drafts created before the wizard release readable. */
export function migrateOnboardingDraft(draft: OnboardingDraft): OnboardingDraft {
  return {
    ...draft,
    wizard: draft.wizard && typeof draft.wizard === "object"
      ? { currentStep: draft.wizard.currentStep ?? "source", answers: Array.isArray(draft.wizard.answers) ? draft.wizard.answers : [], suggestions: draft.wizard.suggestions && typeof draft.wizard.suggestions === "object" ? draft.wizard.suggestions : {} }
      : initialWizardState(),
    blueprint: draft.blueprint && typeof draft.blueprint === "object" ? draft.blueprint as StoreBlueprint : null,
  };
}

export function createOnboardingDraftInput(input: { claimTokenHash: string; sourceUrl: string }): CreateOnboardingDraftInput {
  return {
    version: 1,
    status: "extracting",
    claimTokenHash: input.claimTokenHash,
    sourceUrl: input.sourceUrl,
    product: null,
    language: "fr",
    modelId: null,
    creationFormat: "store",
    templateId: null,
    answers: {},
    brandNames: [],
    brandName: "",
    personas: [],
    angles: [],
    brandKit: null,
    stages: initialBuildStages(),
    wizard: initialWizardState(),
    blueprint: null,
    document: null,
    error: null,
    claimedUserId: null,
    claimedPageId: null,
  };
}
