// src/studio/models.ts
var MODELS = {
  "nano-banana-2": { id: "nano-banana-2", label: "Nano Banana 2", description: "Rapide, r\xE9aliste et fid\xE8le au produit", textEndpoint: "fal-ai/nano-banana-2", referenceEndpoint: "fal-ai/nano-banana-2/edit", inputMode: "aspect", referenceKey: "image_urls" },
  "nano-banana-pro": { id: "nano-banana-pro", label: "Nano Banana Pro", description: "Composition premium et texte pr\xE9cis", textEndpoint: "fal-ai/nano-banana-pro", referenceEndpoint: "fal-ai/nano-banana-pro/edit", inputMode: "aspect", referenceKey: "image_urls" },
  "gpt-image-2": { id: "gpt-image-2", label: "GPT Image 2", description: "Prompt complexe, typographie et retouche", textEndpoint: "openai/gpt-image-2", referenceEndpoint: "openai/gpt-image-2/edit", inputMode: "size", referenceKey: "image_urls" },
  "flux-2-flex": { id: "flux-2-flex", label: "FLUX.2 Flex", description: "Direction artistique et d\xE9tails contr\xF4l\xE9s", textEndpoint: "fal-ai/flux-2-flex", referenceEndpoint: "fal-ai/flux-2-flex/edit", inputMode: "size", referenceKey: "image_urls" }
};
function imageModels() {
  return Object.values(MODELS);
}

// src/dashboard/brand-icons.ts
function shopifyLogo(variant = "mark") {
  const className = variant === "full" ? "brand-logo brand-logo--full" : "brand-logo";
  return `<img class="${className}" src="/assets/brands/shopify.svg" alt="Shopify" loading="lazy">`;
}

// src/studio/view.ts
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function resultCard(generation, url, index) {
  return `<article class="generated-card" data-generation-id="${esc(generation.id)}"><img src="${esc(url)}" alt="R\xE9sultat ${index + 1} pour ${esc(generation.prompt)}" loading="lazy"><div class="image-actions"><a href="${esc(url)}" download target="_blank">T\xE9l\xE9charger</a><button data-image-command="reference" data-image-url="${esc(url)}">Comme r\xE9f\xE9rence</button><button data-image-command="variation" data-image-url="${esc(url)}">Cr\xE9er une variation</button><button class="accent" data-image-command="insert" data-image-url="${esc(url)}">Ajouter \xE0 une page</button></div></article>`;
}
function renderStudioView(input) {
  const latest = input.generations[0];
  const images = input.generations.flatMap((generation) => generation.images.map((image, index) => resultCard(generation, image.url, index))).join("");
  const history = input.generations.map((generation) => `<button data-history-id="${esc(generation.id)}"><span>${generation.images[0] ? `<img src="${esc(generation.images[0].url)}" alt="">` : "\u2726"}</span><span><strong>${esc(generation.prompt)}</strong><small>${esc(imageModels().find((item) => item.id === generation.model)?.label ?? generation.model)} \xB7 ${esc(generation.aspectRatio)}</small></span></button>`).join("");
  const active = input.pending;
  const pending = active ? Array.from({ length: active.numImages }, (_, index) => `<article class="pending-image-frame" data-generation-pending style="aspect-ratio:${esc(active.aspectRatio.replace(":", "/"))}"><div class="pending-image-glow"></div><div class="pending-image-spinner" aria-hidden="true"></div><div class="pending-image-copy"><span>G\xE9n\xE9ration en cours</span><strong>${esc(active.prompt)}</strong><small>${esc(imageModels().find((item) => item.id === active.model)?.label ?? active.model)} \xB7 image ${index + 1}/${active.numImages}</small></div></article>`).join("") : "";
  const pendingHistory = input.pending ? `<button class="is-generating"><span class="mini-spinner"></span><span><strong>${esc(input.pending.prompt)}</strong><small>G\xE9n\xE9ration en cours\u2026</small></span></button>` : "";
  return `<div class="studio-shell"><aside class="studio-history"><a class="studio-brand" href="/dashboard">weflo<span>.</span></a><a class="back-link" href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><button class="new-session" data-new-session>\uFF0B Nouvelle cr\xE9ation</button><p class="side-title">HISTORIQUE</p><div data-studio-history>${pendingHistory}${history || (!input.pending ? `<p class="empty-history">Tes g\xE9n\xE9rations appara\xEEtront ici.</p>` : "")}</div><nav><a href="/creations">\u25A3 Mes cr\xE9ations</a><a href="/boutique">${shopifyLogo()} Ma boutique</a></nav></aside>
    <main class="studio-canvas"><header><div><p class="eyebrow">STUDIO IMAGES</p><h1>Imagine. G\xE9n\xE8re. Vends.</h1></div><span>${esc(input.workspaceName)}</span></header><section class="result-grid" data-result-grid>${pending}${images || (!input.pending ? `<div class="studio-empty"><span>\u2726</span><h2>Ton prochain visuel commence par une id\xE9e.</h2><p>D\xE9cris une sc\xE8ne, ajoute ton produit en r\xE9f\xE9rence et choisis le mod\xE8le adapt\xE9.</p><div><button data-prompt-example="Photo e-commerce premium du produit, lumi\xE8re naturelle et fond \xE9ditorial">Photo produit premium</button><button data-prompt-example="Publicit\xE9 Meta avec une accroche courte et lisible, produit parfaitement fid\xE8le">Static Meta avec texte</button><button data-prompt-example="Le produit dans une vraie sc\xE8ne de vie, composition cr\xE9dible et \xE9l\xE9gante">Lifestyle r\xE9aliste</button></div></div>` : "")}</section>
      <form class="studio-composer" data-studio-form><div class="reference-preview" data-reference-preview hidden><img alt="Produit de r\xE9f\xE9rence"><button type="button" data-reference-remove aria-label="Retirer la r\xE9f\xE9rence">\xD7</button></div><textarea name="prompt" placeholder="D\xE9cris l\u2019image que tu veux cr\xE9er\u2026" aria-label="Prompt de g\xE9n\xE9ration">${latest ? "" : ""}</textarea><div class="composer-row"><label class="attach">\uFF0B Image de r\xE9f\xE9rence<input type="file" accept="image/png,image/jpeg,image/webp" data-reference-input hidden></label><span class="product-lock">\u25C9 Fid\xE9lit\xE9 produit renforc\xE9e</span><button type="submit">G\xE9n\xE9rer <span>\u2197</span></button></div></form>
    </main><aside class="studio-settings"><header><strong>Direction artistique</strong><small>Chaque r\xE9glage reste modifiable.</small></header><section><p>MOD\xC8LE</p><div class="model-list">${imageModels().map((model, index) => `<button class="${index === 0 ? "is-active" : ""}" data-model="${model.id}"><span>\u2726</span><span><strong>${model.label}</strong><small>${model.description}</small></span><i>${index === 0 ? "Rapide" : "Pro"}</i></button>`).join("")}</div></section><section><p>FORMAT</p><div class="ratio-list">${["1:1", "4:3", "16:9", "3:4", "9:16"].map((ratio, index) => `<button class="${index === 0 ? "is-active" : ""}" data-ratio="${ratio}"><i style="aspect-ratio:${ratio.replace(":", "/")}"></i><span>${ratio}</span></button>`).join("")}</div></section><section><p>VARIANTES</p><div class="count-list">${[1, 2, 3, 4].map((n) => `<button class="${n === 1 ? "is-active" : ""}" data-count="${n}">${n}</button>`).join("")}</div></section><div class="studio-tip"><strong>Conseil Weflo</strong><p>Ajoute une photo nette du produit pour garder sa forme, ses mati\xE8res et ses d\xE9tails.</p></div></aside></div><dialog class="insert-dialog" data-insert-dialog><button data-insert-close aria-label="Fermer">\xD7</button><p class="eyebrow">UTILISER LE VISUEL</p><h2>Ajouter \xE0 une page</h2><p>Choisis la cr\xE9ation \xE0 ouvrir. Le visuel t\u2019attendra dans l\u2019\xE9diteur.</p><div data-page-choices></div></dialog>`;
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

// src/studio/browser-history.ts
function isGeneration(value) {
  if (!value || typeof value !== "object") return false;
  const row = value;
  return typeof row.id === "string" && typeof row.prompt === "string" && typeof row.createdAt === "string" && Array.isArray(row.images) && row.images.every((image) => image && typeof image.url === "string");
}
function readCachedGenerations(value) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(isGeneration) : [];
  } catch {
    return [];
  }
}
function mergeGenerations(primary, secondary) {
  const seen = /* @__PURE__ */ new Set();
  return [...primary, ...secondary].filter((generation) => !seen.has(generation.id) && Boolean(seen.add(generation.id))).slice(0, 100);
}

// src/hydrate/studio.ts
async function api(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Erreur serveur" };
  }
  if (!response.ok) throw new Error(data.message || `Erreur ${response.status}`);
  return data;
}
async function start() {
  const me = await guardSession();
  if (!me) return;
  const root = document.querySelector("#studio-app");
  if (!root) return;
  const cacheKey = `weflo-studio-history:${me.workspace.id}`;
  const cached = readCachedGenerations(localStorage.getItem(cacheKey));
  let history = await api("/api/studio/generations").catch(() => ({ generations: [] }));
  history.generations = mergeGenerations(cached, history.generations);
  let model = "nano-banana-2";
  let ratio = "1:1";
  let count = 1;
  let referenceUrl = null;
  let insertUrl = "";
  let pending = null;
  const render = () => {
    root.innerHTML = renderStudioView({ workspaceName: me.workspace.name, generations: history.generations, pending });
    bind();
  };
  const setChoice = (selector, selected) => {
    root.querySelectorAll(selector).forEach((item) => item.classList.remove("is-active"));
    selected.classList.add("is-active");
  };
  const bind = () => {
    root.querySelectorAll("[data-model]").forEach((button) => button.addEventListener("click", () => {
      model = button.dataset.model;
      setChoice("[data-model]", button);
    }));
    root.querySelectorAll("[data-ratio]").forEach((button) => button.addEventListener("click", () => {
      ratio = button.dataset.ratio;
      setChoice("[data-ratio]", button);
    }));
    root.querySelectorAll("[data-count]").forEach((button) => button.addEventListener("click", () => {
      count = Number(button.dataset.count);
      setChoice("[data-count]", button);
    }));
    root.querySelectorAll("[data-prompt-example]").forEach((button) => button.addEventListener("click", () => {
      const area = root.querySelector("textarea");
      if (area) {
        area.value = button.dataset.promptExample ?? "";
        area.focus();
      }
    }));
    const file = root.querySelector("[data-reference-input]");
    file?.addEventListener("change", () => {
      const selected = file.files?.[0];
      if (!selected) return;
      if (selected.size > 10 * 1024 * 1024) {
        alert("L\u2019image doit peser moins de 10 Mo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        referenceUrl = String(reader.result);
        paintReference();
      };
      reader.readAsDataURL(selected);
    });
    const paintReference = () => {
      const box = root.querySelector("[data-reference-preview]");
      const image = box?.querySelector("img");
      if (box) box.hidden = !referenceUrl;
      if (image && referenceUrl) image.src = referenceUrl;
    };
    root.querySelector("[data-reference-remove]")?.addEventListener("click", () => {
      referenceUrl = null;
      if (file) file.value = "";
      paintReference();
    });
    paintReference();
    root.querySelector("[data-new-session]")?.addEventListener("click", () => {
      const area = root.querySelector("textarea");
      if (area) {
        area.value = "";
        area.focus();
      }
      referenceUrl = null;
      paintReference();
    });
    root.querySelector("[data-studio-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const prompt = root.querySelector("textarea")?.value.trim() ?? "";
      if (!prompt || pending) return;
      pending = { prompt, model, aspectRatio: ratio, numImages: count };
      const request = { model, aspectRatio: ratio, numImages: count, referenceUrl };
      render();
      root.querySelector("[data-generation-pending]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        const generated = await api("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, ...request }) });
        history = { generations: mergeGenerations([generated], history.generations) };
        localStorage.setItem(cacheKey, JSON.stringify(history.generations));
        pending = null;
        render();
        root.querySelector(`[data-generation-id="${generated.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        pending = null;
        render();
        const grid = root.querySelector("[data-result-grid]");
        if (grid) grid.insertAdjacentHTML("afterbegin", `<div class="studio-error"><div><h2>La g\xE9n\xE9ration n\u2019a pas abouti.</h2><p>${error instanceof Error ? error.message : "R\xE9essaie dans un instant."}</p></div></div>`);
      }
    });
    root.querySelectorAll("[data-image-command]").forEach((button) => button.addEventListener("click", async () => {
      const url = button.dataset.imageUrl ?? "";
      if (button.dataset.imageCommand === "reference" || button.dataset.imageCommand === "variation") {
        referenceUrl = url;
        paintReference();
        root.querySelector("textarea")?.focus();
      }
      if (button.dataset.imageCommand === "insert") {
        insertUrl = url;
        const dialog2 = root.querySelector("[data-insert-dialog]");
        const pages = await api("/api/pages");
        const choices = dialog2.querySelector("[data-page-choices]");
        choices.innerHTML = pages.pages.length ? pages.pages.map((page) => `<button data-page-id="${page.id}">${page.name}<small> \xB7 ${page.type === "sell" ? "Page produit" : "Page"}</small></button>`).join("") : `<a href="/creer">Cr\xE9er une page d\u2019abord</a>`;
        choices.querySelectorAll("[data-page-id]").forEach((choice) => choice.addEventListener("click", () => {
          const pageId = choice.dataset.pageId;
          sessionStorage.setItem("weflo-studio-insert", JSON.stringify({ pageId, imageUrl: insertUrl }));
          location.assign(`/editeur?page=${pageId}`);
        }));
        dialog2.showModal();
      }
    }));
    const dialog = root.querySelector("[data-insert-dialog]");
    dialog?.querySelector("[data-insert-close]")?.addEventListener("click", () => dialog.close());
  };
  render();
}
void start();
