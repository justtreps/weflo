import type { OnboardingAiPort } from "./analyser";
import type { ProductTruthSheet, WizardAnswer, WizardStepId, WizardSuggestion } from "./types";

type SuggestInput = { stepId: WizardStepId; truth: ProductTruthSheet; answers: WizardAnswer[]; language: string; ai?: OnboardingAiPort; timeoutMs?: number };

const labels: Record<WizardStepId, string[]> = {
  source: ["Mettre le produit au premier plan", "Clarifier son usage quotidien", "Présenter son univers de marque", "Démarrer par le besoin client"],
  audience: ["Personnes qui recherchent une solution simple", "Acheteurs attentifs au design", "Clients qui comparent avant d’acheter", "Utilisateurs à la recherche d’un usage quotidien"],
  "problem-outcome": ["Rendre le quotidien plus simple", "Obtenir un résultat concret", "Choisir avec plus de confiance", "Améliorer l’expérience d’utilisation"],
  "reasons-to-buy": ["Bénéfice principal clair", "Usage simple à comprendre", "Preuves réellement disponibles", "Offre facile à choisir"],
  offer: ["Produit seul, choix simple", "Offre découverte", "Comparer les variantes disponibles", "Demander une configuration avant achat"],
  "brand-personality": ["Éditoriale et chaleureuse", "Claire et rassurante", "Premium et minimaliste", "Directe et pratique"],
  market: ["France · français · EUR", "Belgique · français · EUR", "Canada · français · CAD", "Marché à préciser"],
  "page-scope": ["Une page produit pour convertir", "Une landing page pour une campagne", "Une page de marque avec découverte", "Un parcours à compléter dans l’éditeur"],
  review: ["Construire la première version", "Revoir mes choix avant de construire", "Créer une base éditable", "Conserver les choix et finir plus tard"],
};

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function fallbackWizardSuggestions(stepId: WizardStepId, truth: ProductTruthSheet): WizardSuggestion[] {
  const product = safeText(truth.observedFacts.title, 80) || "ce produit";
  return labels[stepId].map((title, index) => ({
    id: `fallback-${stepId}-${index + 1}`,
    title,
    explanation: `${title} pour ${product}. À adapter avec vos informations confirmées.`,
    tags: ["Suggestion", stepId],
  }));
}

function validateSuggestions(value: unknown, stepId: WizardStepId, truth: ProductTruthSheet): WizardSuggestion[] | null {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).suggestions : value;
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const observed = `${truth.observedFacts.title} ${truth.observedFacts.description} ${truth.observedFacts.vendor}`.toLowerCase();
  const suggestions = raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const source = item as Record<string, unknown>;
    if (Object.keys(source).some((key) => !["title", "explanation", "tags"].includes(key))) return null;
    const title = safeText(source.title, 90);
    const explanation = safeText(source.explanation, 180);
    const tags = Array.isArray(source.tags) ? source.tags.map((tag) => safeText(tag, 24)).filter(Boolean).slice(0, 4) : [];
    if (!title || !explanation || !tags.length) return null;
    // A suggestion may be strategic, but it must never assert a specific absent product fact.
    if (/\b(certifi|garanti|livraison gratuite|rembours|clinique|brevet)\w*/i.test(`${title} ${explanation}`) && !observed.includes("garanti")) return null;
    return { id: `ai-${stepId}-${index + 1}`, title, explanation, tags };
  });
  return suggestions.every(Boolean) ? suggestions as WizardSuggestion[] : null;
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Suggestion IA expirée")), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function suggestWizardStep(input: SuggestInput): Promise<WizardSuggestion[]> {
  if (!input.ai?.suggestWizard) return fallbackWizardSuggestions(input.stepId, input.truth);
  try {
    const value = await withDeadline(input.ai.suggestWizard({ stepId: input.stepId, truth: input.truth, answers: input.answers, language: input.language }), input.timeoutMs ?? 8_000);
    return validateSuggestions(value, input.stepId, input.truth) ?? fallbackWizardSuggestions(input.stepId, input.truth);
  } catch {
    return fallbackWizardSuggestions(input.stepId, input.truth);
  }
}
