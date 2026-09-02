import "./start.css";
import "./start-brands.css";
import type { OnboardingDraft } from "../onboarding/types";

type PublicDraft = Omit<OnboardingDraft, "claimTokenHash">;
type SavedState = { draft: PublicDraft; claimToken: string; step: number };

const root = document.querySelector<HTMLElement>("#onboarding");
const storageKey = "weflo:onboarding";
const models = [
  { id: "proteo", name: "Proteo", bg: "#f7f7f3", ink: "#121210", accent: "#2f6b55", soft: "#d9e7d5" },
  { id: "amaro", name: "Amaro", bg: "#fff5ec", ink: "#2a100a", accent: "#a63212", soft: "#e8b79f" },
  { id: "kleen", name: "Kleen", bg: "#f7f3ef", ink: "#171513", accent: "#b69b8d", soft: "#dfd1c8" },
  { id: "apothec", name: "Apothec", bg: "#f7f6ef", ink: "#102016", accent: "#456a2e", soft: "#d5ddbb" },
  { id: "bloom", name: "Bloom", bg: "#fff4f4", ink: "#271015", accent: "#ca5266", soft: "#f2c7cf" },
];

let state: SavedState | null = load();
let step = state?.step ?? 0;
let busy = false;
let error = "";
let authOpen = false;
let signup = true;
const sources = [
  ["amazon", "Amazon", "/assets/brands/amazon.svg"],
  ["aliexpress", "AliExpress", "/assets/brands/aliexpress.svg"],
  ["shopify", "Shopify", "/assets/brands/shopify.svg"],
  ["etsy", "Etsy", "/assets/brands/etsy.svg"],
  ["temu", "Temu", "/assets/brands/temu.svg"],
] as const;

function load(): SavedState | null {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? "null") as SavedState | null; } catch { return null; }
}
function save() { if (state) { state.step = step; localStorage.setItem(storageKey, JSON.stringify(state)); } }
function e(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char); }
function current(): PublicDraft { if (!state) throw new Error("No onboarding draft"); return state.draft; }
function productPill(): string {
  const product = current().product;
  if (!product) return "";
  return `<div class="product-pill">${product.images[0] ? `<img src="${e(product.images[0])}" alt="">` : ""}<div><strong>${e(product.title)}</strong><br><small>${e(product.vendor || new URL(product.sourceUrl).hostname)}</small></div></div>`;
}
function shell(content: string, narrow = false): string {
  const progress = Math.round((Math.min(step, 7) / 7) * 100);
  return `<div class="ob"><header class="ob__top"><a class="ob__logo" href="/">weflo<i>.</i></a><div class="ob__progress" aria-label="Progression de la création"><span style="width:${progress}%"></span></div><a class="ob__exit" href="/">Enregistrer et quitter</a></header><section class="ob__screen${narrow ? " ob__screen--narrow" : ""}">${content}</section></div>${authOpen ? authModal() : ""}`;
}
function actions(label = "Continuer", back = true): string { return `<div class="ob__actions">${back ? '<button class="secondary" data-action="back">← Retour</button>' : ""}<button class="primary" data-action="next">${e(label)}</button></div>`; }

function sourceScreen(): string {
  return shell(`<h1 class="ob__title">Quel produit veux-tu vendre ?</h1><p class="ob__lead">Colle le lien d’un fournisseur, d’une boutique ou d’un concurrent.</p><div class="ob__sources">${sources.map(([id, name, logo]) => `<span class="source source--${id}" title="${name}"><img src="${logo}" alt="${name}"></span>`).join("")}<span class="source source--other" title="Autre site" aria-label="Autre site">↗</span></div><form class="url-form" id="url-form"><div class="url-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input name="url" type="url" required autocomplete="url" placeholder="https://www.aliexpress.com/item/…" aria-label="Lien du produit"><button type="submit" ${busy ? "disabled" : ""}>${busy ? "Importation…" : "Continuer"}</button></div>${error ? `<p class="field-error">${e(error)}</p>` : ""}<p class="ob__hint">Amazon, AliExpress, Shopify, Etsy, Temu et la plupart des pages produit publiques sont compatibles.</p></form>`, true);
}

function languageScreen(): string {
  const languages = [["en","US","Anglais"],["fr","FR","Français"],["de","DE","Allemand"],["es","ES","Espagnol"],["it","IT","Italien"],["pt","PT","Portugais"],["nl","NL","Néerlandais"],["pl","PL","Polonais"]];
  return shell(`${productPill()}<h1 class="ob__title">Quelle langue parlent tes clients ?</h1><p class="ob__lead">Tous les textes de la boutique seront rédigés dans cette langue. L’interface Weflo reste en français.</p><div class="language-grid">${languages.map(([value,code,label]) => `<button class="choice" data-language="${value}" aria-pressed="${current().language === value}"><strong>${code} &nbsp;${label}</strong></button>`).join("")}</div>${actions()}`, true);
}

function styleScreen(): string {
  return shell(`${productPill()}<h1 class="ob__title">À quoi doit ressembler ta boutique ?</h1><p class="ob__lead">Choisis une direction visuelle. Chaque couleur, police et forme restera modifiable.</p><div class="style-row"><button class="style-card" data-model="proteo" aria-pressed="${current().modelId === "proteo"}"><div class="style-preview" style="--bg:#1b1a18;--ink:#fff;--accent:#ffd13b;--soft:#37342f"><b>✦ Laisser l’IA décider</b><i></i><span></span><em></em></div><strong>Une identité unique</strong></button>${models.map((model) => `<button class="style-card" data-model="${model.id}" aria-pressed="${current().modelId === model.id}"><div class="style-preview" style="--bg:${model.bg};--ink:${model.ink};--accent:${model.accent};--soft:${model.soft}"><b>${e(current().brandName || current().product?.title)}</b><i></i><span></span><span></span><em></em></div><strong>${model.name}</strong></button>`).join("")}</div>${actions()}`);
}

function brandScreen(): string {
  return shell(`${productPill()}<h1 class="ob__title">Comment veux-tu appeler ta boutique ?</h1><p class="ob__lead">Canardo a imaginé ces noms à partir de ton produit. Tu pourras le modifier plus tard.</p><input class="brand-input" id="brand-name" maxlength="60" value="${e(current().brandName)}" aria-label="Nom de la marque"><div class="brand-chips">${current().brandNames.map((name) => `<button class="chip${name === current().brandName ? " active" : ""}" data-brand="${e(name)}">${e(name)}</button>`).join("")}</div>${actions()}`, true);
}

function choiceScreen(kind: "personas" | "angles"): string {
  const persona = kind === "personas";
  const entries = current()[kind];
  return shell(`<h1 class="ob__title">${persona ? "À qui s’adresse ce produit ?" : "Quelles sont les principales raisons d’acheter ?"}</h1><p class="ob__lead">Choisis une ou plusieurs réponses : la première guidera les titres, le visuel principal et l’argumentaire.</p><div class="choice-grid">${entries.map((entry) => `<button class="choice" data-choice="${kind}:${e(entry.id)}" aria-pressed="${entry.selected}"><strong>${e(entry.title)} <span>${e(entry.icon)}</span></strong><small>${e("insight" in entry ? entry.insight : entry.description)}</small><span class="choice__tags">${entry.tags.map((tag) => `<span>${e(tag)}</span>`).join("")}</span></button>`).join("")}</div>${actions(persona ? "Continuer" : "Construire ma boutique")}`);
}

function buildingScreen(active = 0): string {
  const stages = current().stages;
  return shell(`<div class="analysis-card"><div class="analysis-head"><strong>${e(current().brandName)}</strong><b>${Math.round((active / stages.length) * 100)}%</b></div><div class="analysis-bar"><span style="width:${(active / stages.length) * 100}%"></span></div><ul class="analysis-list">${stages.map((stage,index) => `<li class="${index < active ? "done" : index === active ? "active" : ""}">${e(stage.label)}</li>`).join("")}</ul></div>`);
}

function readyScreen(): string {
  const draft = current(); const kit = draft.brandKit;
  return shell(`<h1 class="ob__title">${e(draft.brandName)} est prête</h1><p class="ob__lead">Ta boutique Shopify complète et modifiable t’attend.</p><div class="ready-card"><div class="ready-preview" style="background-image:url('${e(draft.product?.images[0] ?? "")}')"></div><div class="ready-copy"><h2>Ta boutique ${e(draft.brandName)}</h2><ul><li>Argumentaire adapté au produit</li><li>Vraies sections e-commerce modifiables</li><li>Offres groupées et éléments de confiance</li><li>Design responsive prêt pour Shopify</li></ul><button class="primary" data-action="claim">Récupérer ma boutique →</button></div></div>${kit ? `<div class="kit"><small>IDENTITÉ DE MARQUE</small><h2>${e(draft.brandName)}</h2><div class="palette">${kit.palette.map((color) => `<i style="background:${e(color)}"></i>`).join("")}</div><p>${e(kit.headingFont)} · ${e(kit.bodyFont)}</p></div>` : ""}`);
}

function authModal(): string {
  return `<div class="modal-backdrop"><div class="modal"><button class="modal-close" data-action="close-modal" aria-label="Fermer">×</button><h2>${signup ? "Crée ton compte" : "Content de te revoir"}</h2><p>${signup ? "Crée un compte pour récupérer ta boutique et continuer à la modifier." : "Connecte-toi pour récupérer la boutique générée."}</p><form id="auth-form">${signup ? '<input name="name" autocomplete="name" placeholder="Ton nom" required>' : ""}<input name="email" type="email" autocomplete="email" placeholder="toi@exemple.com" required><input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" placeholder="Mot de passe (8 caractères minimum)" required><button class="primary" type="submit">${signup ? "Créer mon compte et récupérer ma boutique" : "Me connecter et récupérer ma boutique"}</button>${error ? `<p class="field-error">${e(error)}</p>` : ""}</form><button class="modal-toggle" data-action="toggle-auth">${signup ? "Tu as déjà un compte ? Connecte-toi" : "Nouveau sur Weflo ? Crée un compte"}</button></div></div>`;
}

function render(): void {
  if (!root) return;
  if (!state || step === 0) root.innerHTML = sourceScreen();
  else if (step === 1) root.innerHTML = languageScreen();
  else if (step === 2) root.innerHTML = styleScreen();
  else if (step === 3) root.innerHTML = brandScreen();
  else if (step === 4) root.innerHTML = choiceScreen("personas");
  else if (step === 5) root.innerHTML = choiceScreen("angles");
  else if (step === 6) root.innerHTML = buildingScreen(0);
  else root.innerHTML = readyScreen();
}

async function patchDraft(patch: Record<string, unknown>): Promise<void> {
  if (!state) return;
  const response = await fetch(`/api/onboarding/${state.draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": state.claimToken }, body: JSON.stringify(patch) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Impossible d’enregistrer tes choix.");
  state.draft = body.draft; save();
}

async function build(): Promise<void> {
  if (!state || !root) return;
  step = 6; save();
  for (let index = 0; index < state.draft.stages.length; index += 1) {
    root.innerHTML = buildingScreen(index);
    await new Promise((resolve) => setTimeout(resolve, 115));
  }
  const response = await fetch(`/api/onboarding/${state.draft.id}/build`, { method: "POST", headers: { "x-weflo-claim-token": state.claimToken } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Impossible de construire ta boutique.");
  state.draft = body.draft; step = 7; save(); render();
}

async function claimAfterAuth(): Promise<void> {
  if (!state) return;
  const response = await fetch(`/api/onboarding/${state.draft.id}/claim`, { method: "POST", headers: { "x-weflo-claim-token": state.claimToken } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Impossible de récupérer ta boutique.");
  localStorage.removeItem(storageKey);
  location.href = `/editeur?page=${encodeURIComponent(body.pageId)}`;
}

document.addEventListener("submit", async (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id === "url-form") {
    event.preventDefault(); busy = true; error = ""; render();
    const url = String(new FormData(form).get("url") ?? "");
    try {
      const response = await fetch("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: url, language: "en" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Impossible d’importer ce produit.");
      state = { draft: body.draft, claimToken: body.claimToken, step: 1 }; step = 1; save();
    } catch (reason) { error = reason instanceof Error ? reason.message : "L’importation a échoué."; }
    busy = false; render();
  }
  if (form.id === "auth-form") {
    event.preventDefault(); error = "";
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "unavailable" ? "L’authentification n’est pas configurée sur cet environnement." : "Vérifie ton adresse e-mail et ton mot de passe, puis réessaie.");
      await claimAfterAuth();
    } catch (reason) { error = reason instanceof Error ? reason.message : "La connexion a échoué."; render(); }
  }
});

document.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("button,[data-action]");
  if (!target || busy) return;
  try {
    const language = target.dataset.language;
    if (language) { await patchDraft({ language }); render(); return; }
    const modelId = target.dataset.model;
    if (modelId) { current().modelId = modelId; save(); render(); return; }
    const brand = target.dataset.brand;
    if (brand !== undefined) { current().brandName = brand; save(); render(); return; }
    const choice = target.dataset.choice;
    if (choice) { const [kind, id] = choice.split(":") as ["personas" | "angles", string]; const entry = current()[kind].find((item) => item.id === id); if (entry) entry.selected = !entry.selected; save(); render(); return; }
    if (target.dataset.action === "back") { step = Math.max(0, step - 1); save(); render(); return; }
    if (target.dataset.action === "next") {
      if (step === 3) current().brandName = (document.querySelector<HTMLInputElement>("#brand-name")?.value.trim() || current().brandName).slice(0, 60);
      if (step === 5) { await patchDraft({ brandName: current().brandName, modelId: current().modelId, personas: current().personas, angles: current().angles }); await build(); return; }
      if (step === 1) await patchDraft({ language: current().language });
      if (step === 2) await patchDraft({ modelId: current().modelId });
      if (step === 3) await patchDraft({ brandName: current().brandName });
      if (step === 4) await patchDraft({ personas: current().personas });
      step += 1; save(); render(); return;
    }
    if (target.dataset.action === "claim") { authOpen = true; error = ""; render(); return; }
    if (target.dataset.action === "close-modal") { authOpen = false; render(); return; }
    if (target.dataset.action === "toggle-auth") { signup = !signup; error = ""; render(); }
  } catch (reason) { error = reason instanceof Error ? reason.message : "Une erreur est survenue."; render(); }
});

render();
