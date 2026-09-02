// src/create/workspace.ts
var creationFormats = [
  { id: "store", title: "Boutique compl\xE8te", description: "Accueil, produit, offre et confiance", icon: "\u25C6" },
  { id: "product", title: "Page produit", description: "Une fiche de vente Shopify compl\xE8te", icon: "\u25A3" },
  { id: "landing", title: "Landing page", description: "Une campagne, une promesse, une action", icon: "\u2197" },
  { id: "advertorial", title: "Advertorial", description: "Un r\xE9cit \xE9ditorial qui m\xE8ne vers l\u2019offre", icon: "\xB6" },
  { id: "quiz", title: "Quiz et funnel", description: "Questions, recommandation et capture", icon: "?" },
  { id: "home", title: "Page d\u2019accueil", description: "La vitrine compl\xE8te d\u2019une marque", icon: "\u2302" },
  { id: "blog", title: "Article de blog", description: "Contenu de marque structur\xE9 et lisible", icon: "\u2261" },
  { id: "blank", title: "Page vierge", description: "Construire librement dans l\u2019\xE9diteur", icon: "\uFF0B" }
];
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderCreateWorkspace(input) {
  const cards = creationFormats.map((format2) => `<button class="format-card" data-create-format="${format2.id}"><span>${format2.icon}</span><strong>${format2.title}</strong><small>${format2.description}</small></button>`).join("");
  const selected = creationFormats.find((format2) => format2.id === input.selectedFormat);
  const content = !selected ? `<div class="create-heading"><p>Nouvelle cr\xE9ation</p><h1>Qu\u2019est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : `<button class="back-format" data-back-format>\u2190 Changer de format</button><div class="create-heading"><p>${esc(selected.title)}</p><h1>Donne-nous la mati\xE8re de d\xE9part.</h1><span>Importe un produit ou d\xE9cris ton id\xE9e. Tu valideras l\u2019angle avant la construction.</span></div><div class="source-grid"><button data-create-source="link"><b>\u2197</b><strong>Importer un lien</strong><small>Amazon, AliExpress, Shopify ou autre site</small></button><label><b>\u25A7</b><strong>Ajouter une image</strong><small>PNG, JPG ou WebP</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label><button data-create-source="description"><b>Aa</b><strong>D\xE9crire mon id\xE9e</strong><small>Canardo pr\xE9pare la structure</small></button><button data-create-source="shopify"><b>S</b><strong>Depuis Shopify</strong><small>Choisir dans le catalogue connect\xE9</small></button></div><form class="source-form" data-source-form><textarea placeholder="${input.source === "link" ? "Colle le lien de ton produit\u2026" : "D\xE9cris le produit, l\u2019offre ou la page\u2026"}">${esc(input.prompt)}</textarea><button>Analyser et continuer</button></form>`;
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(input.workspaceName)}</small></aside><main>${content}</main></div>`;
}

// src/onboarding/creation-recipe.ts
var FORMAT_RECIPES = {
  product: ["announcement", "navigation", "productHero", "gallery", "productMain", "benefits", "reviews", "bundle", "shipping", "faq", "cta", "footer"],
  landing: ["announcement", "navigation", "hero", "benefits", "imageText", "comparison", "reviews", "productMain", "guarantees", "faq", "cta", "footer"],
  advertorial: ["navigation", "hero", "press", "richText", "imageText", "benefits", "reviews", "comparison", "productMain", "guarantees", "faq", "cta", "footer"],
  quiz: ["navigation", "hero", "benefits", "quiz", "form", "testimonials", "productMain", "guarantees", "faq", "cta", "footer"],
  home: ["announcement", "navigation", "hero", "collectionGrid", "imageText", "benefits", "testimonials", "newsletter", "footer"],
  blog: ["navigation", "hero", "richText", "imageText", "press", "newsletter", "footer"],
  blank: ["navigation", "hero", "footer"]
};
function isCreationFormat(value) {
  return typeof value === "string" && (value === "store" || value in FORMAT_RECIPES);
}

// src/hydrate/session-guard.ts
async function guardSession() {
  const res = await fetch("/api/me");
  if (res.status === 401) {
    location.assign("/connexion");
    return null;
  }
  if (!res.ok) return null;
  return await res.json();
}

// src/hydrate/onboarding-request.ts
async function readApiJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
    }
  }
  return {
    message: response.status >= 500 ? "Le serveur a rencontr\xE9 une erreur. R\xE9essaie dans un instant." : "La r\xE9ponse du serveur est invalide. R\xE9essaie."
  };
}

// src/hydrate/creer.ts
var root = document.querySelector("#create-app");
var params = new URLSearchParams(location.search);
var format = isCreationFormat(params.get("format")) ? params.get("format") : null;
var source = params.get("source");
var prompt = params.get("prompt") ?? "";
var draft = null;
var token = "";
var error = "";
var busy = false;
var workspaceName = "Ton espace";
function esc2(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
async function request(url, init) {
  const response = await fetch(url, init);
  const body = await readApiJson(response);
  if (!response.ok) throw new Error(body.message || "Cette \xE9tape n\u2019a pas abouti.");
  return body;
}
function render() {
  if (!root) return;
  root.innerHTML = draft ? renderStrategy() : renderCreateWorkspace({ workspaceName, selectedFormat: format, source, prompt });
  bind();
}
function renderStrategy() {
  const choices = [...draft.personas.map((item) => ({ ...item, kind: "persona" })), ...draft.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li class="active">3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc2(workspaceName)}</small></aside><main><div class="create-heading"><p>${esc2(creationFormats.find((item) => item.id === format)?.title ?? "Cr\xE9ation")}</p><h1>\xC0 qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l\u2019offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc2(item.id)}" aria-pressed="${item.selected}"><strong>${esc2(item.icon)} ${esc2(item.title)}</strong><small>${esc2(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc2(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction\u2026" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() {
  if (!root || !draft) return;
  root.innerHTML = `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li>\u2713 <span>Strat\xE9gie</span></li><li class="active">4 <span>Construction</span></li></ol></aside><main class="build-screen"><div class="build-card"><p>Canardo travaille</p><h1>${esc2(draft.brandName || "Ta page")} prend forme.</h1><ul>${draft.stages.map((stage, index) => `<li class="${index < 6 ? "done" : index === 6 ? "active" : ""}">${esc2(stage.label)}</li>`).join("")}</ul></div></main></div>`;
}
async function importLink(value) {
  const body = await request("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: value, language: "fr" }) });
  draft = body.draft;
  token = body.claimToken;
  await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: format ?? "store", language: "fr" }) });
}
async function importImage(file) {
  if (file.size > 45e4) throw new Error("Choisis une image de moins de 450 Ko.");
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire l\u2019image."));
    reader.readAsDataURL(file);
  });
  const body = await request("/api/onboarding/import-image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageDataUrl: data, fileName: file.name, language: "fr" }) });
  draft = body.draft;
  token = body.claimToken;
  await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: format ?? "store", language: "fr" }) });
}
async function createSimple() {
  const type = format === "blog" ? "write" : format === "blank" ? "blank" : "sell";
  const name = prompt.trim() || creationFormats.find((item) => item.id === format)?.title || "Nouvelle page";
  const page = await request("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, name }) });
  location.assign(`/editeur?page=${page.id}`);
}
async function build() {
  if (!draft) return;
  busy = true;
  error = "";
  renderBuild();
  await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: format ?? "store", personas: draft.personas, angles: draft.angles, language: "fr" }) });
  await request(`/api/onboarding/${draft.id}/build`, { method: "POST", headers: { "x-weflo-claim-token": token } });
  const claimed = await request(`/api/onboarding/${draft.id}/claim`, { method: "POST", headers: { "x-weflo-claim-token": token } });
  location.assign(`/editeur?page=${claimed.pageId}`);
}
function bind() {
  root?.querySelectorAll("[data-create-format]").forEach((button) => button.addEventListener("click", () => {
    format = button.dataset.createFormat;
    history.replaceState({}, "", `/creer?format=${format}`);
    render();
  }));
  root?.querySelector("[data-back-format]")?.addEventListener("click", () => {
    format = null;
    draft = null;
    render();
  });
  root?.querySelectorAll("[data-create-source]").forEach((button) => button.addEventListener("click", () => {
    source = button.dataset.createSource ?? null;
    root.querySelector("textarea")?.focus();
  }));
  root?.querySelector("[data-create-image]")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      busy = true;
      await importImage(file);
      render();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Import impossible";
      render();
    } finally {
      busy = false;
    }
  });
  root?.querySelector("[data-source-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    prompt = root.querySelector("textarea")?.value.trim() ?? "";
    if (!prompt) return;
    try {
      busy = true;
      if (source === "link" || /^https?:\/\//.test(prompt)) await importLink(prompt);
      else await createSimple();
      render();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Import impossible";
      render();
    } finally {
      busy = false;
    }
  });
  root?.querySelectorAll("[data-strategy]").forEach((button) => button.addEventListener("click", () => {
    const [kind, id] = (button.dataset.strategy ?? "").split(":");
    const list = kind === "persona" ? draft?.personas : draft?.angles;
    const item = list?.find((entry) => entry.id === id);
    if (item) item.selected = !item.selected;
    render();
  }));
  root?.querySelector("[data-build]")?.addEventListener("click", () => void build().catch((reason) => {
    busy = false;
    error = reason instanceof Error ? reason.message : "Construction impossible";
    render();
  }));
}
void (async () => {
  const me = await guardSession();
  if (!me) return;
  workspaceName = me.workspace.name;
  if (format === "blank") await createSimple();
  else render();
})();
