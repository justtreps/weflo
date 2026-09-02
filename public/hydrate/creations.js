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
  return findMedia(page.document.sections);
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
    <main class="creations-main"><header><div><p class="eyebrow">BIBLIOTH\xC8QUE</p><h1>Mes cr\xE9ations</h1><p>Retrouve, pr\xE9visualise et publie toutes tes pages.</p></div><a class="primary-cta" href="/start">\uFF0B Nouvelle cr\xE9ation</a></header>
      <section class="library-tools"><label><span>\u2315</span><input type="search" placeholder="Rechercher une cr\xE9ation\u2026" data-creation-search></label><div><button class="is-active" data-filter="all">Toutes</button><button data-filter="sell">Pages produit</button><button data-filter="write">\xC9ditorial</button><button data-filter="blank">Sur mesure</button></div></section>
      <section class="creation-grid" data-creation-grid>${model.projects.length ? model.projects.map(card).join("") : `<a class="creation-empty" href="/start"><span>\uFF0B</span><strong>Cr\xE9e ta premi\xE8re boutique</strong><small>Importe un produit ou pars d\u2019une page vierge.</small></a>`}</section>
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
