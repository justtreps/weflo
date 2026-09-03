import { escapeEditorHtml } from "../render/render-section";
import { catalogItemForVariant } from "../../section-preview/manifests";
import type { CanardoProposal, CanardoResponse } from "../../canardo/protocol";
import { customPreviewMarkup } from "./custom-section-preview";

function commandPreview(command:CanardoResponse["commands"][number]):string {
  if (command.type !== "insertSection") return `<li>${escapeEditorHtml(command.type)}${"sectionId" in command ? ` · ${escapeEditorHtml(command.sectionId)}` : ""}</li>`;
  const variant=typeof command.section.settings.variant === "string" ? command.section.settings.variant : "default";
  const item=catalogItemForVariant(command.section.type,variant);
  if (!item) return `<li class="editor-canardo-operation">Ajouter ${escapeEditorHtml(command.section.name)}</li>`;
  const badges=item.capabilityBadges.map((badge)=>`<small class="is-${badge.state}">${escapeEditorHtml(badge.label)} · ${badge.state === "native" ? "Natif" : badge.state === "app-required" ? "Application requise" : "Indisponible"}</small>`).join("");
  return `<li class="editor-canardo-preview"><img src="${escapeEditorHtml(item.preview.desktop)}" alt=""><span><strong>${escapeEditorHtml(item.title)}</strong><em>${escapeEditorHtml(item.conversionGoal)}</em>${badges ? `<i>${badges}</i>` : ""}</span></li>`;
}

export function canardoReviewMarkup(response: CanardoProposal): string {
  if ("mode" in response && response.mode === "custom-section") {
    const blockers = response.validation.capabilityBlockers.length ? `<p role="status">Configuration Shopify requise : ${response.validation.capabilityBlockers.map(escapeEditorHtml).join(" ")}</p>` : `<p>Validation : ${response.validation.nodeCount} primitives vérifiées.</p>`;
    return `<div class="editor-canardo-review" data-canardo-review data-canardo-custom-checksum="${escapeEditorHtml(response.checksum)}"><strong>${escapeEditorHtml(response.summary)}</strong><p>Cette section est compilée depuis une spécification sûre. Aucun code du modèle n’est exécuté.</p>${blockers}${customPreviewMarkup(response)}<div><button type="button" data-canardo-reject>Annuler</button><button type="button" data-canardo-accept>Ajouter</button></div></div>`;
  }
  return `<div class="editor-canardo-review" data-canardo-review><strong>${escapeEditorHtml(response.summary)}</strong><p>Cette composition restera une proposition jusqu’à confirmation.</p><ul>${response.commands.map(commandPreview).join("")}</ul><div><button type="button" data-canardo-reject>Annuler</button><button type="button" data-canardo-accept>Confirmer et appliquer</button></div></div>`;
}
