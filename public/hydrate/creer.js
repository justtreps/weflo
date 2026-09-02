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

// src/create/build-view.ts
function esc2(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderBuildExperience(input) {
  const total = Math.max(input.stages.length, 1);
  const activeIndex = Math.min(Math.max(input.activeIndex, 0), total - 1);
  const progress = Math.round((activeIndex + 1) / total * 100);
  const current = input.stages[activeIndex]?.label ?? "Finalisation de la page";
  const visible = input.stages.slice(Math.max(0, activeIndex - 2), Math.min(total, activeIndex + 4));
  const image = input.productImage && /^(https:\/\/|data:image\/)/.test(input.productImage) ? input.productImage : null;
  const previewSections = ["navigation", "hero", "offre", "b\xE9n\xE9fices", "preuves sociales"];
  return `<main class="build-experience">
    <header class="build-topbar"><div><span>${esc2(input.formatTitle)}</span><strong>${esc2(input.brandName)} prend forme</strong></div><div class="build-percent"><b>${progress}%</b><span>Construction</span></div></header>
    <div class="build-progress" data-build-progress="${progress}" role="progressbar" aria-label="Construction de la page : ${progress} %" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
    <div class="build-layout">
      <section class="build-status">
        <div class="canardo-status"><span class="canardo-orbit">\u25CF</span><div><small>Canardo travaille maintenant</small><h1>${esc2(current)}</h1><p>La structure, les textes et la direction visuelle sont assembl\xE9s dans une m\xEAme identit\xE9.</p></div></div>
        <div class="stage-stream">${visible.map((stage) => {
    const index = input.stages.indexOf(stage);
    const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";
    return `<div class="stage-row" data-stage-state="${state}"><i>${state === "done" ? "\u2713" : state === "active" ? "\u25CF" : ""}</i><span>${esc2(stage.label)}</span>${state === "active" ? "<em>en cours</em>" : ""}</div>`;
  }).join("")}</div>
        <div class="build-note"><span>\u2726</span><p><strong>Une seule direction de marque.</strong> Chaque nouvelle section reprend les m\xEAmes couleurs, espacements et r\xE8gles typographiques.</p></div>
      </section>
      <section class="storefront-window" data-build-preview>
        <div class="browser-chrome"><i></i><i></i><i></i><span>${esc2(input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")) || "boutique"}.com</span><b>aper\xE7u en direct</b></div>
        <div class="storefront-canvas">
          <div class="preview-nav preview-part ${activeIndex >= 0 ? "is-built" : ""}" data-preview-section="navigation"><strong>${esc2(input.brandName)}</strong><span>Boutique&nbsp;&nbsp; \xC0 propos&nbsp;&nbsp; Journal</span><button>Panier (0)</button></div>
          <div class="preview-hero preview-part ${activeIndex >= 1 ? "is-built" : ""}" data-preview-section="hero"><div><small>La s\xE9lection ${esc2(input.brandName)}</small><h2>Le produit pens\xE9 pour ton quotidien.</h2><p>Une promesse claire, une preuve cr\xE9dible et un parcours sans friction.</p><button>D\xE9couvrir le produit</button></div><div class="preview-media">${image ? `<img src="${esc2(image)}" alt="Produit import\xE9">` : "<span></span>"}</div></div>
          <div class="preview-trust preview-part ${activeIndex >= 2 ? "is-built" : ""}" data-preview-section="offre"><span>Livraison suivie</span><span>Paiement s\xE9curis\xE9</span><span>30 jours pour essayer</span></div>
          <div class="preview-benefits preview-part ${activeIndex >= 3 ? "is-built" : ""}" data-preview-section="b\xE9n\xE9fices"><article><i>01</i><strong>Con\xE7u avec intention</strong><p>Le b\xE9n\xE9fice principal expliqu\xE9 sans d\xE9tour.</p></article><article><i>02</i><strong>Simple \xE0 adopter</strong><p>Une d\xE9monstration visuelle qui rassure.</p></article><article><i>03</i><strong>Fait pour durer</strong><p>Des preuves concr\xE8tes avant la promesse.</p></article></div>
          <div class="preview-proof preview-part ${activeIndex >= 4 ? "is-built" : ""}" data-preview-section="preuves"><div><span>\u2605\u2605\u2605\u2605\u2605</span><strong>\u201CC\u2019est exactement ce que je cherchais.\u201D</strong><small>Acheteur v\xE9rifi\xE9</small></div><div class="proof-image"></div></div>
          <div class="preview-building"><span></span><span></span><span></span></div>
        </div>
      </section>
    </div>
  </main>`;
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
var buildStageIndex = 0;
function esc3(value) {
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
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li class="active">3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc3(workspaceName)}</small></aside><main><div class="create-heading"><p>${esc3(creationFormats.find((item) => item.id === format)?.title ?? "Cr\xE9ation")}</p><h1>\xC0 qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l\u2019offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc3(item.id)}" aria-pressed="${item.selected}"><strong>${esc3(item.icon)} ${esc3(item.title)}</strong><small>${esc3(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc3(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction\u2026" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() {
  if (!root || !draft) return;
  const formatTitle = creationFormats.find((item) => item.id === format)?.title ?? "Boutique";
  root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li>\u2713 <span>Strat\xE9gie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc3(workspaceName)}</small></aside>${renderBuildExperience({ brandName: draft.brandName || "Ta marque", formatTitle, stages: draft.stages, activeIndex: buildStageIndex, productImage: draft.product?.images[0] })}</div>`;
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
  buildStageIndex = 0;
  renderBuild();
  let timer;
  try {
    await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: format ?? "store", personas: draft.personas, angles: draft.angles, language: "fr" }) });
    buildStageIndex = 1;
    renderBuild();
    timer = setInterval(() => {
      if (!draft) return;
      const ceiling = Math.max(1, draft.stages.length - 2);
      if (buildStageIndex < ceiling) {
        buildStageIndex += 1;
        renderBuild();
      }
    }, 650);
    await request(`/api/onboarding/${draft.id}/build`, { method: "POST", headers: { "x-weflo-claim-token": token } });
    if (timer) clearInterval(timer);
    timer = void 0;
    while (buildStageIndex < draft.stages.length - 1) {
      buildStageIndex += 1;
      renderBuild();
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    const claimed = await request(`/api/onboarding/${draft.id}/claim`, { method: "POST", headers: { "x-weflo-claim-token": token } });
    await new Promise((resolve) => setTimeout(resolve, 450));
    location.assign(`/editeur?page=${claimed.pageId}`);
  } finally {
    if (timer) clearInterval(timer);
  }
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
