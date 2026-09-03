import { applyCommand, type EditorCommand } from "../editor/commands";
import type { EditorDocument } from "../editor/document";
import type { CanardoCustomProposal, CanardoResponse } from "./protocol";
import { validateCanardoResponse } from "./validate";
import { compileCustomWeb } from "./custom-compile-web";
import { customSectionChecksum } from "./custom-planner";
import { validateCustomSectionSpec } from "./custom-validate";

export function applyCanardoOperations(document: EditorDocument, response: CanardoResponse): { document: EditorDocument; inverseCommands: EditorCommand[]; summary: string } {
  const validation = validateCanardoResponse(response, document);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  let next = structuredClone(document);
  for (const command of response.commands) next = applyCommand(next, command);
  return { document: next, inverseCommands: [{ type: "restoreDocument", document: structuredClone(document) }], summary: response.summary };
}

export function confirmCustomProposal(
  proposal: CanardoCustomProposal,
  document: EditorDocument,
  selectedId: string | null = null,
  stored?: { id: string; version: number; checksum: string },
): CanardoResponse {
  if (!proposal || proposal.mode !== "custom-section" || proposal.requiresConfirmation !== true) throw new Error("confirmation requise");
  const validation = validateCustomSectionSpec(proposal.spec);
  if (!validation.ok || customSectionChecksum(proposal.spec) !== proposal.checksum) throw new Error("checksum de confirmation invalide");
  const page = document.pages.find((item) => item.sections.some((section) => section.id === selectedId)) ?? document.pages[0];
  if (!page) throw new Error("page introuvable");
  const base = proposal.spec.id; const taken = new Set(document.pages.flatMap((item) => item.sections.map((section) => section.id)));
  let suffix = 1; let id = base; while (taken.has(id)) id = `${base}-${suffix++}`;
  const html = compileCustomWeb({ spec: proposal.spec, designProfile: document.designProfile });
  const section = { id, type: "customCode", name: proposal.spec.name, hidden: false, locked: false, settings: { html, css: "", js: "", custom_spec: JSON.stringify(proposal.spec), custom_checksum: proposal.checksum, ...(stored ? { custom_section_id: stored.id, custom_section_version: stored.version, custom_checksum: stored.checksum } : {}) }, style: {}, responsive: {}, blocks: [] } as const;
  const index = selectedId ? Math.max(0, page.sections.findIndex((item) => item.id === selectedId) + 1) : page.sections.length;
  const command = { type: "insertSection", pageId: page.id, index, section } as const;
  return { message: proposal.message, summary: proposal.summary, commands: [command], operations: [command] };
}
