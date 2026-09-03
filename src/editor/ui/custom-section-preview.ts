import type { CanardoCustomProposal } from "../../canardo/protocol";
import { escapeEditorHtml } from "../render/render-section";

export type CustomPreviewViewport = "desktop" | "mobile";

/** Scriptless, same-origin-only document preview. The generated document has no network or scripts. */
export function customPreviewMarkup(proposal: CanardoCustomProposal, viewport: CustomPreviewViewport = "desktop"): string {
  const srcdoc = proposal.preview[viewport];
  const width = viewport === "mobile" ? "390px" : "100%";
  return `<section data-canardo-custom-preview data-preview-viewport="${viewport}"><div><button type="button" data-canardo-preview-viewport="desktop" aria-pressed="${viewport === "desktop"}">Bureau</button><button type="button" data-canardo-preview-viewport="mobile" aria-pressed="${viewport === "mobile"}">Mobile</button></div><iframe title="Aperçu de ${escapeEditorHtml(proposal.spec.name)}" sandbox="allow-same-origin" referrerpolicy="no-referrer" style="display:block;width:${width};max-width:100%;min-height:280px;margin:10px auto;border:1px solid #dedbd3" srcdoc="${escapeEditorHtml(srcdoc)}"></iframe></section>`;
}

export function setCustomPreviewViewport(container: HTMLElement, proposal: CanardoCustomProposal, viewport: CustomPreviewViewport): void {
  const frame = container.querySelector<HTMLIFrameElement>("iframe");
  if (!frame) return;
  container.dataset.previewViewport = viewport;
  frame.style.width = viewport === "mobile" ? "390px" : "100%";
  frame.srcdoc = proposal.preview[viewport];
  container.querySelectorAll<HTMLButtonElement>("[data-canardo-preview-viewport]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.canardoPreviewViewport === viewport)));
}
