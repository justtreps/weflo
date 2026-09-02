import { applyCommand, type EditorCommand } from "../editor/commands";
import type { EditorDocument, EditorSection } from "../editor/document";
import { validateEditorDocument } from "../editor/schema";
import { validateCustomCode } from "../editor/custom-code-policy";
import { getSectionDefinition } from "../sections/index";
import type { CanardoResponse, CanardoValidationResult } from "./protocol";

const RESPONSE_KEYS = new Set(["message", "summary", "commands"]);
const COMMAND_KEYS: Record<string, Set<string>> = {
  insertSection: new Set(["type", "pageId", "index", "section"]), moveSection: new Set(["type", "sectionId", "toPageId", "toIndex"]),
  updateSetting: new Set(["type", "sectionId", "key", "value"]), updateStyle: new Set(["type", "sectionId", "key", "value"]),
  updateResponsiveStyle: new Set(["type", "sectionId", "breakpoint", "key", "value"]), duplicateSection: new Set(["type", "sectionId", "newSectionId", "index"]),
  removeSection: new Set(["type", "sectionId"]), toggleHidden: new Set(["type", "sectionId"]),
  insertBlock: new Set(["type", "sectionId", "index", "block"]), moveBlock: new Set(["type", "sectionId", "blockId", "toIndex"]), removeBlock: new Set(["type", "sectionId", "blockId"]),
};

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

function validateInsertedSection(section: unknown, errors: string[]): void {
  if (!object(section) || typeof section.type !== "string" || !getSectionDefinition(section.type)) { errors.push("Type de section inconnu."); return; }
  if (section.type === "customCode") {
    const settings = object(section.settings) ? section.settings : {};
    const result = validateCustomCode({ html: String(settings.html ?? ""), css: String(settings.css ?? ""), js: String(settings.js ?? ""), allowedDomains: [], namespace: String(section.id ?? "custom") });
    errors.push(...result.errors);
  }
}

export function validateCanardoResponse(value: unknown, document: EditorDocument): CanardoValidationResult {
  const errors: string[] = [];
  if (!object(value)) return { ok: false, errors: ["La réponse Canardo doit être un objet."] };
  if (Object.keys(value).some((key) => !RESPONSE_KEYS.has(key))) errors.push("Propriété inattendue dans la réponse.");
  if (typeof value.message !== "string" || typeof value.summary !== "string") errors.push("Message et résumé obligatoires.");
  if (!Array.isArray(value.commands)) errors.push("La liste de commandes est obligatoire.");
  else if (value.commands.length > 30) errors.push("Canardo est limité à 30 opérations.");

  let next = structuredClone(document);
  if (Array.isArray(value.commands) && value.commands.length <= 30) for (const raw of value.commands) {
    if (!object(raw) || typeof raw.type !== "string" || !COMMAND_KEYS[raw.type]) { errors.push("Commande inconnue."); continue; }
    if (Object.keys(raw).some((key) => !COMMAND_KEYS[raw.type].has(key))) { errors.push(`Propriété inattendue pour ${raw.type}.`); continue; }
    if (raw.type === "insertSection") validateInsertedSection(raw.section, errors);
    if (errors.length) continue;
    try { next = applyCommand(next, raw as EditorCommand); } catch (error) { errors.push(error instanceof Error ? error.message : "Commande invalide."); }
  }
  const schema = validateEditorDocument(next);
  if (!schema.ok) errors.push(...schema.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: value as CanardoResponse };
}
