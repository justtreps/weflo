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
import { WIZARD_COPY, previousWizardStep, type WizardStepId } from "../onboarding/wizard";
import "./creer.css";

type PublicDraft = Omit<OnboardingDraft, "claimTokenHash">;
type ShopifyCatalogProduct = { id: string; title: string; vendor: string; price: number | null; currency: string; image: string | null };
type ShopifyCatalogState = {
  status: "idle" | "loading" | "ready" | "unavailable";
  products: ShopifyCatalogProduct[];
  message: string;
  selectedId: string | null;
  selectedTitle: string;
  nextCursor: string | null;
  previousCursor: string | null;
  page: number;
};
type DraftProvenance = { source: CreationSource | null; shopifyProductId: string | null };
const CREATION_DRAFT_KEY = "weflo-create-draft-v2";
const ONBOARDING_RESUME_KEY = "weflo:create-onboarding-v1";
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
let shopifyCatalog: ShopifyCatalogState = { status:"idle", products:[], message:"", selectedId:null, selectedTitle:"", nextCursor:null, previousCursor:null, page:1 };
const submissionLock = createSubmissionLock();
let intakeGeneration = 0;
let activeIntakeGeneration: number | null = null;
let wizardLoadingStep: WizardStepId | null = null;
let wizardController: AbortController | null = null;

function emptyShopifyCatalog(): ShopifyCatalogState { return { status:"idle", products:[], message:"", selectedId:null, selectedTitle:"", nextCursor:null, previousCursor:null, page:1 }; }
function beginIntakeOperation(): number | null { if(!submissionLock.tryAcquire())return null;const generation=++intakeGeneration;activeIntakeGeneration=generation;return generation; }
function currentIntakeOperation(generation:number,source?:CreationFlowState["source"]){return activeIntakeGeneration===generation&&(!source||state.source===source);}
function finishIntakeOperation(generation:number){if(activeIntakeGeneration!==generation)return;activeIntakeGeneration=null;submissionLock.release();}
function cancelIntakeOperation(){intakeGeneration+=1;activeIntakeGeneration=null;submissionLock.release();}
function clearDraft() { draft=null;token="";draftProvenance=null;try{sessionStorage.removeItem(ONBOARDING_RESUME_KEY);}catch{/* optional */} }
function persistOnboardingResume(){try{if(draft&&token&&draftProvenance)sessionStorage.setItem(ONBOARDING_RESUME_KEY,JSON.stringify({id:draft.id,token,provenance:draftProvenance}));}catch{/* optional */}}
function acceptDraft(body:Record<string,any>,provenance:DraftProvenance){if(!body.draft||typeof body.claimToken!=="string"||!body.claimToken)throw new Error("La réponse du serveur est invalide. Réessaie.");draft=body.draft as PublicDraft;token=body.claimToken;draftProvenance=provenance;persistOnboardingResume();}
function draftMatchesSource(source:CreationFlowState["source"]){return Boolean(draft&&token&&draftProvenance?.source===source);}
function validShopifyDraft(){const selectedId=shopifyCatalog.selectedId;return shopifyCatalog.status==="ready"&&Boolean(selectedId&&shopifyCatalog.products.some((product)=>product.id===selectedId)&&draftMatchesSource("shopify")&&draftProvenance?.shopifyProductId===selectedId);}
function resetArtifactsForSourceChange(nextSource:CreationFlowState["source"]){if(nextSource===state.source)return;cancelIntakeOperation();clearDraft();shopifyCatalog=emptyShopifyCatalog();error="";}

function esc(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!); }
function requestCopy(url: string) {
  if (url === "/api/pages") return { timeout:"La création de la page vierge prend trop de temps. Réessaie.", failure:"Impossible de créer la page vierge. Réessaie." };
  if (url.startsWith("/api/shopify/products")) return { timeout:"Le catalogue Shopify met trop de temps à répondre. Réessaie.", failure:"Impossible de charger le catalogue Shopify. Réessaie." };
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
async function restoreOnboardingResume(){try{const raw=sessionStorage.getItem(ONBOARDING_RESUME_KEY);if(!raw)return;const saved=JSON.parse(raw) as {id?:unknown;token?:unknown;provenance?:DraftProvenance};if(typeof saved.id!=="string"||typeof saved.token!=="string"||!saved.provenance)return;const body=await request(`/api/onboarding/${encodeURIComponent(saved.id)}`,{method:"GET",headers:{"x-weflo-claim-token":saved.token}});if(!body.draft)return;draft=body.draft as PublicDraft;token=saved.token;draftProvenance=saved.provenance;persistOnboardingResume();if(state.templateId&&state.step!=="build")state={...state,step:"strategy"};}catch{try{sessionStorage.removeItem(ONBOARDING_RESUME_KEY);}catch{/* optional */}}}
function persistState() { try { sessionStorage.setItem(CREATION_DRAFT_KEY, serializeCreationDraft(state)); } catch { /* Storage may be unavailable; URL state still works. */ } }
function workspaceHistoryState() { return { ...(history.state && typeof history.state === "object" ? history.state : {}), wefloCreationDraft:serializeCreationDraft(state) }; }
function replaceWorkspaceUrl() { history.replaceState(workspaceHistoryState(), "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt })); }
function pushWorkspaceUrl() { history.pushState(workspaceHistoryState(), "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt })); }
function commitState(next: CreationFlowState, shouldRender = true, historyMode: "push" | "replace" = "push") { state=next;persistState();if(historyMode==="push")pushWorkspaceUrl();else replaceWorkspaceUrl();if(shouldRender)render(); }
function render() {
  if (!root) return;
  if (state.step === "create-blank") root.innerHTML=renderBlankCreation();
  else if (state.step === "strategy" && draft) { root.innerHTML=renderStrategy(); queueMicrotask(()=>void loadWizardSuggestions()); }
  else if (state.step === "build" && draft) renderBuild();
  else root.innerHTML=renderCreateWorkspace({ workspaceName, state, missingFieldIds, busy:submissionLock.locked, errorMessage:error });
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
function renderShopifyPagination(){if(!shopifyCatalog.previousCursor&&!shopifyCatalog.nextCursor)return "";return `<nav class="shopify-pagination" aria-label="Pages du catalogue Shopify"><button type="button" data-shopify-previous${shopifyCatalog.previousCursor?"":" disabled"}>← Précédent</button><span data-shopify-page>Page ${shopifyCatalog.page}</span><button type="button" data-shopify-next${shopifyCatalog.nextCursor?"":" disabled"}>Suivant →</button></nav>`;}
function renderShopifyCatalog(){
  if(shopifyCatalog.status==="loading")return `<section class="shopify-catalog" data-shopify-catalog aria-live="polite"><h2>Choisis un produit Shopify</h2><p>Chargement du catalogue connecté…</p></section>`;
  if(shopifyCatalog.status==="unavailable")return `<section class="shopify-catalog" data-shopify-catalog><h2>Catalogue Shopify indisponible</h2><p class="create-error" role="alert">${esc(shopifyCatalog.message)}</p><div class="shopify-catalog-actions"><button type="button" data-shopify-load>Réessayer</button><a href="/boutique">Reconnecter Shopify</a></div></section>`;
  if(shopifyCatalog.status==="idle")return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2><p>Charge les produits actifs de la boutique connectée.</p><button type="button" data-shopify-load>Charger le catalogue</button></section>`;
  if(!shopifyCatalog.products.length)return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2><p role="status">Aucun produit actif n’est disponible dans le catalogue connecté.</p><div class="shopify-catalog-actions"><button type="button" data-shopify-load>Actualiser</button><a href="/boutique">Vérifier Shopify</a></div></section>`;
  const selected=shopifyCatalog.selectedId?`<p class="shopify-product-selected" role="status">${esc(shopifyCatalog.selectedTitle)} est prêt à être utilisé.</p>`:"";
  const message=shopifyCatalog.message?`<p class="create-error" role="alert">${esc(shopifyCatalog.message)}</p>`:"";
  return `<section class="shopify-catalog" data-shopify-catalog><h2>Choisis un produit Shopify</h2>${selected}${message}<div class="shopify-product-list">${shopifyCatalog.products.map((product)=>`<button type="button" data-shopify-product="${esc(product.id)}" aria-pressed="${product.id===shopifyCatalog.selectedId}">${product.image?`<img src="${esc(product.image)}" alt="">`:`<span aria-hidden="true">▣</span>`}<strong>${esc(product.title)}</strong><small>${esc(product.vendor)} · ${esc(shopifyPrice(product))}</small></button>`).join("")}</div>${renderShopifyPagination()}<button type="button" class="shopify-refresh" data-shopify-load>Actualiser le catalogue</button></section>`;
}
function wizardAnswer(stepId:WizardStepId){return draft?.wizard.answers.find((answer)=>answer.stepId===stepId);}
function renderStrategy() {
  const current=draft!.wizard.currentStep;
  const copy=WIZARD_COPY[current];
  const choices=draft!.wizard.suggestions[current]??[];
  const saved=wizardAnswer(current);
  const selected=new Set(saved?.selectedSuggestionIds??[]);
  const review=current==="review";
  const summary=draft!.wizard.answers.filter((answer)=>answer.stepId!=="review").map((answer)=>`<li><strong>${esc(WIZARD_COPY[answer.stepId].title)}</strong><span>${esc(answer.customText||answer.selectedSuggestionIds.map((id)=>draft!.wizard.suggestions[answer.stepId]?.find((item)=>item.id===id)?.title||"").filter(Boolean).join(" · "))}</span></li>`).join("");
  const loading=wizardLoadingStep===current;
  const ordered=copy.multiple&&selected.size?`<ol class="wizard-order">${[...selected].map((id,index)=>`<li>${esc(choices.find((item)=>item.id===id)?.title??id)}<span><button type="button" data-wizard-move="${esc(id)}:-1" ${index===0?"disabled":""}>↑</button><button type="button" data-wizard-move="${esc(id)}:1" ${index===selected.size-1?"disabled":""}>↓</button></span></li>`).join("")}</ol>`:"";
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li>✓ <span>Format</span></li><li>✓ <span>Informations</span></li><li class="active">3 <span>Assistant IA</span></li><li>4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside><main>${renderStrategyBackControl()}<section class="wizard" data-wizard-step="${current}"><div class="wizard-progress" aria-label="Étape ${Object.keys(WIZARD_COPY).indexOf(current)+1} sur 9"><i style="width:${((Object.keys(WIZARD_COPY).indexOf(current)+1)/9)*100}%"></i></div><div class="create-heading"><p>Étape ${Object.keys(WIZARD_COPY).indexOf(current)+1} sur 9</p><h1>${esc(copy.title)}</h1><span>${esc(copy.prompt)}</span></div>${review?`<ul class="wizard-summary">${summary||"<li>Ajoutez vos choix avant de construire.</li>"}</ul>`:`<div class="wizard-grid">${choices.map((item)=>`<button type="button" class="wizard-card" data-wizard-select="${esc(item.id)}" aria-pressed="${selected.has(item.id)}"><strong>${esc(item.title)}</strong><small>${esc(item.explanation)}</small><em>${item.tags.map(esc).join(" · ")}</em></button>`).join("")||`<p class="wizard-loading">${loading?"Suggestions en cours…":"Aucune suggestion disponible."}</p>`}</div>${ordered}<label class="wizard-custom">Ajouter ma réponse<textarea data-wizard-custom placeholder="Écris une réponse personnalisée…">${esc(saved?.customText??"")}</textarea></label><button type="button" class="wizard-regenerate" data-wizard-regenerate ${loading?"disabled":""}>${loading?"Génération…":"Régénérer les suggestions"}</button>`}${error?`<p class="create-error" role="alert">${esc(error)}</p>`:""}<div class="wizard-actions"><button type="button" class="wizard-back" data-wizard-back ${current==="source"?"disabled":""}>Retour</button><button type="button" data-wizard-continue ${busy||(!review&&!selected.size&&!saved?.customText.trim())?"disabled":""}>${review?"Construire le Blueprint":"Continuer"}</button></div></section></main></div>`;
}
async function loadWizardSuggestions(regenerate=false){if(!draft)return;const stepId=draft.wizard.currentStep;if(stepId==="review")return;if(!regenerate&&(wizardLoadingStep===stepId||draft.wizard.suggestions[stepId]?.length))return;wizardController?.abort();wizardController=new AbortController();wizardLoadingStep=stepId;error="";render();try{const body=await request(`/api/onboarding/${draft.id}/suggestions`,{method:"POST",headers:{"content-type":"application/json","x-weflo-claim-token":token},body:JSON.stringify({stepId}),signal:wizardController.signal});if(!draft||draft.wizard.currentStep!==stepId)return;draft=body.draft as PublicDraft;persistOnboardingResume();}catch(reason){if((reason as Error)?.name!=="AbortError")error=reason instanceof Error?reason.message:"Les suggestions ne sont pas disponibles. Réessaie.";}finally{if(wizardLoadingStep===stepId){wizardLoadingStep=null;render();}}}
async function saveWizardAnswer(){if(!draft)return;const stepId=draft.wizard.currentStep;if(stepId==="review"){await build();return;}const textarea=root?.querySelector<HTMLTextAreaElement>("[data-wizard-custom]");const selected=wizardAnswer(stepId)?.selectedSuggestionIds??[];busy=true;render();try{const body=await request(`/api/onboarding/${draft.id}/wizard`,{method:"PATCH",headers:{"content-type":"application/json","x-weflo-claim-token":token},body:JSON.stringify({stepId,answer:{selectedSuggestionIds:selected,customText:textarea?.value??""}})});draft=body.draft as PublicDraft;persistOnboardingResume();error="";}finally{busy=false;render();if(draft&&draft.wizard.currentStep!=="review")void loadWizardSuggestions();}}
function renderBuild() { if (!root || !draft) return; const formatTitle = creationFormats.find((item) => item.id === state.format)?.title ?? "Boutique"; root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>✓ <span>Format</span></li><li>✓ <span>Informations</span></li><li>✓ <span>Stratégie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside>${renderBuildExperience({ brandName:draft.brandName || "Ta marque", formatTitle, stages:draft.stages, activeIndex:buildStageIndex, productImage:draft.product?.images[0] })}</div>`; }
async function syncDraft(includeStrategy = false) { if (!draftMatchesSource(state.source)||!draft) throw new Error("La source de cette analyse ne correspond plus à la création. Relance l’importation."); const strategy = includeStrategy ? { personas:draft.personas, angles:draft.angles } : undefined; await synchronizeOnboardingDraft({ draftId:draft.id, claimToken:token, state, strategy, request }); }
async function importLink(value: string,generation:number) { const body = await request("/api/onboarding/import", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ sourceUrl:value, language:"fr" }) });if(!currentIntakeOperation(generation,"link"))return false;acceptDraft(body,{source:"link",shopifyProductId:null});await syncDraft();return currentIntakeOperation(generation,"link"); }
async function importImage(file: File,generation:number) { if (file.size > 450_000) throw new Error("Choisis une image de moins de 450 Ko."); const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=()=>reject(new Error("Impossible de lire l’image."));reader.readAsDataURL(file); });if(!currentIntakeOperation(generation,"image"))return false;const body = await request("/api/onboarding/import-image", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ imageDataUrl:data, fileName:file.name, language:"fr" }) });if(!currentIntakeOperation(generation,"image"))return false;acceptDraft(body,{source:"image",shopifyProductId:null});await syncDraft();return currentIntakeOperation(generation,"image"); }
async function startFromAnswers(generation:number) { const body = await request("/api/onboarding/start", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ creationFormat:state.format, templateId:state.templateId, answers:state.answers, prompt:state.prompt, language:"fr" }) });if(!currentIntakeOperation(generation,state.source))return false;acceptDraft(body,{source:state.source,shopifyProductId:null});return true; }
async function loadShopifyProducts(cursor:string|null=null,page=1){const generation=beginIntakeOperation();if(generation===null)return;const previous={...shopifyCatalog};shopifyCatalog={...shopifyCatalog,status:"loading",message:""};error="";render();try{const url=cursor?`/api/shopify/products?cursor=${encodeURIComponent(cursor)}`:"/api/shopify/products";const body=await request(url,{method:"GET"});if(!currentIntakeOperation(generation,"shopify"))return;const products=Array.isArray(body.products)?body.products:[];const selectedStillExists=Boolean(previous.selectedId&&products.some((product:ShopifyCatalogProduct)=>product.id===previous.selectedId));if(!selectedStillExists&&draftProvenance?.source==="shopify")clearDraft();shopifyCatalog={status:"ready",products,message:"",selectedId:selectedStillExists?previous.selectedId:null,selectedTitle:selectedStillExists?previous.selectedTitle:"",nextCursor:typeof body.nextCursor==="string"&&body.nextCursor?body.nextCursor:null,previousCursor:typeof body.previousCursor==="string"&&body.previousCursor?body.previousCursor:null,page};finishIntakeOperation(generation);render();}catch(reason){if(!currentIntakeOperation(generation,"shopify"))return;if(draftProvenance?.source==="shopify")clearDraft();shopifyCatalog={status:"unavailable",products:[],selectedId:null,selectedTitle:"",message:reason instanceof Error?reason.message:"Impossible de charger le catalogue Shopify. Réessaie.",nextCursor:null,previousCursor:null,page:1};finishIntakeOperation(generation);render();}}
async function importShopifyProduct(productId:string){const product=shopifyCatalog.products.find((item)=>item.id===productId);if(!product)return;const generation=beginIntakeOperation();if(generation===null)return;const form=root?.querySelector<HTMLFormElement>("[data-source-form]");if(form){const data=new FormData(form);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"")});persistState();replaceWorkspaceUrl();}clearDraft();error="";shopifyCatalog={...shopifyCatalog,status:"loading",selectedId:productId,selectedTitle:product.title,message:""};render();try{const body=await request("/api/onboarding/import-shopify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId,language:"fr"})});if(!currentIntakeOperation(generation,"shopify"))return;acceptDraft(body,{source:"shopify",shopifyProductId:productId});shopifyCatalog={...shopifyCatalog,status:"ready",selectedId:productId,selectedTitle:product.title,message:""};finishIntakeOperation(generation);render();}catch(reason){if(!currentIntakeOperation(generation,"shopify"))return;clearDraft();shopifyCatalog={...shopifyCatalog,status:"unavailable",products:[],selectedId:null,selectedTitle:"",nextCursor:null,previousCursor:null,page:1,message:reason instanceof Error?reason.message:"Impossible d’importer ce produit Shopify. Réessaie."};finishIntakeOperation(generation);render();}}
async function createBlankPage(){if(busy)return;busy=true;error="";render();try{const page=await request("/api/pages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"blank",name:"Page vierge",creationFormat:"blank",templateId:null,answers:{}})});location.assign(`/editeur?page=${page.id}`);}catch(reason){busy=false;error=reason instanceof Error?reason.message:"Impossible de créer la page vierge. Réessaie.";render();}}
async function build() { if (!draft) return; state=transitionCreationFlow(state,{type:"START_BUILD"});persistState();replaceWorkspaceUrl();busy=true;error="";buildStageIndex=0;renderBuild();let timer:ReturnType<typeof setInterval>|undefined;try{await syncDraft(true);buildStageIndex=1;renderBuild();timer=setInterval(()=>{if(!draft)return;const ceiling=Math.max(1,draft.stages.length-2);if(buildStageIndex<ceiling){buildStageIndex+=1;renderBuild();}},650);await request(`/api/onboarding/${draft.id}/build`,{method:"POST",headers:{"x-weflo-claim-token":token}});if(timer)clearInterval(timer);timer=undefined;while(buildStageIndex<draft.stages.length-1){buildStageIndex+=1;renderBuild();await new Promise((resolve)=>setTimeout(resolve,90));}const claimed=await request(`/api/onboarding/${draft.id}/claim`,{method:"POST",headers:{"x-weflo-claim-token":token}});await new Promise((resolve)=>setTimeout(resolve,450));location.assign(`/editeur?page=${claimed.pageId}`);}finally{if(timer)clearInterval(timer);} }
function bind() {
  root?.querySelectorAll<HTMLElement>("[data-create-format]").forEach((button)=>button.addEventListener("click",()=>{cancelIntakeOperation();missingFieldIds=[];clearDraft();shopifyCatalog=emptyShopifyCatalog();commitState(transitionCreationFlow(state,{type:"SELECT_FORMAT",format:button.dataset.createFormat as CreationFlowState["format"] & string}));if(state.step==="create-blank")void createBlankPage();}));
  root?.querySelector("[data-back-format]")?.addEventListener("click",()=>{cancelIntakeOperation();missingFieldIds=[];clearDraft();shopifyCatalog=emptyShopifyCatalog();commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelector("[data-back-template]")?.addEventListener("click",()=>{cancelIntakeOperation();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLButtonElement>("button[data-create-source]").forEach((button)=>button.addEventListener("click",()=>{const source=button.dataset.createSource as CreationFlowState["source"];resetArtifactsForSourceChange(source);commitState(transitionCreationFlow(state,{type:"SELECT_SOURCE",source}));if(source==="shopify")void loadShopifyProducts();else root?.querySelector<HTMLTextAreaElement>('[name="prompt"]')?.focus();}));
  root?.querySelector("[data-shopify-load]")?.addEventListener("click",()=>void loadShopifyProducts());
  root?.querySelector("[data-shopify-next]")?.addEventListener("click",()=>{if(shopifyCatalog.nextCursor)void loadShopifyProducts(shopifyCatalog.nextCursor,shopifyCatalog.page+1);});
  root?.querySelector("[data-shopify-previous]")?.addEventListener("click",()=>{if(shopifyCatalog.previousCursor)void loadShopifyProducts(shopifyCatalog.previousCursor,Math.max(1,shopifyCatalog.page-1));});
  root?.querySelectorAll<HTMLElement>("[data-shopify-product]").forEach((button)=>button.addEventListener("click",()=>{const id=button.dataset.shopifyProduct;if(id)void importShopifyProduct(id);}));
  root?.querySelector("[data-blank-retry]")?.addEventListener("click",()=>void createBlankPage());
  root?.querySelector("[data-image-retry]")?.addEventListener("click",()=>root?.querySelector<HTMLInputElement>("[data-create-image]")?.click());
  root?.querySelector<HTMLInputElement>("[data-create-image]")?.addEventListener("change",async(event)=>{
    const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;
    const form=root?.querySelector<HTMLFormElement>("[data-source-form]");
    if(form){const data=new FormData(form);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});}
    resetArtifactsForSourceChange("image");state=transitionCreationFlow(state,{type:"SELECT_SOURCE",source:"image"});persistState();replaceWorkspaceUrl();
    missingFieldIds=state.format?validateFormatIntake(flowForFormat(state.format),state.answers):[];
    const generation=beginIntakeOperation();if(generation===null)return;error="";render();
    try{const completed=await importImage(file,generation);if(!completed)return;finishIntakeOperation(generation);if(!missingFieldIds.length)commitState(transitionCreationFlow(state,{type:"CONTINUE"}));else render();}catch(reason){if(!currentIntakeOperation(generation,"image"))return;finishIntakeOperation(generation);error=reason instanceof Error?reason.message:"Impossible d’analyser cette image. Réessaie.";render();}
  });
  const intakeForm=root?.querySelector<HTMLFormElement>("[data-source-form]");
  intakeForm?.addEventListener("input",()=>{const data=new FormData(intakeForm);state=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"")});persistState();replaceWorkspaceUrl();});
  intakeForm?.addEventListener("submit",async(event)=>{
    event.preventDefault();const generation=beginIntakeOperation();if(generation===null)return;const data=new FormData(event.currentTarget as HTMLFormElement);
    let updated=transitionCreationFlow(state,{type:"UPDATE_INTAKE",answers:answersFromFormData(data),prompt:String(data.get("prompt")??"").trim()});
    missingFieldIds=updated.format?validateFormatIntake(flowForFormat(updated.format),updated.answers):[];
    commitState(updated,false,"replace");
    if(missingFieldIds.length){finishIntakeOperation(generation);render();return;}
    const firstAnswer=Object.values(updated.answers).find((value)=>value.trim())??"";
    if(!updated.prompt&&!firstAnswer){finishIntakeOperation(generation);render();return;}
    if(!updated.prompt){updated=transitionCreationFlow(updated,{type:"UPDATE_INTAKE",answers:updated.answers,prompt:firstAnswer});commitState(updated,false,"replace");}
    const action=submissionActionForState(updated);
    if(action==="product-required"){finishIntakeOperation(generation);error="Choisis un lien, une image ou un produit Shopify avant de continuer.";render();return;}
    if(action==="image"&&!draftMatchesSource("image")){finishIntakeOperation(generation);error="Ajoute une image avant de continuer.";render();return;}
    if(action==="shopify"&&!validShopifyDraft()){finishIntakeOperation(generation);shopifyCatalog={...shopifyCatalog,message:"Choisis un produit du catalogue Shopify avant de continuer."};render();return;}
    error="";
    render();
    try{let completed=true;if(action==="link")completed=await importLink(updated.prompt,generation);if(action==="image"||action==="shopify"){await syncDraft();completed=currentIntakeOperation(generation,action);}if(action==="simple")completed=await startFromAnswers(generation);if(!completed)return;finishIntakeOperation(generation);commitState(transitionCreationFlow(updated,{type:"CONTINUE"}));}catch(reason){if(!currentIntakeOperation(generation))return;finishIntakeOperation(generation);if(state.step==="strategy"&&!draft)state=transitionCreationFlow(state,{type:"BACK"});persistState();replaceWorkspaceUrl();error=reason instanceof Error?reason.message:"Cette étape n’a pas abouti. Réessaie.";render();}
  });
  root?.querySelectorAll<HTMLAnchorElement>("[data-template-select]").forEach((link)=>link.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const id=link.dataset.templateSelect;if(id){cancelIntakeOperation();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));}}));
  const dialog=root?.querySelector<HTMLDialogElement>("[data-template-dialog]");
  root?.querySelectorAll<HTMLElement>("[data-template-device]").forEach((button)=>button.addEventListener("click",()=>{const preview=button.closest<HTMLElement>("[data-template-preview]");if(!preview)return;const device=button.dataset.templateDevice;if(device!=="desktop"&&device!=="mobile")return;preview.dataset.previewDevice=device;preview.querySelectorAll<HTMLElement>("[data-template-device]").forEach((item)=>item.setAttribute("aria-pressed",String(item===button)));}));
  const setDialogDevice=(device:"desktop"|"mobile")=>{if(!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const stage=dialog.querySelector<HTMLElement>("[data-template-dialog-stage]");if(!image||!stage)return;const source=image.dataset[device];if(!source)return;image.src=source;stage.dataset.previewDevice=device;dialog.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.templateDialogDevice===device)));};
  dialog?.querySelectorAll<HTMLElement>("[data-template-dialog-device]").forEach((button)=>button.addEventListener("click",()=>{const device=button.dataset.templateDialogDevice;if(device==="desktop"||device==="mobile")setDialogDevice(device);}));
  let dialogTrigger: HTMLElement | null = null;
  root?.querySelectorAll<HTMLElement>("[data-template-open]").forEach((button)=>button.addEventListener("click",()=>{const id=button.dataset.templateOpen;const card=id?root.querySelector<HTMLElement>(`[data-template-card="${id}"]`):null;if(!id||!card||!dialog)return;const image=dialog.querySelector<HTMLImageElement>("[data-template-dialog-image]");const desktop=card.querySelector<HTMLImageElement>('[data-preview-image="desktop"]');const mobile=card.querySelector<HTMLImageElement>('[data-preview-image="mobile"]');const name=card.querySelector("h2")?.textContent??"Modèle";const description=card.querySelector("p")?.textContent??"";if(image&&desktop&&mobile){image.dataset.desktop=desktop.src;image.dataset.mobile=mobile.src;image.alt=desktop.alt;setDialogDevice("desktop");}dialog.querySelector("[data-template-dialog-title]")!.textContent=name;dialog.querySelector("[data-template-dialog-description]")!.textContent=description;const select=dialog.querySelector<HTMLAnchorElement>("[data-template-dialog-select]");if(select){select.href=creationWorkspaceUrl(state.format,id,{source:state.source,prompt:state.prompt});select.dataset.templateId=id;}dialogTrigger=button;dialog.showModal();}));
  dialog?.addEventListener("close",()=>dialogTrigger?.focus());
  dialog?.querySelector<HTMLAnchorElement>("[data-template-dialog-select]")?.addEventListener("click",(event)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const id=(event.currentTarget as HTMLAnchorElement).dataset.templateId;if(!id)return;event.preventDefault();dialog.close();cancelIntakeOperation();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"SELECT_TEMPLATE",templateId:id}));});
  root?.querySelector("[data-back-strategy]")?.addEventListener("click",()=>{cancelIntakeOperation();missingFieldIds=[];commitState(transitionCreationFlow(state,{type:"BACK"}));});
  root?.querySelectorAll<HTMLElement>("[data-wizard-select]").forEach((button)=>button.addEventListener("click",()=>{if(!draft)return;const stepId=draft.wizard.currentStep;const id=button.dataset.wizardSelect??"";const selected=new Set(wizardAnswer(stepId)?.selectedSuggestionIds??[]);if(selected.has(id))selected.delete(id);else{if(!WIZARD_COPY[stepId].multiple)selected.clear();selected.add(id);}const existing=wizardAnswer(stepId);draft.wizard.answers=[...draft.wizard.answers.filter((answer)=>answer.stepId!==stepId),{stepId,selectedSuggestionIds:[...selected],customText:existing?.customText??"",acceptedAt:existing?.acceptedAt??new Date().toISOString()}];render();}));
  root?.querySelectorAll<HTMLElement>("[data-wizard-move]").forEach((button)=>button.addEventListener("click",()=>{if(!draft)return;const stepId=draft.wizard.currentStep;const [id,offsetRaw]=(button.dataset.wizardMove??"").split(":");const selected=[...(wizardAnswer(stepId)?.selectedSuggestionIds??[])];const index=selected.indexOf(id);const target=index+Number(offsetRaw);if(index<0||target<0||target>=selected.length)return;[selected[index],selected[target]]=[selected[target],selected[index]];const existing=wizardAnswer(stepId);draft.wizard.answers=[...draft.wizard.answers.filter((answer)=>answer.stepId!==stepId),{stepId,selectedSuggestionIds:selected,customText:existing?.customText??"",acceptedAt:existing?.acceptedAt??new Date().toISOString()}];render();}));
  root?.querySelector("[data-wizard-regenerate]")?.addEventListener("click",()=>void loadWizardSuggestions(true));
  root?.querySelector<HTMLTextAreaElement>("[data-wizard-custom]")?.addEventListener("input",(event)=>{const value=(event.currentTarget as HTMLTextAreaElement).value.trim();const stepId=draft?.wizard.currentStep;const selected=stepId?wizardAnswer(stepId)?.selectedSuggestionIds.length??0:0;const button=root?.querySelector<HTMLButtonElement>("[data-wizard-continue]");if(button)button.disabled=!value&&!selected;});
  root?.querySelector("[data-wizard-back]")?.addEventListener("click",async()=>{if(!draft)return;const previous=previousWizardStep(draft.wizard.currentStep);if(!previous)return;const body=await request(`/api/onboarding/${draft.id}/wizard`,{method:"PATCH",headers:{"content-type":"application/json","x-weflo-claim-token":token},body:JSON.stringify({currentStep:previous})});draft=body.draft as PublicDraft;persistOnboardingResume();render();});
  root?.querySelector("[data-wizard-continue]")?.addEventListener("click",()=>void saveWizardAnswer().catch((reason)=>{busy=false;error=reason instanceof Error?reason.message:"Impossible d’enregistrer cette réponse.";render();}));
}
window.addEventListener("popstate",(event)=>{cancelIntakeOperation();const url=new URL(location.href);const historyDraft=event.state&&typeof event.state.wefloCreationDraft==="string"?restoreCreationDraft(event.state.wefloCreationDraft):null;const next=historyDraft??mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);resetArtifactsForSourceChange(next.source);state=next;persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")void createBlankPage();else render();});
void (async()=>{const me=await guardSession();if(!me)return;workspaceName=me.workspace.name;const url=new URL(location.href);state=mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url);await restoreOnboardingResume();persistState();replaceWorkspaceUrl();if(creationStartupAction(state)==="create-blank")void createBlankPage();else render();})();
