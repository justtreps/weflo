import type { BuildStage, CreateOnboardingDraftInput } from "./types";

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

export function createOnboardingDraftInput(input: { claimTokenHash: string; sourceUrl: string }): CreateOnboardingDraftInput {
  return {
    version: 1,
    status: "extracting",
    claimTokenHash: input.claimTokenHash,
    sourceUrl: input.sourceUrl,
    product: null,
    language: "en",
    modelId: null,
    brandNames: [],
    brandName: "",
    personas: [],
    angles: [],
    brandKit: null,
    stages: initialBuildStages(),
    document: null,
    error: null,
    claimedUserId: null,
    claimedPageId: null,
  };
}
