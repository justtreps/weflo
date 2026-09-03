import { getSectionDefinition } from "../sections";
import type { ImportedProduct, StoreBlueprint, WizardAnswer } from "./types";
import { buildProductTruthSheet } from "./product-truth";
import { selectArtDirection } from "./art-direction";
import { profileFromArtDirection } from "../design/profile";
import { validateStoreBlueprint } from "./blueprint";
import { scoreBlueprint } from "./blueprint-score";

type Input = { product: ImportedProduct; language: string; market?: string; answers: WizardAnswer[]; name?: string };

function slug(value: string): string { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "boutique"; }
function useType(options: string[]): string {
  return options.find((type) => getSectionDefinition(type)) ?? "";
}
function variant(type: string): string { return getSectionDefinition(type)?.variants[0]?.id ?? "default"; }
function answerText(answers: WizardAnswer[], stepId: WizardAnswer["stepId"]): string { return answers.find((answer) => answer.stepId === stepId)?.customText ?? ""; }

function candidate(input: Input, types: string[]): StoreBlueprint {
  const truth = buildProductTruthSheet(input.product);
  const direction = selectArtDirection(truth);
  const name = input.name?.trim() || input.product.vendor || input.product.title || "Nouvelle boutique";
  const pageId = `page-${slug(name)}`;
  const title = input.product.title;
  const customOutcome = answerText(input.answers, "problem-outcome");
  const customOffer = answerText(input.answers, "offer");
  return {
    version: 1, name, market: input.market ?? "FR", language: input.language || "fr", currency: input.product.currency || "EUR",
    designProfile: profileFromArtDirection(direction, input.market ?? "FR"),
    pages: [{ id: pageId, kind: "product", name, slug: slug(name) }],
    sections: types.filter(Boolean).map((sectionType, index) => ({
      pageId, sectionType, variantId: variant(sectionType),
      purpose: index === 0 ? "Présenter l’offre" : sectionType === "cta" ? "Encourager l’achat" : "Répondre aux questions avant achat",
      content: {
        title: /hero|productMain|productHero/i.test(sectionType) ? title : sectionType === "benefits" ? (customOutcome || "Les bénéfices à confirmer") : sectionType === "bundle" ? (customOffer || "Une offre à préciser") : "",
        text: /hero|productMain|productHero/i.test(sectionType) ? input.product.description : "",
        image: /hero|productMain|productHero/i.test(sectionType) ? input.product.images[0] ?? "" : "",
        image_alt: title,
        cta_label: /cta|productMain|productHero|bundle/i.test(sectionType) ? "Ajouter au panier" : "",
      }, bindings: {}, requiredCapabilities: [],
    })),
  };
}

export async function generateBlueprint(input: Input): Promise<StoreBlueprint> {
  const candidates = [
    candidate(input, [useType(["productHero", "hero"]), useType(["productMain", "bundle"]), useType(["benefits", "imageText"]), useType(["reviews", "faq", "comparison"]), useType(["cta", "footer"])]),
    candidate(input, [useType(["hero", "productHero"]), useType(["benefits", "comparison"]), useType(["productMain", "bundle"]), useType(["faq", "reviews"]), useType(["cta", "footer"])]),
    candidate(input, [useType(["productHero", "hero"]), useType(["gallery", "imageText"]), useType(["productMain", "bundle"]), useType(["reviews", "faq"]), useType(["cta", "footer"])]),
  ];
  const valid = candidates.filter((blueprint) => validateStoreBlueprint(blueprint).ok && scoreBlueprint(blueprint).hardFailures.length === 0);
  if (!valid.length) throw new Error("Aucun Blueprint compatible avec les sections enregistrées.");
  return valid.map((blueprint, index) => ({ blueprint, score: scoreBlueprint(blueprint).score, index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0].blueprint;
}
