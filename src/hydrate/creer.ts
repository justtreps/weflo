import { creationFormats, creationWorkspaceUrl, renderCreateWorkspace, renderStrategyBackControl } from "../create/workspace";
import { flowForFormat } from "../create/format-flow";
import { answersFromFormData, validateFormatIntake } from "../create/format-intake";
import {
  initialCreationState,
  creationStartupAction,
  mergeCompatibleCreationDraft,
  restoreCreationDraft,
  serializeCreationDraft,
  submissionActionForState,
  transitionCreationFlow,
  type CreationFlowState,
} from "../create/flow-state";
import type { OnboardingDraft } from "../onboarding/types";
import { guardSession } from "./session-guard";
import { readApiJson } from "./onboarding-request";
import { renderBuildExperience } from "../create/build-view";
import { createSubmissionLock } from "../create/submission-lock";
import { synchronizeOnboardingDraft } from "../create/onboarding-sync";
import "./creer.css";

type PublicDraft = Omit<OnboardingDraft, "claimTokenHash">;
const CREATION_DRAFT_KEY = "weflo-create-draft-v2";
const root = document.querySelector<HTMLElement>("#create-app");
let state = initialCreationState(new URL(location.href));
let missingFieldIds: string[] = [];
let draft: PublicDraft | null = null;
let token = "";
let error = "";
let busy = false;
let workspaceName = "Ton espace";
let buildStageIndex = 0;
const submissionLock = createSubmissionLock();

function esc(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!); }
async function request(url: string, init: RequestInit) { const response = await fetch(url, init); const body = await readApiJson(response); if (!response.ok) throw new Error(body.message || "Cette étape n’a pas abouti."); return body; }
function readSavedState(): CreationFlowState | null { try { return restoreCreationDraft(sessionStorage.getItem(CREATION_DRAFT_KEY)); } catch { return null; } }
function persistState() { try { sessionStorage.setItem(CREATION_DRAFT_KEY, serializeCreationDraft(state)); } catch { /* Storage may be unavailable; URL state still works. */ } }
function replaceWorkspaceUrl() { history.replaceState({}, "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt })); }
function commitState(next: CreationFlowState, shouldRender = true) { state=next;persistState();replaceWorkspaceUrl();if(shouldRender)render(); }
function render() {
  if (!root) return;
  if (state.step === "strategy" && draft) root.innerHTML=renderStrategy();
  else if (state.step === "build" && draft) renderBuild();
  else root.innerHTML=renderCreateWorkspace({ workspaceName, state, missingFieldIds, busy:submissionLock.locked });
  bind();
}
function renderStrategy() {
  const choices = [...draft!.personas.map((item) => ({ ...item, kind: "persona" })), ...draft!.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li>✓ <span>Format</span></li><li>✓ <span>Produit</span></li><li class="active">3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside><main>${renderStrategyBackControl()}<div class="create-heading"><p>${esc(creationFormats.find((item) => item.id === state.format)?.title ?? "Création")}</p><h1>À qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l’offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc(item.id)}" aria-pressed="${item.selected}"><strong>${esc(item.icon)} ${esc(item.title)}</strong><small>${esc(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction…" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() { if (!root || !draft) return; const formatTitle = creationFormats.find((item) => item.id === state.format)?.title ?? "Boutique"; root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>✓ <span>Format</span></li><li>✓ <span>Produit</span></li><li>✓ <span>Stratégie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside>${renderBuildExperience({ brandName:draft.brandName || "Ta marque", formatTitle, stages:draft.stages, activeIndex:buildStageIndex, productImage:draft.product?.images[0] })}</div>`; }
async function syncDraft(includeStrategy = false) { if (!draft) return; const strategy = includeStrategy ? { personas:draft.personas, angles:draft.angles } : undefined; await synchronizeOnboardingDraft({ draftId:draft.id, claimToken:token, state, strategy, request }); }
async function importLink(value: string) { const body = await request("/api/onboarding/import", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ sourceUrl:value, language:"fr" }) }); draft = body.draft; token = body.claimToken; await syncDraft(); }
async function importImage(file: File) { if (file.size > 450_000) throw new Error("Choisis une image de moins de 450 Ko."); const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=()=>reject(new Error("Impossible de lire l’image."));reader.readAsDataURL(file); }); const body = await request("/api/onboarding/import-image", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ imageDataUrl:data, fileName:file.name, language:"fr" }) }); draft=body.draft; token=body.claimToken; await syncDraft(); }
async function createSimple() { const type = state.format === "blog" ? "write" : state.format === "blank" ? "blank" : "sell"; const name = state.prompt.trim() || Object.values(state.answers).find((value)=>value.trim()) || creationFormats.find((item) => item.id === state.format)?.title || "Nouvelle page"; const page = await request("/api/pages", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ type, name, creationFormat:state.format, templateId:state.templateId, answers:state.answers }) }); location.assign(`/editeur?page=${page.id}`); }
async function build() { if (!draft) return; state=transitionCreationFlow(state,{type:"START_BUILD"});persistState();replaceWorkspaceUrl();busy=true;error="";buildStageIndex=0;renderBuild();let timer:ReturnType<typeof setInterval>|undefined;try{await syncDraft(true);buildStageIndex=1;renderBuild();timer=setInterval(()=>{if(!draft)return;const ceiling=Math.max(1,draft.stages.length-2);if(buildStageIndex<ceiling){buildStageIndex+=1;renderBuild();}},650);await request(`/api/onboarding/${draft.id}/build`,{method:"POST",headers:{"x-weflo-claim-token":token}});if(timer)clearInterval(timer);timer=undefined;while(buildStageIndex<draft.stages.length-1){buildStageIndex+=1;renderBuild();await new Promise((resolve)=>setTimeout(resolve,90));}const claimed=await request(`/api/onboarding/${draft.id}/claim`,{method:"POST",headers:{"x-weflo-claim-token":token}});await new Promise((resolve)=>setTimeout(resolve,450));location.assign(`/editeur?page=${claimed.pageId}`);}finally{if(timer)clearInterval(timer);} }
function bind() {
  root?.querySelectorAll<HTMLElement>("[data-create-format]").forEach((button)=>button.addEventListener("click",()=>{missingFieldIds=[];draft=null;commitState(transitionCreationFlow(state,{type:"SELECT_FORMAT",format:button.dataset.createFormat as CreationFlowState["format"] & string}));if(state.step==="create-blank")void createSimple().catch((reason)=>{error=reason instanceof Error?reason.message:"Création impossible";render();});}));
  root?.querySelector("[data-back-format]")?.addEventListener("click",()=>{missingFieldIds=[];draft=null;commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelector("[data-back-template]")?.addEventListener("click",()=>{missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLButtonElement>("button[data-create-source]").forEach((button)=>button.addEventListener("click",()=>{commitState(transitionCreationFlow(state,{type:"SELECT_SOURCE",source:button.dataset.createSource as CreationFlowState["source"]}));root?.querySelector<HTMLTextAreaElement>('[name="prompt"]')?.focus();}));
  root?.querySelector<HTMLInputElement>("[data-create-image]")?.addEventListener("change",async(event)=>{
    const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;
    const form=root?.querySelector<HTMLFormElement>("[data-source-form]");
    if(form){const data=new FormData(form);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});}
    state=transitionCreationFlow(state,{type:"SELECT_SOURCE",source:"image"});persistState();replaceWorkspaceUrl();
    missingFieldIds=state.format?validateFormatIntake(flowForFormat(state.format),state.answers):[];
    try{busy=true;await importImage(file);if(!missingFieldIds.length)commitState(transitionCreationFlow(state,{type:"CONTINUE"}));else render();}catch(reason){error=reason instanceof Error?reason.message:"Import impossible";render();}finally{busy=false;}
  });
  const intakeForm=root?.querySelector<HTMLFormElement>("[data-source-form]");
  intakeForm?.addEventListener("input",()=>{const data=new FormData(intakeForm);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"")});persistState();replaceWorkspaceUrl();});
  intakeForm?.addEventListener("submit",async(event)=>{
    event.preventDefault();if(!submissionLock.tryAcquire())return;const data=new FormData(event.currentTarget as HTMLFormElement);
    let updated=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});
    missingFieldIds=updated.format?validateFormatIntake(flowForFormat(updated.format),updated.answers):[];
    commitState(updated,false);
    if(missingFieldIds.length){submissionLock.release();render();return;}
    const firstAnswer=Object.values(updated.answers).find((value)=>value.trim())??"";
    if(!updated.prompt&&!firstAnswer){submissionLock.release();render();return;}
    if(!updated.prompt){updated=transitionCreationFlow(updated,{type:"UPDATE_INTAKE",answers:updated.answers,prompt:firstAnswer});commitState(updated,false);}
    const action=submissionActionForState(updated);
    if(action==="image"&&!draft){submissionLock.release();error="Ajoute une image avant de continuer.";render();return;}
    render();
    try{error="";if(action==="link")await importLink(updated.prompt);if(action==="image")await syncDraft();if(action==="simple"){state=transitionCreationFlow(updated,{type:"CONTINUE"});persistState();replaceWorkspaceUrl();await createSimple();return;}submissionLock.release();commitState(transitionCreationFlow(updated,{type:"CONTINUE"}));}catch(reason){submissionLock.release();if(state.step==="strategy"&&!draft)state=transitionCreationFlow(state,{type:"BACK"});persistState();replaceWorkspaceUrl();error=reason instanceof Error?reason.message:"Import impossible";render();}
  });
  root?.querySelectorAll<HTMLAnchorElement>("[data-template-select]").forEach((link)=>link.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const id=link.dataset.templateSelect;if(id){missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));}}));
  const dialog=root?.querySelector<HTMLDialogElement>("[data-template-dialog]");
  root?.querySelectorAll<HTMLElement>("[data-template-device]").forEach((button)=>button.addEventListener("click",()=>{const preview=button.closest<HTMLElement>("[data-template-preview]");if(!preview)return;const device=button.dataset.templateDevice;if(device!=="desktop"&&device!=="mobile")return;preview.dataset.previewDevice=device;preview.querySelectorAll<HTMLElement>("[data-template-device]").forEach((item)=>item.setAttribute("aria-pressed",String(item===button)));}));
  const setDialogDevice=(device:"desktop"|"mobile")=>{if(!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const stage=dialog.querySelector<HTMLElement>("[data-template-dialog-stage]");if(!image||!stage)return;const source=image.dataset[device];if(!source)return;image.src=source;stage.dataset.previewDevice=device;dialog.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.templateDialogDevice===device)));};
  dialog?.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.addEventListener("click",()=>{const device=button.dataset.templateDialogDevice;if(device==="desktop"||device==="mobile")setDialogDevice(device);}));
  root?.querySelectorAll<HTMLElement>("[data-template-open]").forEach((button)=>button.addEventListener("click",()=>{const id=button.dataset.templateOpen;const card=id?root.querySelector<HTMLElement>(`[data-template-card="${id}"]`):null;if(!id||!card||!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const desktop=card.querySelector<HTMLImageElement>('[data-preview-image="desktop"]');const mobile=card.querySelector<HTMLImageElement>('[data-preview-image="mobile"]');const name=card.querySelector("h2")?.textContent??"Modèle";const description=card.querySelector("p")?.textContent??"";if(image&&desktop&&mobile){image.dataset.desktop=desktop.src;image.dataset.mobile=mobile.src;image.alt=desktop.alt;setDialogDevice("desktop");}dialog.querySelector("[data-template-dialog-title]")!.textContent=name;dialog.querySelector("[data-template-dialog-description]")!.textContent=description;const select=dialog.querySelector<HTMLAnchorElement>("[data-template-dialog-select]");if(select){select.href=creationWorkspaceUrl(state.format,id,{source:state.source,prompt:state.prompt});select.dataset.templateId=id;}dialog.showModal();}));
  dialog?.querySelector<HTMLAnchorElement>("[data-template-dialog-select]")?.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const id=(event.currentTarget as HTMLAnchorElement).dataset.templateId;if(!id)return;event.preventDefault();dialog.close();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));});
  root?.querySelector("[data-back-strategy]")?.addEventListener("click",()=>{submissionLock.release();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLElement>("[data-strategy]").forEach((button)=>button.addEventListener("click",()=>{const[kind,id]=(button.dataset.strategy??"").split(":");const list=kind==="persona"?draft?.personas:draft?.angles;const item=list?.find((entry)=>entry.id===id);if(item)item.selected=!item.selected;render();}));
  root?.querySelector("[data-build]")?.addEventListener("click",()=>void build().catch((reason)=>{busy=false;if(state.step==="build")state=transitionCreationFlow(state,{type:"BACK"});persistState();replaceWorkspaceUrl();error=reason instanceof Error?reason.message:"Construction impossible";render();}));
}
window.addEventListener("popstate",()=>{const url=new URL(location.href);state=mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")void createSimple().catch((reason)=>{error=reason instanceof Error?reason.message:"Création impossible";render();});else render();});
void (async()=>{const me=await guardSession();if(!me)return;workspaceName=me.workspace.name;const url=new URL(location.href);state=mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")await createSimple();else render();})();
