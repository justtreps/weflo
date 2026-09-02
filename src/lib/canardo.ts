import OpenAI from "openai";
import type { LlmPort, PageDocument, SectionType } from "../types";
import { SECTION_TYPES } from "./catalog";
import { CANARDO_SYSTEM_PROMPT } from "../canardo/prompt";

export function applyCanardo(
  _current: PageDocument,
  result: { message: string; document: PageDocument },
): { message: string; document: PageDocument } {
  if (!result?.document || !Array.isArray(result.document.sections)) {
    throw new Error("catalog");
  }
  for (const section of result.document.sections) {
    if (!section || !SECTION_TYPES.includes(section.type) || !section.settings || typeof section.settings !== "object") {
      throw new Error("catalog");
    }
  }
  return result;
}

const IMAGE_PROMPT = /\b(image|images|photo|photos|visuel|illustration|picture)\b/i;

export function canardoCreditCost(prompt: string, document: PageDocument): number {
  const flagged = document as PageDocument & { generatedImage?: unknown };
  const wantsImage =
    IMAGE_PROMPT.test(prompt) ||
    flagged.generatedImage === true ||
    document.sections.some((s) => s.settings.generatedImage === true);
  return wantsImage ? 3 : 1;
}

export const CANARDO_SYSTEM = [
  "Tu es l'assistant e-commerce Weflo.",
  "Tu aides à coder et modifier des pages boutique. Tu ne modifies que le PageDocument.",
  "Tu refuses d'aider sur le parrainage, les filleuls, les commissions ou les liens d'affiliation.",
  "Si on te le demande, réponds que tu aides uniquement sur les pages, sans changer le document.",
  "Tu ne renvoies qu'un JSON { message, document }.",
  "document est un PageDocument { name, path, sections: [{ id, type, settings }] }.",
  `Les types de sections autorisés sont uniquement : ${SECTION_TYPES.join(", ")}.`,
  "Remplis settings avec title, subtitle, text, price, image (URL https), cta_label.",
  "Ne génère pas de HTML. Une page sell ressemble à une fiche produit Shopify (hero + bénéfices + FAQ + CTA).",
].join(" ");

const REFERRAL_RE = /\b(filleul|filleuls|parrainage|parrain|referral|affiliation|affiliate)\b/i;

export const CANARDO_REFUSAL =
  "Je t'aide à coder et modifier tes pages boutique, pas le parrainage. Ouvre tes pages depuis le dashboard.";

export function isReferralPrompt(prompt: string): boolean {
  return REFERRAL_RE.test(prompt);
}

export function refuseReferralHelp(
  prompt: string,
  document: PageDocument,
): { message: string; document: PageDocument } | null {
  if (!isReferralPrompt(prompt)) return null;
  return { message: CANARDO_REFUSAL, document };
}

export function createOpenAiLlm(apiKey: string): LlmPort {
  const client = new OpenAI({ apiKey });
  return {
    async completeEditor({ prompt, context }) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CANARDO_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ prompt, context }) },
        ],
      });
      return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    },
    async complete({ prompt, document }) {
      const refused = refuseReferralHelp(prompt, document);
      if (refused) return refused;
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CANARDO_SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              document,
              sectionTypes: SECTION_TYPES as SectionType[],
            }),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as {
        message?: unknown;
        document?: PageDocument;
        name?: string;
        path?: string;
        sections?: PageDocument["sections"];
      };
      const nextDoc: PageDocument =
        parsed.document && Array.isArray(parsed.document.sections)
          ? parsed.document
          : {
              name: typeof parsed.name === "string" ? parsed.name : document.name,
              path: typeof parsed.path === "string" ? parsed.path : document.path,
              sections: Array.isArray(parsed.sections) ? parsed.sections : document.sections,
            };
      const message = typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : "Fait.";
      return { message, document: nextDoc };
    },
  };
}
