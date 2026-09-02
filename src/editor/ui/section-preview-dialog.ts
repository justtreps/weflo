import { fixtureById } from "../../section-preview/fixtures";
import { previewManifest } from "../../section-preview/manifests";
import { renderSectionPreview } from "../../section-preview/document";
import type { PreviewViewport } from "../../section-preview/types";

export type SectionPreviewDialogOptions={sectionType:string;variantId:string;fixtureId:string;trigger?:HTMLElement|null;onInsert(sectionType:string,variantId:string):void};

export function openSectionPreviewDialog(options:SectionPreviewDialogOptions):HTMLDialogElement {
  document.querySelector<HTMLDialogElement>("[data-section-preview-dialog]")?.remove();
  const manifest=previewManifest(options.sectionType,options.variantId);
  let fixtureId=manifest.compatibleFixtureIds.includes(options.fixtureId)?options.fixtureId:manifest.defaultFixtureId;
  let viewport:PreviewViewport="desktop";
  let context=true;
  const dialog=document.createElement("dialog");
  dialog.className="section-preview-dialog";dialog.dataset.sectionPreviewDialog="";dialog.setAttribute("aria-modal","true");
  dialog.innerHTML=`<header><div><small>${manifest.conversionGoal}</small><strong>${manifest.title}</strong></div><div class="section-preview-actions"><button type="button" data-preview-viewport="desktop" aria-pressed="true">Bureau</button><button type="button" data-preview-viewport="mobile" aria-pressed="false">Mobile</button><label>Produit démo<select data-preview-fixture>${manifest.compatibleFixtureIds.map((id)=>`<option value="${id}"${id===fixtureId?" selected":""}>${fixtureById(id).brand.name} · ${fixtureById(id).product.title}</option>`).join("")}</select></label><label class="section-preview-context"><input type="checkbox" data-preview-context checked> Avec contexte</label><button type="button" data-preview-close aria-label="Fermer">×</button></div></header><div class="section-preview-stage" data-preview-stage><iframe title="Aperçu interactif de ${manifest.title}"></iframe></div><footer><span>La section sera adaptée à ton produit et à ta marque.</span><button type="button" data-preview-insert>Ajouter cette section</button></footer>`;
  const select=dialog.querySelector<HTMLSelectElement>("[data-preview-fixture]")!;
  const frame=dialog.querySelector<HTMLIFrameElement>("iframe")!;
  const paint=()=>{frame.srcdoc=renderSectionPreview({sectionType:options.sectionType,variantId:options.variantId,fixtureId,viewport,context});dialog.dataset.viewport=viewport;};
  dialog.addEventListener("click",(event)=>{const target=(event.target as HTMLElement).closest<HTMLElement>("button");if(!target)return;if(target.matches("[data-preview-close]")){dialog.close();return;}if(target.dataset.previewViewport){viewport=target.dataset.previewViewport as PreviewViewport;dialog.querySelectorAll("[data-preview-viewport]").forEach((button)=>button.setAttribute("aria-pressed",String(button===target)));paint();}if(target.matches("[data-preview-insert]")){options.onInsert(options.sectionType,options.variantId);dialog.close();}});
  select.addEventListener("change",()=>{fixtureId=select.value;paint();});
  dialog.querySelector<HTMLInputElement>("[data-preview-context]")!.addEventListener("change",(event)=>{context=(event.target as HTMLInputElement).checked;paint();});
  dialog.addEventListener("close",()=>{dialog.remove();options.trigger?.focus();});
  document.body.appendChild(dialog);paint();dialog.showModal();return dialog;
}
