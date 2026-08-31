import OpenAI from "openai";
import type { LlmPort, PageDocument, SectionType } from "../types";
import { SECTION_TYPES } from "./catalog";

export function applyCanardo(
  _current: PageDocument,
  result: { message: string; document: PageDocument },
): { message: string; document: PageDocument } {
  for (const section of result.document.sections) {
    if (!SECTION_TYPES.includes(section.type)) {
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

const SYSTEM = [
  "Tu ne renvoies qu'un JSON { message, document }.",
  "document est un PageDocument { name, path, sections: [{ id, type, settings }] }.",
  `Les types de sections autorisés sont uniquement : ${SECTION_TYPES.join(", ")}.`,
  "Remplis settings (textes, images, prix). Ne génère pas de HTML.",
].join(" ");

export function createOpenAiLlm(apiKey: string): LlmPort {
  const client = new OpenAI({ apiKey });
  return {
    async complete({ prompt, document }) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
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
