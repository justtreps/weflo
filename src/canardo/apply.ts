import { applyCommand, type EditorCommand } from "../editor/commands";
import type { EditorDocument } from "../editor/document";
import type { CanardoResponse } from "./protocol";
import { validateCanardoResponse } from "./validate";

export function applyCanardoOperations(document: EditorDocument, response: CanardoResponse): { document: EditorDocument; inverseCommands: EditorCommand[]; summary: string } {
  const validation = validateCanardoResponse(response, document);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  let next = structuredClone(document);
  for (const command of response.commands) next = applyCommand(next, command);
  return { document: next, inverseCommands: [{ type: "restoreDocument", document: structuredClone(document) }], summary: response.summary };
}
