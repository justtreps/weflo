import { creationFormats, renderCreateWorkspace } from "../create/workspace";
import { isCreationFormat, type CreationFormatId } from "../onboarding/creation-recipe";
import type { OnboardingDraft } from "../onboarding/types";
import { guardSession } from "./session-guard";
import { readApiJson } from "./onboarding-request";
import "./creer.css";

type PublicDraft = Omit<OnboardingDraft, "claimTokenHash">;
const root = document.querySelector<HTMLElement>("#create-app");
const params = new URLSearchParams(location.search);
let format: CreationFormatId | null = isCreationFormat(params.get("format")) ? params.get("format") as CreationFormatId : null;
let source = params.get("source");
let prompt = params.get("prompt") ?? "";
let draft: PublicDraft | null = null;
let token = "";
let error = "";
let busy = false;
let workspaceName = "Ton espace";

function esc(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!); }
async function request(url: string, init: RequestInit) { const response = await fetch(url, init); const body = await readApiJson(response); if (!response.ok) throw new Error(body.message || "Cette étape n’a pas abouti."); return body; }
function render() { if (!root) return; root.innerHTML = draft ? renderStrategy() : renderCreateWorkspace({ workspaceName, selectedFormat: format, source, prompt }); bind(); }
function renderStrategy() {
  const choices = [...draft!.personas.map((item) => ({ ...item, kind: "persona" })), ...draft!.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li>✓ <span>Format</span></li><li>✓ <span>Produit</span></li><li class="active">3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(workspaceName)}</small></aside><main><div class="create-heading"><p>${esc(creationFormats.find((item) => item.id === format)?.title ?? "Création")}</p><h1>À qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l’offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc(item.id)}" aria-pressed="${item.selected}"><strong>${esc(item.icon)} ${esc(item.title)}</strong><small>${esc(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction…" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() { if (!root || !draft) return; root.innerHTML = `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>✓ <span>Format</span></li><li>✓ <span>Produit</span></li><li>✓ <span>Stratégie</span></li><li class="active">4 <span>Construction</span></li></ol></aside><main class="build-screen"><div class="build-card"><p>Canardo travaille</p><h1>${esc(draft.brandName || "Ta page")} prend forme.</h1><ul>${draft.stages.map((stage, index) => `<li class="${index < 6 ? "done" : index === 6 ? "active" : ""}">${esc(stage.label)}</li>`).join("")}</ul></div></main></div>`; }
async function importLink(value: string) { const body = await request("/api/onboarding/import", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ sourceUrl:value, language:"fr" }) }); draft = body.draft; token = body.claimToken; await request(`/api/onboarding/${draft!.id}`, { method:"PATCH", headers:{"content-type":"application/json","x-weflo-claim-token":token}, body:JSON.stringify({ creationFormat:format ?? "store", language:"fr" }) }); }
async function importImage(file: File) { if (file.size > 450_000) throw new Error("Choisis une image de moins de 450 Ko."); const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=()=>reject(new Error("Impossible de lire l’image.")); reader.readAsDataURL(file); }); const body = await request("/api/onboarding/import-image", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ imageDataUrl:data, fileName:file.name, language:"fr" }) }); draft=body.draft; token=body.claimToken; await request(`/api/onboarding/${draft!.id}`, { method:"PATCH", headers:{"content-type":"application/json","x-weflo-claim-token":token}, body:JSON.stringify({ creationFormat:format ?? "store", language:"fr" }) }); }
async function createSimple() { const type = format === "blog" ? "write" : format === "blank" ? "blank" : "sell"; const name = prompt.trim() || creationFormats.find((item) => item.id === format)?.title || "Nouvelle page"; const page = await request("/api/pages", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ type, name }) }); location.assign(`/editeur?page=${page.id}`); }
async function build() { if (!draft) return; busy=true; error=""; renderBuild(); await request(`/api/onboarding/${draft.id}`, { method:"PATCH", headers:{"content-type":"application/json","x-weflo-claim-token":token}, body:JSON.stringify({ creationFormat:format ?? "store", personas:draft.personas, angles:draft.angles, language:"fr" }) }); await request(`/api/onboarding/${draft.id}/build`, { method:"POST", headers:{"x-weflo-claim-token":token} }); const claimed = await request(`/api/onboarding/${draft.id}/claim`, { method:"POST", headers:{"x-weflo-claim-token":token} }); location.assign(`/editeur?page=${claimed.pageId}`); }
function bind() {
  root?.querySelectorAll<HTMLElement>("[data-create-format]").forEach((button)=>button.addEventListener("click",()=>{ format=button.dataset.createFormat as CreationFormatId; history.replaceState({},"",`/creer?format=${format}`); render(); }));
  root?.querySelector("[data-back-format]")?.addEventListener("click",()=>{format=null;draft=null;render();});
  root?.querySelectorAll<HTMLElement>("[data-create-source]").forEach((button)=>button.addEventListener("click",()=>{source=button.dataset.createSource ?? null; root.querySelector("textarea")?.focus();}));
  root?.querySelector<HTMLInputElement>("[data-create-image]")?.addEventListener("change",async(event)=>{const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file)return;try{busy=true;await importImage(file);render();}catch(reason){error=reason instanceof Error?reason.message:"Import impossible";render();}finally{busy=false;}});
  root?.querySelector<HTMLFormElement>("[data-source-form]")?.addEventListener("submit",async(event)=>{event.preventDefault();prompt=root.querySelector<HTMLTextAreaElement>("textarea")?.value.trim()??"";if(!prompt)return;try{busy=true;if(source==="link"||/^https?:\/\//.test(prompt))await importLink(prompt);else await createSimple();render();}catch(reason){error=reason instanceof Error?reason.message:"Import impossible";render();}finally{busy=false;}});
  root?.querySelectorAll<HTMLElement>("[data-strategy]").forEach((button)=>button.addEventListener("click",()=>{const[kind,id]=(button.dataset.strategy??"").split(":");const list=kind==="persona"?draft?.personas:draft?.angles;const item=list?.find((entry)=>entry.id===id);if(item)item.selected=!item.selected;render();}));
  root?.querySelector("[data-build]")?.addEventListener("click",()=>void build().catch((reason)=>{busy=false;error=reason instanceof Error?reason.message:"Construction impossible";render();}));
}
void (async()=>{const me=await guardSession();if(!me)return;workspaceName=me.workspace.name;if(format==="blank")await createSimple();else render();})();
