// src/hydrate/onboarding-request.ts
async function fetchWithDeadline(input, init, timeoutMs = 3e4, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error2) {
    if (controller.signal.aborted) throw new Error("L\u2019importation prend trop de temps. R\xE9essaie ou importe directement une image.");
    throw error2;
  } finally {
    clearTimeout(timeout);
  }
}
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

// src/hydrate/start.ts
var root = document.querySelector("#onboarding");
var storageKey = "weflo:onboarding";
var models = [
  { id: "proteo", name: "Proteo", bg: "#f7f7f3", ink: "#121210", accent: "#2f6b55", soft: "#d9e7d5" },
  { id: "amaro", name: "Amaro", bg: "#fff5ec", ink: "#2a100a", accent: "#a63212", soft: "#e8b79f" },
  { id: "kleen", name: "Kleen", bg: "#f7f3ef", ink: "#171513", accent: "#b69b8d", soft: "#dfd1c8" },
  { id: "apothec", name: "Apothec", bg: "#f7f6ef", ink: "#102016", accent: "#456a2e", soft: "#d5ddbb" },
  { id: "bloom", name: "Bloom", bg: "#fff4f4", ink: "#271015", accent: "#ca5266", soft: "#f2c7cf" }
];
var state = load();
var step = state?.step ?? 0;
var busy = false;
var busyMessage = "Importation\u2026";
var error = "";
var authOpen = false;
var signup = true;
var sources = [
  ["amazon", "Amazon", "/assets/brands/amazon.svg"],
  ["aliexpress", "AliExpress", "/assets/brands/aliexpress.svg"],
  ["shopify", "Shopify", "/assets/brands/shopify.svg"],
  ["etsy", "Etsy", "/assets/brands/etsy.svg"],
  ["temu", "Temu", "/assets/brands/temu.svg"]
];
function load() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "null");
  } catch {
    return null;
  }
}
function save() {
  if (state) {
    state.step = step;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
}
function e(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
function current() {
  if (!state) throw new Error("No onboarding draft");
  return state.draft;
}
function productPill() {
  const product = current().product;
  if (!product) return "";
  return `<div class="product-pill">${product.images[0] ? `<img src="${e(product.images[0])}" alt="">` : ""}<div><strong>${e(product.title)}</strong><br><small>${e(product.vendor || new URL(product.sourceUrl).hostname)}</small></div></div>`;
}
function shell(content, narrow = false) {
  const progress = Math.round(Math.min(step, 7) / 7 * 100);
  return `<div class="ob"><header class="ob__top"><a class="ob__logo" href="/">weflo<i>.</i></a><div class="ob__progress" aria-label="Progression de la cr\xE9ation"><span style="width:${progress}%"></span></div><a class="ob__exit" href="/">Enregistrer et quitter</a></header><section class="ob__screen${narrow ? " ob__screen--narrow" : ""}">${content}</section></div>${authOpen ? authModal() : ""}`;
}
function actions(label = "Continuer", back = true) {
  return `<div class="ob__actions">${back ? '<button class="secondary" data-action="back">\u2190 Retour</button>' : ""}<button class="primary" data-action="next">${e(label)}</button></div>`;
}
function sourceScreen() {
  return shell(`<h1 class="ob__title">Quel produit veux-tu vendre ?</h1><p class="ob__lead">Colle le lien d\u2019un fournisseur, d\u2019une boutique ou d\u2019un concurrent.</p><div class="ob__sources">${sources.map(([id, name, logo]) => `<span class="source source--${id}" title="${name}"><img src="${logo}" alt="${name}"></span>`).join("")}<span class="source source--other" title="Autre site" aria-label="Autre site">\u2197</span></div><form class="url-form" id="url-form"><div class="url-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input name="url" type="url" required autocomplete="url" placeholder="https://www.aliexpress.com/item/\u2026" aria-label="Lien du produit"><button type="submit" ${busy ? "disabled" : ""}>${busy ? e(busyMessage) : "Continuer"}</button></div><p class="ob__hint">Amazon, AliExpress, Shopify, Etsy, Temu et la plupart des pages produit publiques sont compatibles.</p><div class="import-divider"><span>ou</span></div><label class="image-import${busy ? " is-disabled" : ""}" for="product-image"><span class="image-import__icon">\uFF0B</span><span><strong>Importer directement une image</strong><small>PNG, JPG ou WebP \xB7 Weflo l\u2019analyse et l\u2019optimise automatiquement</small></span><input id="product-image" type="file" accept="image/png,image/jpeg,image/webp" ${busy ? "disabled" : ""}></label>${error ? `<p class="field-error">${e(error)}</p>` : ""}</form>`, true);
}
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}
async function optimizeImage(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choisis une image PNG, JPG ou WebP.");
  if (file.size > 12e6) throw new Error("Cette image d\xE9passe 12 Mo. Choisis une image plus l\xE9g\xE8re.");
  const original = await readFile(file);
  if (file.size <= 3e5) return original;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Ton navigateur ne peut pas optimiser cette image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
  if (!compressed) throw new Error("Impossible d\u2019optimiser cette image.");
  if (compressed.size > 45e4) {
    const smaller = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.62));
    if (!smaller || smaller.size > 45e4) throw new Error("Cette image reste trop volumineuse apr\xE8s optimisation.");
    return readFile(smaller);
  }
  return readFile(compressed);
}
function languageScreen() {
  const languages = [["en", "US", "Anglais"], ["fr", "FR", "Fran\xE7ais"], ["de", "DE", "Allemand"], ["es", "ES", "Espagnol"], ["it", "IT", "Italien"], ["pt", "PT", "Portugais"], ["nl", "NL", "N\xE9erlandais"], ["pl", "PL", "Polonais"]];
  return shell(`${productPill()}<h1 class="ob__title">Quelle langue parlent tes clients ?</h1><p class="ob__lead">Tous les textes de la boutique seront r\xE9dig\xE9s dans cette langue. L\u2019interface Weflo reste en fran\xE7ais.</p><div class="language-grid">${languages.map(([value, code, label]) => `<button class="choice" data-language="${value}" aria-pressed="${current().language === value}"><strong>${code} &nbsp;${label}</strong></button>`).join("")}</div>${actions()}`, true);
}
function styleScreen() {
  return shell(`${productPill()}<h1 class="ob__title">\xC0 quoi doit ressembler ta boutique ?</h1><p class="ob__lead">Choisis une direction visuelle. Chaque couleur, police et forme restera modifiable.</p><div class="style-row"><button class="style-card" data-model="proteo" aria-pressed="${current().modelId === "proteo"}"><div class="style-preview" style="--bg:#1b1a18;--ink:#fff;--accent:#ffd13b;--soft:#37342f"><b>\u2726 Laisser l\u2019IA d\xE9cider</b><i></i><span></span><em></em></div><strong>Une identit\xE9 unique</strong></button>${models.map((model) => `<button class="style-card" data-model="${model.id}" aria-pressed="${current().modelId === model.id}"><div class="style-preview" style="--bg:${model.bg};--ink:${model.ink};--accent:${model.accent};--soft:${model.soft}"><b>${e(current().brandName || current().product?.title)}</b><i></i><span></span><span></span><em></em></div><strong>${model.name}</strong></button>`).join("")}</div>${actions()}`);
}
function brandScreen() {
  return shell(`${productPill()}<h1 class="ob__title">Comment veux-tu appeler ta boutique ?</h1><p class="ob__lead">Canardo a imagin\xE9 ces noms \xE0 partir de ton produit. Tu pourras le modifier plus tard.</p><input class="brand-input" id="brand-name" maxlength="60" value="${e(current().brandName)}" aria-label="Nom de la marque"><div class="brand-chips">${current().brandNames.map((name) => `<button class="chip${name === current().brandName ? " active" : ""}" data-brand="${e(name)}">${e(name)}</button>`).join("")}</div>${actions()}`, true);
}
function choiceScreen(kind) {
  const persona = kind === "personas";
  const entries = current()[kind];
  return shell(`<h1 class="ob__title">${persona ? "\xC0 qui s\u2019adresse ce produit ?" : "Quelles sont les principales raisons d\u2019acheter ?"}</h1><p class="ob__lead">Choisis une ou plusieurs r\xE9ponses : la premi\xE8re guidera les titres, le visuel principal et l\u2019argumentaire.</p><div class="choice-grid">${entries.map((entry) => `<button class="choice" data-choice="${kind}:${e(entry.id)}" aria-pressed="${entry.selected}"><strong>${e(entry.title)} <span>${e(entry.icon)}</span></strong><small>${e("insight" in entry ? entry.insight : entry.description)}</small><span class="choice__tags">${entry.tags.map((tag) => `<span>${e(tag)}</span>`).join("")}</span></button>`).join("")}</div>${actions(persona ? "Continuer" : "Construire ma boutique")}`);
}
function buildingScreen(active = 0) {
  const stages = current().stages;
  return shell(`<div class="analysis-card"><div class="analysis-head"><strong>${e(current().brandName)}</strong><b>${Math.round(active / stages.length * 100)}%</b></div><div class="analysis-bar"><span style="width:${active / stages.length * 100}%"></span></div><ul class="analysis-list">${stages.map((stage, index) => `<li class="${index < active ? "done" : index === active ? "active" : ""}">${e(stage.label)}</li>`).join("")}</ul></div>`);
}
function readyScreen() {
  const draft = current();
  const kit = draft.brandKit;
  return shell(`<h1 class="ob__title">${e(draft.brandName)} est pr\xEAte</h1><p class="ob__lead">Ta boutique Shopify compl\xE8te et modifiable t\u2019attend.</p><div class="ready-card"><div class="ready-preview" style="background-image:url('${e(draft.product?.images[0] ?? "")}')"></div><div class="ready-copy"><h2>Ta boutique ${e(draft.brandName)}</h2><ul><li>Argumentaire adapt\xE9 au produit</li><li>Vraies sections e-commerce modifiables</li><li>Offres group\xE9es et \xE9l\xE9ments de confiance</li><li>Design responsive pr\xEAt pour Shopify</li></ul><button class="primary" data-action="claim">R\xE9cup\xE9rer ma boutique \u2192</button></div></div>${kit ? `<div class="kit"><small>IDENTIT\xC9 DE MARQUE</small><h2>${e(draft.brandName)}</h2><div class="palette">${kit.palette.map((color) => `<i style="background:${e(color)}"></i>`).join("")}</div><p>${e(kit.headingFont)} \xB7 ${e(kit.bodyFont)}</p></div>` : ""}`);
}
function authModal() {
  return `<div class="modal-backdrop"><div class="modal"><button class="modal-close" data-action="close-modal" aria-label="Fermer">\xD7</button><h2>${signup ? "Cr\xE9e ton compte" : "Content de te revoir"}</h2><p>${signup ? "Cr\xE9e un compte pour r\xE9cup\xE9rer ta boutique et continuer \xE0 la modifier." : "Connecte-toi pour r\xE9cup\xE9rer la boutique g\xE9n\xE9r\xE9e."}</p><form id="auth-form">${signup ? '<input name="name" autocomplete="name" placeholder="Ton nom" required>' : ""}<input name="email" type="email" autocomplete="email" placeholder="toi@exemple.com" required><input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" placeholder="Mot de passe (8 caract\xE8res minimum)" required><button class="primary" type="submit">${signup ? "Cr\xE9er mon compte et r\xE9cup\xE9rer ma boutique" : "Me connecter et r\xE9cup\xE9rer ma boutique"}</button>${error ? `<p class="field-error">${e(error)}</p>` : ""}</form><button class="modal-toggle" data-action="toggle-auth">${signup ? "Tu as d\xE9j\xE0 un compte ? Connecte-toi" : "Nouveau sur Weflo ? Cr\xE9e un compte"}</button></div></div>`;
}
function render() {
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
async function patchDraft(patch) {
  if (!state) return;
  const response = await fetch(`/api/onboarding/${state.draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": state.claimToken }, body: JSON.stringify(patch) });
  const body = await readApiJson(response);
  if (!response.ok) throw new Error(body.message || "Impossible d\u2019enregistrer tes choix.");
  state.draft = body.draft;
  save();
}
async function build() {
  if (!state || !root) return;
  step = 6;
  save();
  for (let index = 0; index < state.draft.stages.length; index += 1) {
    root.innerHTML = buildingScreen(index);
    await new Promise((resolve) => setTimeout(resolve, 115));
  }
  const response = await fetch(`/api/onboarding/${state.draft.id}/build`, { method: "POST", headers: { "x-weflo-claim-token": state.claimToken } });
  const body = await readApiJson(response);
  if (!response.ok) throw new Error(body.message || "Impossible de construire ta boutique.");
  state.draft = body.draft;
  step = 7;
  save();
  render();
}
async function claimAfterAuth() {
  if (!state) return;
  const response = await fetch(`/api/onboarding/${state.draft.id}/claim`, { method: "POST", headers: { "x-weflo-claim-token": state.claimToken } });
  const body = await readApiJson(response);
  if (!response.ok) throw new Error(body.message || "Impossible de r\xE9cup\xE9rer ta boutique.");
  localStorage.removeItem(storageKey);
  location.href = `/editeur?page=${encodeURIComponent(body.pageId)}`;
}
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.id === "url-form") {
    event.preventDefault();
    busy = true;
    error = "";
    render();
    const url = String(new FormData(form).get("url") ?? "");
    try {
      const response = await fetchWithDeadline("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: url, language: "en" }) });
      const body = await readApiJson(response);
      if (!response.ok) throw new Error(body.message || "Impossible d\u2019importer ce produit.");
      state = { draft: body.draft, claimToken: body.claimToken, step: 1 };
      step = 1;
      save();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "L\u2019importation a \xE9chou\xE9.";
    } finally {
      busy = false;
      busyMessage = "Importation\u2026";
      render();
    }
  }
  if (form.id === "auth-form") {
    event.preventDefault();
    error = "";
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const body = await readApiJson(response);
      if (!response.ok) throw new Error(body.error === "unavailable" ? "L\u2019authentification n\u2019est pas configur\xE9e sur cet environnement." : "V\xE9rifie ton adresse e-mail et ton mot de passe, puis r\xE9essaie.");
      await claimAfterAuth();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "La connexion a \xE9chou\xE9.";
      render();
    }
  }
});
document.addEventListener("change", async (event) => {
  const input = event.target;
  if (input.id !== "product-image" || !input.files?.[0] || busy) return;
  const file = input.files[0];
  busy = true;
  busyMessage = "Analyse de l\u2019image\u2026";
  error = "";
  render();
  try {
    const imageDataUrl = await optimizeImage(file);
    const response = await fetchWithDeadline("/api/onboarding/import-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl, fileName: file.name, language: "en" })
    });
    const body = await readApiJson(response);
    if (!response.ok) throw new Error(body.message || "Impossible d\u2019analyser cette image.");
    state = { draft: body.draft, claimToken: body.claimToken, step: 1 };
    step = 1;
    save();
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "L\u2019analyse de l\u2019image a \xE9chou\xE9.";
  } finally {
    busy = false;
    busyMessage = "Importation\u2026";
    render();
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button,[data-action]");
  if (!target || busy) return;
  try {
    const language = target.dataset.language;
    if (language) {
      await patchDraft({ language });
      render();
      return;
    }
    const modelId = target.dataset.model;
    if (modelId) {
      current().modelId = modelId;
      save();
      render();
      return;
    }
    const brand = target.dataset.brand;
    if (brand !== void 0) {
      current().brandName = brand;
      save();
      render();
      return;
    }
    const choice = target.dataset.choice;
    if (choice) {
      const [kind, id] = choice.split(":");
      const entry = current()[kind].find((item) => item.id === id);
      if (entry) entry.selected = !entry.selected;
      save();
      render();
      return;
    }
    if (target.dataset.action === "back") {
      step = Math.max(0, step - 1);
      save();
      render();
      return;
    }
    if (target.dataset.action === "next") {
      if (step === 3) current().brandName = (document.querySelector("#brand-name")?.value.trim() || current().brandName).slice(0, 60);
      if (step === 5) {
        await patchDraft({ brandName: current().brandName, modelId: current().modelId, personas: current().personas, angles: current().angles });
        await build();
        return;
      }
      if (step === 1) await patchDraft({ language: current().language });
      if (step === 2) await patchDraft({ modelId: current().modelId });
      if (step === 3) await patchDraft({ brandName: current().brandName });
      if (step === 4) await patchDraft({ personas: current().personas });
      step += 1;
      save();
      render();
      return;
    }
    if (target.dataset.action === "claim") {
      authOpen = true;
      error = "";
      render();
      return;
    }
    if (target.dataset.action === "close-modal") {
      authOpen = false;
      render();
      return;
    }
    if (target.dataset.action === "toggle-auth") {
      signup = !signup;
      error = "";
      render();
    }
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Une erreur est survenue.";
    render();
  }
});
render();
