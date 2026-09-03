import { creationFormats, creationWorkspaceUrl, renderCreateWorkspace, renderStrategyBackControl } from "../create/workspace";
import { flowForFormat, type CreationSource } from "../create/format-flow";
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
import { fetchWithDeadline, readApiJson } from "./onboarding-request";
import { renderBuildExperience } from "../create/build-view";
import { createSubmissionLock } from "../create/submission-lock";
import { synchronizeOnboardingDraft } from "../create/onboarding-sync";
import "./creer.css";

type PublicDraft = Omit<OnboardingDraft, "claimTokenHash">;
type ShopifyCatalogProduct = { id: string; title: string; vendor: string; price: number | null; currency: string; image: string | null };
type ShopifyCatalogState = {
  status: "idle" | "loading" | "ready" | "unavailable";
  products: ShopifyCatalogProduct[];
  message: string;
  selectedId: string | null;
  selectedTitle: string;
};
type DraftProvenance = { source: CreationSource | null; shopifyProductId: string | null };
const CREATION_DRAFT_KEY = "weflo-create-draft-v2";
const root = document.querySelector<HTMLElement>("#create-app");
let state = initialCreationState(new URL(location.href));
let missingFieldIds: string[] = [];
let draft: PublicDraft | null = null;
let token = "";
let draftProvenance: DraftProvenance | null = null;
let error = "";
let busy = false;
let workspaceName = "Ton espace";
let buildStageIndex = 0;
let shopifyCatalog: ShopifyCatalogState = { status:"idle", products:[], message:"", selectedId:null, selectedTitle:"" };
const submissionLock = createSubmissionLock();

function emptyShopifyCatalog(): ShopifyCatalogState { return { status:"idle", products:[], message:"", selectedId:null, selectedTitle:"" }; }
function clearDraft() { draft=null;token="";draftProvenance=null; }
function acceptDraft(body:Record<string,any>,provenance:DraftProvenance){if(!body.draft||typeof body.claimToken!=="string"||!body.claimToken)throw new Error("La réponse du serveur est invalide. Réessaie.");draft=body.draft as PublicDraft;token=body.claimToken;draftProvenance=provenance;}
function draftMatchesSource(source:CreationFlowState["source"]){return Boolean(draft&&token&&draftProvenance?.source===source);}
function validShopifyDraft(){const selectedId=shopifyCatalog.selectedId;return shopifyCatalog.status==="ready"&&Boolean(selectedId&&shopifyCatalog.products.some((product)=>product.id===selectedId)&&draftMatchesSource("shopify")&&draftProvenance?.shopifyProductId===selectedId);}
function resetArtifactsForSourceChange(nextSource:CreationFlowState["source"]){if(nextSource===state.source)return;clearDraft();shopifyCatalog=emptyShopifyCatalog();error="";}

function esc(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!); }
function requestCopy(url: string) {
  if (url === "/api/pages") return { timeout:"La création de la page vierge prend trop de temps. Réessaie.", failure:"Impossible de créer la page vierge. Réessaie." };
  if (url.endsWith("/shopify/products")) return { timeout:"Le catalogue Shopify met trop de temps à répondre. Réessaie.", failure:"Impossible de charger le catalogue Shopify. Réessaie." };
  if (url.endsWith("/import-shopify")) return { timeout:"L’importation du produit Shopify prend trop de temps. Réessaie.", failure:"Impossible d’importer ce produit Shopify. Réessaie." };
  if (url.endsWith("/import-image")) return { timeout:"L’analyse de l’image prend trop de temps. Réessaie.", failure:"Impossible d’analyser cette image. Réessaie." };
  if (url.endsWith("/import")) return { timeout:"L’importation du lien prend trop de temps. Réessaie ou importe une image.", failure:"Impossible d’importer ce lien. Réessaie." };
  if (url.endsWith("/start")) return { timeout:"La préparation de la stratégie prend trop de temps. Réessaie.", failure:"Impossible de préparer la stratégie. Réessaie." };
  if (url.endsWith("/build")) return { timeout:"La construction de la page prend trop de temps. Réessaie.", failure:"Impossible de construire la page. Réessaie." };
  if (url.endsWith("/claim")) return { timeout:"L’ouverture de l’éditeur prend trop de temps. Réessaie.", failure:"Impossible d’ouvrir la page dans l’éditeur. Réessaie." };
  return { timeout:"La mise à jour de la création prend trop de temps. Réessaie.", failure:"Impossible de mettre à jour la création. Réessaie." };
}
async function request(url: string, init: RequestInit) {
  const copy=requestCopy(url);
  let response:Response;
  try{response=await fetchWithDeadline(url,init,30_000,fetch,copy.timeout);}catch(reason){if(reason instanceof Error&&reason.message===copy.timeout)throw reason;throw new Error(copy.failure);}
  const body=await readApiJson(response,copy.failure);
  if(!response.ok)throw new Error(body.message||copy.failure);
  return body;
}
function readSavedState(): CreationFlowState | null { try { return restoreCreationDraft(sessionStorage.getItem(CREATION_DRAFT_KEY)); } catch { return null; } }
function persistState() { try { sessionStorage.setItem(CREATION_DRAFT_KEY, serializeCreationDraft(state)); } catch { /* Storage may be unavailable; URL state still works. */ } }
function workspaceHistoryState() { return { ...(history.state && typeof history.state === "object" ? history.state : {}), wefloCreationDraft:serializeCreationDraft(state) }; }
function replaceWorkspaceUrl() { history.replaceState(workspaceHistoryState(), "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt })); }
function pushWorkspaceUrl() { history.pushState(workspaceHistoryState(), "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt })); }
function commitState(next: CreationFlowState, shouldRender = true, historyMode: "push" | "replace" = "push") { state=next;persistState();if(historyMode==="push")pushWorkspaceUrl();else replaceWorkspaceUrl();if(shouldRender)render(); }
function render() {
  if (!root) return;
  if (state.step === "create-blank") root.innerHTML=renderBlankCreation();
  else if (state.step === "strategy" && draft) root.innerHTML=renderStrategy();
  else if (state.step === "build" && draft) renderBuild();
  else root.innerHTML=renderCreateWorkspace({ workspaceName, state, missingFieldIds, busy:submissionLock.locked });
  if (state.step === "intake" && state.source === "shopify") root.querySelector(".source-grid")?.insertAdjacentHTML("afterend",renderShopifyCatalog());
  bind();
}
function renderBlankCreation() {
  const content=busy
    ? `<section class="blank-startup" data-blank-startup><p>Page vierge</p><h1>Création de la page vierge…</h1><span>Nous préparons un document vide dans l’éditeur.</span></section>`
    : `<section class="blank-startup" data-blank-startup><p>Page vierge</p><h1>Impossible de créer la page vierge</h1><div class="create-error" role="alert">${esc(error||"La création n’a pas abouti.")}</div><div class="blank-startup-actions"><button type="button" data-blank-retry>Réessayer</button><a href="/dashboard">Retour à l’espace</a></div></section>`;
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li>✓ <span>Format</span></li><li class="active">2 <span>Création</span></li><li>3 <span>Éditeur</span></li></ol><small>${esc(workspaceName)}</small></aside><main>${content}</main></div>`;
}
function shopifyPrice(product:ShopifyCatalogProduct){return product.price==null?"Prix non renseigné":new Intl.NumberFormat("fr-FR",{style:"currency",currency:product.currency||"EUR"}).format(product.price);}
function renderShopifyCatalog(){
  if(shopifyCatalog.status==="loading")return `<section class="shopify-catalog" data-shopify-catalog aria-live="polite"><h2>Choisis un produit Shopify</h2><p>Chargement du catalogue connecté…</p></section>`;
  if(shopifyCatalog.status==="unavailable")return `<section class="shopify-catalog" data-shopify-catalog><h2>Catalogue Shopify indisponible</h2><p class="create-error" role="alert">${esc(shopifyCatalog.message)}</p><div class="shopify-catalog-actions"><button type="button" data-shopify-load>Réessayer</button><a href="/boutique">Reconnecter Shopify</a></div></section>`;
  if(shopifyCatalog.status==="idle")return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2><p>Charge les produits actifs de la boutique connectée.</p><button type="button" data-shopify-load>Charger le catalogue</button></section>`;
  if(!shopifyCatalog.products.length)return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2><p role="status">Aucun produit actif n’est disponible dans le catalogue connecté.</p><div class="shopify-catalog-actions"><button type="button" data-shopify-load>Actualiser</button><a href="/boutique">Vérifier Shopify</a></div></section>`;
  const selected=shopifyCatalog.selectedId?`<p class="shopify-product-selected" role="status">${esc(shopifyCatalog.selectedTitle)} est prêt à être utilisé.</p>`:"";
  const message=shopifyCatalog.message?`<p class="create-error" role="alert">${esc(shopifyCatalog.message)}</p>`:"";
  return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2>${selected}${message}<div class="shopify-product-list">${shopifyCatalog.products.map((product)=>`<button type="button" data-shopify-product="${esc(product.id)}" aria-pressed="${product.id===shopifyCatalog.selectedId}">${product.image?`<img src="${esc(product.image)}" alt="">`:`<span aria-hidden="true">▣</span>`}<strong>${esc(product.title)}</strong><small>${esc(product.vendor)} · ${esc(shopifyPrice(product))}</small></button>`).join("")}</div><button type="button" class="shopify-refresh" data-shopify-load>Actualiser le catalogue</button></section>`;
}
function renderStrategy() {
  const choices = [...draft!.personas.map((item) => ({ ...item, kind: "persona" })), ...draft!.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li>✓ <span>Format</span></li><li>✓ <span>Informations</span></li><li class="active">3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside><main>${renderStrategyBackControl()}<div class="create-heading"><p>${esc(creationFormats.find((item) => item.id === state.format)?.title ?? "Création")}</p><h1>À qui doit parler cette page ?</h1><span>Canardo a préparé ces pistes à partir de tes informations. Active celles qui doivent guider les titres, les preuves et l’offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc(item.id)}" aria-pressed="${item.selected}"><strong>${esc(item.icon)} ${esc(item.title)}</strong><small>${esc(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction…" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() { if (!root || !draft) return; const formatTitle = creationFormats.find((item) => item.id === state.format)?.title ?? "Boutique"; root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>✓ <span>Format</span></li><li>✓ <span>Informations</span></li><li>✓ <span>Stratégie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside>${renderBuildExperience({ brandName:draft.brandName || "Ta marque", formatTitle, stages:draft.stages, activeIndex:buildStageIndex, productImage:draft.product?.images[0] })}</div>`; }
async function syncDraft(includeStrategy = false) { if (!draftMatchesSource(state.source)||!draft) throw new Error("La source de cette analyse ne correspond plus à la création. Relance l’importation."); const strategy = includeStrategy ? { personas:draft.personas, angles:draft.angles } : undefined; await synchronizeOnboardingDraft({ draftId:draft.id, claimToken:token, state, strategy, request }); }
async function importLink(value: string) { const body = await request("/api/onboarding/import", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ sourceUrl:value, language:"fr" }) }); acceptDraft(body,{source:"link",shopifyProductId:null});await syncDraft(); }
async function importImage(file: File) { if (file.size > 450_000) throw new Error("Choisis une image de moins de 450 Ko."); const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=()=>reject(new Error("Impossible de lire l’image."));reader.readAsDataURL(file); }); const body = await request("/api/onboarding/import-image", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ imageDataUrl:data, fileName:file.name, language:"fr" }) }); acceptDraft(body,{source:"image",shopifyProductId:null});await syncDraft(); }
async function startFromAnswers() { const body = await request("/api/onboarding/start", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ creationFormat:state.format, templateId:state.templateId, answers:state.answers, prompt:state.prompt, language:"fr" }) }); acceptDraft(body,{source:state.source,shopifyProductId:null}); }
async function loadShopifyProducts(){shopifyCatalog={...shopifyCatalog,status:"loading",message:""};render();try{const body=await request("/api/shopify/products",{method:"GET"});const products=Array.isArray(body.products)?body.products:[];const selectedStillExists=Boolean(shopifyCatalog.selectedId&&products.some((product:ShopifyCatalogProduct)=>product.id===shopifyCatalog.selectedId));if(!selectedStillExists&&draftProvenance?.source==="shopify")clearDraft();shopifyCatalog={...shopifyCatalog,status:"ready",products,message:"",selectedId:selectedStillExists?shopifyCatalog.selectedId:null,selectedTitle:selectedStillExists?shopifyCatalog.selectedTitle:""};}catch(reason){if(draftProvenance?.source==="shopify")clearDraft();shopifyCatalog={...shopifyCatalog,status:"unavailable",products:[],selectedId:null,selectedTitle:"",message:reason instanceof Error?reason.message:"Impossible de charger le catalogue Shopify. Réessaie."};}render();}
async function importShopifyProduct(productId:string){const product=shopifyCatalog.products.find((item)=>item.id===productId);if(!product)return;const form=root?.querySelector<HTMLFormElement>("[data-source-form]");if(form){const data=new FormData(form);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"")});persistState();replaceWorkspaceUrl();}clearDraft();shopifyCatalog={...shopifyCatalog,status:"loading",selectedId:productId,selectedTitle:product.title,message:""};render();try{const body=await request("/api/onboarding/import-shopify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId,language:"fr"})});acceptDraft(body,{source:"shopify",shopifyProductId:productId});shopifyCatalog={...shopifyCatalog,status:"ready",selectedId:productId,selectedTitle:product.title,message:""};}catch(reason){clearDraft();shopifyCatalog={...shopifyCatalog,status:"unavailable",selectedId:null,selectedTitle:"",message:reason instanceof Error?reason.message:"Impossible d’importer ce produit Shopify. Réessaie."};}render();}
async function createBlankPage(){if(busy)return;busy=true;error="";render();try{const page=await request("/api/pages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"blank",name:"Page vierge",creationFormat:"blank",templateId:null,answers:{}})});location.assign(`/editeur?page=${page.id}`);}catch(reason){busy=false;error=reason instanceof Error?reason.message:"Impossible de créer la page vierge. Réessaie.";render();}}
async function build() { if (!draft) return; state=transitionCreationFlow(state,{type:"START_BUILD"});persistState();replaceWorkspaceUrl();busy=true;error="";buildStageIndex=0;renderBuild();let timer:ReturnType<typeof setInterval>|undefined;try{await syncDraft(true);buildStageIndex=1;renderBuild();timer=setInterval(()=>{if(!draft)return;const ceiling=Math.max(1,draft.stages.length-2);if(buildStageIndex<ceiling){buildStageIndex+=1;renderBuild();}},650);await request(`/api/onboarding/${draft.id}/build`,{method:"POST",headers:{"x-weflo-claim-token":token}});if(timer)clearInterval(timer);timer=undefined;while(buildStageIndex<draft.stages.length-1){buildStageIndex+=1;renderBuild();await new Promise((resolve)=>setTimeout(resolve,90));}const claimed=await request(`/api/onboarding/${draft.id}/claim`,{method:"POST",headers:{"x-weflo-claim-token":token}});await new Promise((resolve)=>setTimeout(resolve,450));location.assign(`/editeur?page=${claimed.pageId}`);}finally{if(timer)clearInterval(timer);} }
function bind() {
  root?.querySelectorAll<HTMLElement>("[data-create-format]").forEach((button)=>button.addEventListener("click",()=>{missingFieldIds=[];clearDraft();shopifyCatalog=emptyShopifyCatalog();commitState(transitionCreationFlow(state,{type:"SELECT_FORMAT",format:button.dataset.createFormat as CreationFlowState["format"] & string}));if(state.step==="create-blank")void createBlankPage();}));
  root?.querySelector("[data-back-format]")?.addEventListener("click",()=>{missingFieldIds=[];clearDraft();shopifyCatalog=emptyShopifyCatalog();commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelector("[data-back-template]")?.addEventListener("click",()=>{missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLButtonElement>("button[data-create-source]").forEach((button)=>button.addEventListener("click",()=>{const source=button.dataset.createSource as CreationFlowState["source"];resetArtifactsForSourceChange(source);commitState(transitionCreationFlow(state,{type:"SELECT_SOURCE",source}));if(source==="shopify")void loadShopifyProducts();else root?.querySelector<HTMLTextAreaElement>('[name="prompt"]')?.focus();}));
  root?.querySelector("[data-shopify-load]")?.addEventListener("click",()=>void loadShopifyProducts());
  root?.querySelectorAll<HTMLElement>("[data-shopify-product]").forEach((button)=>button.addEventListener("click",()=>{const id=button.dataset.shopifyProduct;if(id)void importShopifyProduct(id);}));
  root?.querySelector("[data-blank-retry]")?.addEventListener("click",()=>void createBlankPage());
  root?.querySelector<HTMLInputElement>("[data-create-image]")?.addEventListener("change",async(event)=>{
    const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;
    const form=root?.querySelector<HTMLFormElement>("[data-source-form]");
    if(form){const data=new FormData(form);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});}
    resetArtifactsForSourceChange("image");state=transitionCreationFlow(state,{type:"SELECT_SOURCE",source:"image"});persistState();replaceWorkspaceUrl();
    missingFieldIds=state.format?validateFormatIntake(flowForFormat(state.format),state.answers):[];
    try{busy=true;await importImage(file);if(!missingFieldIds.length)commitState(transitionCreationFlow(state,{type:"CONTINUE"}));else render();}catch(reason){error=reason instanceof Error?reason.message:"Import impossible";render();}finally{busy=false;}
  });
  const intakeForm=root?.querySelector<HTMLFormElement>("[data-source-form]");
  intakeForm?.addEventListener("input",()=>{const data=new FormData(intakeForm);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"")});persistState();replaceWorkspaceUrl();});
  intakeForm?.addEventListener("submit",async(event)=>{
    event.preventDefault();if(!submissionLock.tryAcquire())return;const data=new FormData(event.currentTarget as HTMLFormElement);
    let updated=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});
    missingFieldIds=updated.format?validateFormatIntake(flowForFormat(updated.format),updated.answers):[];
    commitState(updated,false,"replace");
    if(missingFieldIds.length){submissionLock.release();render();return;}
    const firstAnswer=Object.values(updated.answers).find((value)=>value.trim())??"";
    if(!updated.prompt&&!firstAnswer){submissionLock.release();render();return;}
    if(!updated.prompt){updated=transitionCreationFlow(updated,{type:"UPDATE_INTAKE",answers:updated.answers,prompt:firstAnswer});commitState(updated,false,"replace");}
    const action=submissionActionForState(updated);
    if(action==="image"&&!draftMatchesSource("image")){submissionLock.release();error="Ajoute une image avant de continuer.";render();return;}
    if(action==="shopify"&&!validShopifyDraft()){submissionLock.release();shopifyCatalog={...shopifyCatalog,message:"Choisis un produit du catalogue Shopify avant de continuer."};render();return;}
    render();
    try{error="";if(action==="link")await importLink(updated.prompt);if(action==="image"||action==="shopify")await syncDraft();if(action==="simple")await startFromAnswers();submissionLock.release();commitState(transitionCreationFlow(updated,{type:"CONTINUE"}));}catch(reason){submissionLock.release();if(state.step==="strategy"&&!draft)state=transitionCreationFlow(state,{type:"BACK"});persistState();replaceWorkspaceUrl();error=reason instanceof Error?reason.message:"Cette étape n’a pas abouti. Réessaie.";render();}
  });
  root?.querySelectorAll<HTMLAnchorElement>("[data-template-select]").forEach((link)=>link.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const id=link.dataset.templateSelect;if(id){missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));}}));
  const dialog=root?.querySelector<HTMLDialogElement>("[data-template-dialog]");
  root?.querySelectorAll<HTMLElement>("[data-template-device]").forEach((button)=>button.addEventListener("click",()=>{const preview=button.closest<HTMLElement>("[data-template-preview]");if(!preview)return;const device=button.dataset.templateDevice;if(device!=="desktop"&&device!=="mobile")return;preview.dataset.previewDevice=device;preview.querySelectorAll<HTMLElement>("[data-template-device]").forEach((item)=>item.setAttribute("aria-pressed",String(item===button)));}));
  const setDialogDevice=(device:"desktop"|"mobile")=>{if(!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const stage=dialog.querySelector<HTMLElement>("[data-template-dialog-stage]");if(!image||!stage)return;const source=image.dataset[device];if(!source)return;image.src=source;stage.dataset.previewDevice=device;dialog.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.templateDialogDevice===device)));};
  dialog?.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.addEventListener("click",()=>{const device=button.dataset.templateDialogDevice;if(device==="desktop"||device==="mobile")setDialogDevice(device);}));
  let dialogTrigger: HTMLElement | null = null;
  root?.querySelectorAll<HTMLElement>("[data-template-open]").forEach((button)=>button.addEventListener("click",()=>{const id=button.dataset.templateOpen;const card=id?root.querySelector<HTMLElement>(`[data-template-card="${id}"]`):null;if(!id||!card||!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const desktop=card.querySelector<HTMLImageElement>('[data-preview-image="desktop"]');const mobile=card.querySelector<HTMLImageElement>('[data-preview-image="mobile"]');const name=card.querySelector("h2")?.textContent??"Modèle";const description=card.querySelector("p")?.textContent??"";if(image&&desktop&&mobile){image.dataset.desktop=desktop.src;image.dataset.mobile=mobile.src;image.alt=desktop.alt;setDialogDevice("desktop");}dialog.querySelector("[data-template-dialog-title]")!.textContent=name;dialog.querySelector("[data-template-dialog-description]")!.textContent=description;const select=dialog.querySelector<HTMLAnchorElement>("[data-template-dialog-select]");if(select){select.href=creationWorkspaceUrl(state.format,id,{source:state.source,prompt:state.prompt});select.dataset.templateId=id;}dialogTrigger=button;dialog.showModal();}));
  dialog?.addEventListener("close",()=>dialogTrigger?.focus());
  dialog?.querySelector<HTMLAnchorElement>("[data-template-dialog-select]")?.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const id=(event.currentTarget as HTMLAnchorElement).dataset.templateId;if(!id)return;event.preventDefault();dialog.close();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));});
  root?.querySelector("[data-back-strategy]")?.addEventListener("click",()=>{submissionLock.release();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLElement>("[data-strategy]").forEach((button)=>button.addEventListener("click",()=>{const[kind,id]=(button.dataset.strategy??"").split(":");const list=kind==="persona"?draft?.personas:draft?.angles;const item=list?.find((entry)=>entry.id===id);if(item)item.selected=!item.selected;render();}));
  root?.querySelector("[data-build]")?.addEventListener("click",()=>void build().catch((reason)=>{busy=false;if(state.step==="build")state=transitionCreationFlow(state,{type:"BACK"});persistState();replaceWorkspaceUrl();error=reason instanceof Error?reason.message:"Construction impossible";render();}));
}
window.addEventListener("popstate",(event)=>{const url=new URL(location.href);const historyDraft=event.state&&typeof event.state.wefloCreationDraft==="string"?restoreCreationDraft(event.state.wefloCreationDraft):null;const next=historyDraft??mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);resetArtifactsForSourceChange(next.source);state=next;persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")void createBlankPage();else render();});
void (async()=>{const me=await guardSession();if(!me)return;workspaceName=me.workspace.name;const url=new URL(location.href);state=mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")void createBlankPage();else render();})();
