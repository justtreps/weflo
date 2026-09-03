import { createSectionDefinition } from "./factory";
const base = createSectionDefinition("comparison", "Comparateur", "conversion", "comparison", { title: "Pourquoi nous choisir" });

/** Kept at its stable legacy handle while promoted to the premium pack contract. */
export const comparisonSection = {
  ...base,
  families: ["comparison" as const],
  tags: ["comparatif", "objections", "différences"],
  capabilities: [],
  variants: [
    { id: "matrix", name: "Matrice", description: "Comparaison en lignes et colonnes.", composition: "Matrice structurée par critères.", previewFixtureId: "", defaults: { variant: "matrix" } },
    { id: "objection-cards", name: "Objections", description: "Chaque hésitation devient une carte de réponse.", composition: "Cartes de réponses aux objections.", previewFixtureId: "", defaults: { variant: "objection-cards" } },
    { id: "versus", name: "Face-à-face", description: "Deux approches opposées avec verdict visuel.", composition: "Comparaison binaire narrative.", previewFixtureId: "", defaults: { variant: "versus" } },
  ],
};
