// src/editor/schema.ts
var BREAKPOINTS = /* @__PURE__ */ new Set(["desktop", "tablet", "mobile"]);
var PAGE_KINDS = /* @__PURE__ */ new Set(["landing", "product", "collection", "home"]);
var ASSET_TYPES = /* @__PURE__ */ new Set(["image", "video"]);
function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function settingValue(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  return Array.isArray(value) && value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
}
function styleSettings(value) {
  return object(value) && Object.values(value).every(settingValue);
}
function responsiveSettings(value) {
  if (!object(value)) return false;
  return Object.entries(value).every(([breakpoint, styles]) => BREAKPOINTS.has(breakpoint) && styleSettings(styles));
}
function unsafeCustomCode(section) {
  if (section.type !== "customCode" || !object(section.settings)) return false;
  const html = typeof section.settings.html === "string" ? section.settings.html : "";
  const js = typeof section.settings.js === "string" ? section.settings.js : "";
  return /<script\b[^>]*\bsrc\s*=|\bimport\s*\(|\bdocument\.cookie\b|\bwindow\.top\b|\bparent\.location\b/i.test(`${html}
${js}`);
}
function validateBlock(value, errors, blockIds) {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.type) || !object(value.settings)) {
    errors.push("Invalid editor block");
    return false;
  }
  if (blockIds.has(value.id)) errors.push(`Duplicate block id: ${value.id}`);
  blockIds.add(value.id);
  for (const [key, setting] of Object.entries(value.settings)) {
    if (!settingValue(setting)) errors.push(`Invalid setting value at ${value.id}.${key}`);
  }
  return true;
}
function validateSection(value, errors, sectionIds, blockIds) {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.type)) {
    errors.push("Invalid editor section");
    return false;
  }
  const id = value.id;
  if (sectionIds.has(id)) errors.push(`Duplicate section id: ${id}`);
  sectionIds.add(id);
  if (!nonEmptyString(value.name) || typeof value.hidden !== "boolean" || typeof value.locked !== "boolean") {
    errors.push(`Invalid section metadata: ${id}`);
  }
  if (!object(value.settings)) errors.push(`Invalid section settings: ${id}`);
  else for (const [key, setting] of Object.entries(value.settings)) {
    if (!settingValue(setting)) errors.push(`Invalid setting value at ${id}.${key}`);
  }
  if (!styleSettings(value.style)) errors.push(`Invalid style settings in section: ${id}`);
  if (!responsiveSettings(value.responsive)) errors.push(`Invalid responsive settings in section: ${id}`);
  if (!Array.isArray(value.blocks)) errors.push(`Invalid blocks in section: ${id}`);
  else value.blocks.forEach((block) => validateBlock(block, errors, blockIds));
  if (unsafeCustomCode(value)) errors.push(`Unsafe custom code in section: ${id}`);
  return true;
}
function validatePage(value, errors, pageIds, sectionIds, blockIds) {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.slug) || !Array.isArray(value.sections)) {
    errors.push("Invalid editor page");
    return false;
  }
  if (pageIds.has(value.id)) errors.push(`Duplicate page id: ${value.id}`);
  pageIds.add(value.id);
  value.sections.forEach((section) => validateSection(section, errors, sectionIds, blockIds));
  return true;
}
function validateAsset(value, errors, assetIds) {
  if (!object(value) || !nonEmptyString(value.id) || !ASSET_TYPES.has(String(value.type)) || !nonEmptyString(value.url)) {
    errors.push("Invalid asset reference");
    return false;
  }
  if (assetIds.has(value.id)) errors.push(`Duplicate asset id: ${value.id}`);
  assetIds.add(value.id);
  if (value.alt !== void 0 && typeof value.alt !== "string") errors.push(`Invalid asset alt: ${value.id}`);
  return true;
}
function validTheme(value) {
  if (!object(value)) return false;
  return ["background", "surface", "ink", "muted", "accent"].every((key) => typeof value[key] === "string") && ["sans", "serif", "condensed"].includes(String(value.display)) && ["none", "soft", "round"].includes(String(value.radius));
}
function validateEditorDocument(value) {
  const errors = [];
  if (!object(value)) return { ok: false, errors: ["Editor document must be an object"] };
  if (value.version !== 2) errors.push("Unsupported editor document version");
  if (!nonEmptyString(value.name)) errors.push("Editor document name is required");
  if (typeof value.path !== "string" || !value.path.startsWith("/")) errors.push("Editor document path must start with /");
  if (!PAGE_KINDS.has(String(value.kind))) errors.push("Invalid editor document kind");
  if (value.templateId !== void 0 && value.templateId !== null && !nonEmptyString(value.templateId)) errors.push("Invalid editor document template id");
  if (value.templateVersion !== void 0 && (typeof value.templateVersion !== "number" || !Number.isInteger(value.templateVersion) || value.templateVersion < 1)) errors.push("Invalid editor document template version");
  if (!validTheme(value.theme)) errors.push("Invalid editor document theme");
  const pageIds = /* @__PURE__ */ new Set();
  const sectionIds = /* @__PURE__ */ new Set();
  const blockIds = /* @__PURE__ */ new Set();
  const assetIds = /* @__PURE__ */ new Set();
  if (!Array.isArray(value.pages) || value.pages.length === 0) errors.push("Editor document needs at least one page");
  else value.pages.forEach((page) => validatePage(page, errors, pageIds, sectionIds, blockIds));
  if (!Array.isArray(value.assets)) errors.push("Editor document assets must be an array");
  else value.assets.forEach((asset) => validateAsset(asset, errors, assetIds));
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// src/editor/document.ts
function isEditorDocument(value) {
  return validateEditorDocument(value).ok;
}

// src/dashboard/home-model.ts
var MEDIA_KEY = /(image|media|poster|thumbnail)/i;
var TYPE_LABEL = {
  sell: "Page produit",
  write: "Page \xE9ditoriale",
  blank: "Page sur mesure"
};
var STATUS = {
  draft: { statusLabel: "Brouillon", statusTone: "neutral" },
  published_hosted: { statusLabel: "Pr\xEAte", statusTone: "ready" },
  published_shopify: { statusLabel: "Publi\xE9e sur Shopify", statusTone: "live" }
};
function validMedia(value) {
  return typeof value === "string" && (value.startsWith("https:") || value.startsWith("data:image/"));
}
function findMedia(value, parentKey = "") {
  if (MEDIA_KEY.test(parentKey) && validMedia(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMedia(item, parentKey);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = findMedia(item, key);
      if (found) return found;
    }
  }
  return null;
}
function projectPreviewImage(page) {
  const document2 = page.document;
  if (isEditorDocument(document2)) {
    const asset = Array.isArray(document2.assets) ? document2.assets.find((candidate) => candidate?.type === "image" && validMedia(candidate.url)) : void 0;
    const sections = Array.isArray(document2.pages) ? document2.pages.flatMap((candidate) => Array.isArray(candidate?.sections) ? candidate.sections : []) : [];
    return asset?.url ?? findMedia(sections);
  }
  if (!document2 || typeof document2 !== "object" || Array.isArray(document2)) return null;
  return findMedia(document2.sections);
}
function updatedLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "R\xE9cemment modifi\xE9e";
  return `Modifi\xE9e le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)}`;
}
function dashboardHomeModel(input) {
  const firstName = input.userName?.trim().split(/\s+/)[0];
  const projects = [...input.pages].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 6).map((page) => ({
    id: page.id,
    name: page.name,
    slug: page.slug,
    type: page.type,
    typeLabel: TYPE_LABEL[page.type],
    status: page.status,
    ...STATUS[page.status],
    previewImage: projectPreviewImage(page),
    updatedAt: page.updatedAt,
    updatedLabel: updatedLabel(page.updatedAt)
  }));
  return {
    greeting: firstName ? `Bonjour ${firstName}` : "Bonjour",
    workspace: { id: input.workspace.id, name: input.workspace.name, slug: input.workspace.slug },
    totalProjects: input.pages.length,
    projects
  };
}

// src/dashboard/brand-icons.ts
function shopifyLogo(variant = "mark") {
  const className = variant === "full" ? "brand-logo brand-logo--full" : "brand-logo";
  return `<img class="${className}" src="/assets/brands/shopify.svg" alt="Shopify" loading="lazy">`;
}

// src/dashboard/creations-view.ts
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function card(project) {
  const id = escapeHtml(project.id);
  const name = escapeHtml(project.name);
  const cover = project.previewImage ? `<img src="${escapeHtml(project.previewImage)}" alt="Aper\xE7u de ${name}" loading="lazy">` : `<div class="creation-cover--fallback"><small>${escapeHtml(project.typeLabel)}</small><strong>${name}</strong><span>weflo.</span></div>`;
  return `<article class="creation-card" data-project-id="${id}">
    <button class="creation-cover" data-command="preview" aria-label="Pr\xE9visualiser ${name}">${cover}<span class="cover-action">Voir l\u2019aper\xE7u</span></button>
    <div class="creation-meta"><div><span class="creation-status ${project.statusTone}">${escapeHtml(project.statusLabel)}</span><h2>${name}</h2><p>${escapeHtml(project.typeLabel)} \xB7 ${escapeHtml(project.updatedLabel)}</p></div>
      <details><summary aria-label="Actions pour ${name}">\u2022\u2022\u2022</summary><div class="creation-menu"><button data-command="preview">Aper\xE7u</button><button data-command="edit">Modifier</button><button data-command="duplicate">Dupliquer</button><button data-command="rename">Renommer</button><button data-command="copy">Copier le lien</button><button class="danger" data-command="delete">Supprimer</button></div></details>
    </div></article>`;
}
function renderCreationsView(model) {
  return `<div class="workspace-shell">
    <aside class="workspace-sidebar"><a class="wordmark" href="/dashboard">weflo<span>.</span></a><nav>
      <a href="/dashboard">\u2302 <span>Accueil</span></a><a class="is-active" href="/creations">\u25A3 <span>Mes cr\xE9ations</span><b>${model.totalProjects}</b></a><a href="/studio">\u2726 <span>Studio images</span></a><a href="/boutique"><span class="nav-shopify">${shopifyLogo()}</span><span>Ma boutique</span></a><a href="/facturation">\u25C8 <span>Abonnement</span></a>
    </nav><div class="sidebar-foot"><a href="/parrainage">\u2667 <span>Parrainage</span></a><a href="/facturation">\u2699 <span>R\xE9glages</span></a><p><strong>${escapeHtml(model.workspace.name)}</strong><small>Ton espace</small></p></div></aside>
    <main class="creations-main"><header><div><p class="eyebrow">BIBLIOTH\xC8QUE</p><h1>Mes cr\xE9ations</h1><p>Retrouve, pr\xE9visualise et publie toutes tes pages.</p></div><a class="primary-cta" href="/creer">\uFF0B Nouvelle cr\xE9ation</a></header>
      <section class="library-tools"><label><span>\u2315</span><input type="search" placeholder="Rechercher une cr\xE9ation\u2026" data-creation-search></label><div><button class="is-active" data-filter="all">Toutes</button><button data-filter="sell">Pages produit</button><button data-filter="write">\xC9ditorial</button><button data-filter="blank">Sur mesure</button></div></section>
      <section class="creation-grid" data-creation-grid>${model.projects.length ? model.projects.map(card).join("") : `<a class="creation-empty" href="/creer"><span>\uFF0B</span><strong>Cr\xE9e ta premi\xE8re boutique</strong><small>Importe un produit ou pars d\u2019une page vierge.</small></a>`}</section>
    </main></div>`;
}

// src/dashboard/preview-dialog.ts
function escapeHtml2(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderPreviewDialog(input) {
  return `<dialog class="preview-dialog" data-preview-dialog aria-label="Aper\xE7u de ${escapeHtml2(input.name)}">
    <header><div><span class="preview-live-dot"></span><strong>${escapeHtml2(input.name)}</strong><small>Aper\xE7u boutique</small></div><div class="preview-tools">
      <button class="is-active" data-preview-size="desktop" aria-label="Aper\xE7u ordinateur">Ordinateur</button>
      <button data-preview-size="mobile" aria-label="Aper\xE7u mobile">Mobile</button>
      <a href="${escapeHtml2(input.url)}" target="_blank" rel="noreferrer" data-preview-fullscreen>Plein \xE9cran \u2197</a>
      <button data-preview-close aria-label="Fermer l\u2019aper\xE7u">\xD7</button>
    </div></header><div class="preview-stage"><iframe src="${escapeHtml2(input.url)}" title="Aper\xE7u de ${escapeHtml2(input.name)}"></iframe></div>
  </dialog>`;
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

// src/hydrate/creations.ts
async function api(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Erreur ${response.status}`);
  return response.status === 204 ? void 0 : await response.json();
}
function toast(message) {
  const node = document.createElement("div");
  node.className = "creation-toast";
  node.textContent = message;
  document.body.append(node);
  window.setTimeout(() => node.remove(), 2200);
}
async function start() {
  const me = await guardSession();
  if (!me) return;
  const root = document.querySelector("#creations-app");
  if (!root) return;
  let data = await api("/api/pages");
  const render = () => {
    const model = dashboardHomeModel({ pages: data.pages, workspace: data.workspace, userName: me.name });
    root.innerHTML = renderCreationsView({ ...model, projects: data.pages.map((page) => dashboardHomeModel({ pages: [page], workspace: data.workspace, userName: me.name }).projects[0]) });
    bind();
  };
  const reload = async () => {
    data = await api("/api/pages");
    render();
  };
  const openPreview = (page, trigger) => {
    document.body.insertAdjacentHTML("beforeend", renderPreviewDialog({ url: `/s/${data.workspace.slug}/${page.slug}`, name: page.name }));
    const dialog = document.querySelector("[data-preview-dialog]");
    dialog.showModal();
    const close = () => {
      dialog.close();
      dialog.remove();
      trigger.focus();
    };
    dialog.querySelector("[data-preview-close]")?.addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    for (const button of dialog.querySelectorAll("[data-preview-size]")) button.addEventListener("click", () => {
      dialog.classList.toggle("is-mobile", button.dataset.previewSize === "mobile");
      dialog.querySelectorAll("[data-preview-size]").forEach((item) => item.classList.toggle("is-active", item === button));
    });
  };
  const bind = () => {
    const cards = [...root.querySelectorAll("[data-project-id]")];
    const filter = () => {
      const query = root.querySelector("[data-creation-search]")?.value.trim().toLowerCase() ?? "";
      const type = root.querySelector("[data-filter].is-active")?.dataset.filter ?? "all";
      cards.forEach((card2) => {
        const page = data.pages.find((item) => item.id === card2.dataset.projectId);
        card2.hidden = !page || type !== "all" && page.type !== type || !!query && !page.name.toLowerCase().includes(query);
      });
    };
    root.querySelector("[data-creation-search]")?.addEventListener("input", filter);
    root.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      root.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      filter();
    }));
    cards.forEach((card2) => card2.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const page = data.pages.find((item) => item.id === card2.dataset.projectId);
      if (!page) return;
      const command = button.dataset.command;
      if (command === "preview") openPreview(page, button);
      if (command === "edit") location.assign(`/editeur?page=${page.id}`);
      if (command === "duplicate") {
        await api(`/api/pages/${page.id}/duplicate`, { method: "POST" });
        await reload();
      }
      if (command === "rename") {
        const name = prompt("Nouveau nom", page.name)?.trim();
        if (name) {
          await api(`/api/pages/${page.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
          await reload();
        }
      }
      if (command === "copy") {
        const url = `${location.origin}/s/${data.workspace.slug}/${page.slug}`;
        try {
          await navigator.clipboard.writeText(url);
          toast("Lien copi\xE9");
        } catch {
          prompt("Copie ce lien", url);
        }
      }
      if (command === "delete" && confirm(`Supprimer \xAB ${page.name} \xBB ?`)) {
        await api(`/api/pages/${page.id}`, { method: "DELETE" });
        await reload();
      }
    })));
  };
  render();
}
void start();
