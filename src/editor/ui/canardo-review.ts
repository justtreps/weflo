import { escapeEditorHtml } from "../render/render-section";
import type { CanardoResponse } from "../../canardo/protocol";

export function canardoReviewMarkup(response: CanardoResponse): string {
  return `<div class="editor-canardo-review" data-canardo-review><strong>${escapeEditorHtml(response.summary)}</strong><ul>${response.commands.map((command) => `<li>${escapeEditorHtml(command.type)}${"sectionId" in command ? ` · ${escapeEditorHtml(command.sectionId)}` : ""}</li>`).join("")}</ul><div><button type="button" data-canardo-reject>Annuler</button><button type="button" data-canardo-accept>Appliquer</button></div></div>`;
}
