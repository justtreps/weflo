// src/lib/chips.ts
function chipIf(btn) {
  return btn.closest("sc-if");
}
function chipLabel(btn) {
  return btn.querySelector("span")?.textContent?.trim() ?? btn.textContent?.trim() ?? "";
}
function groupChips(buttons) {
  const groups = /* @__PURE__ */ new Map();
  for (const btn of buttons) {
    const label = chipLabel(btn);
    if (!label) continue;
    const wrap = chipIf(btn);
    if (!wrap) continue;
    const existing = groups.get(label);
    if (!existing) groups.set(label, { selected: wrap, idle: wrap });
    else existing.idle = wrap;
  }
  return groups;
}
function paintChip(groups, active, setIf) {
  for (const [label, pair] of groups) {
    const on = label === active;
    if (pair.selected === pair.idle) {
      setIf(pair.selected, true);
      continue;
    }
    setIf(pair.selected, on);
    setIf(pair.idle, !on);
  }
}

// src/lib/page-filters.ts
function pageMatchesChip(page, chip) {
  const name = page.name.toLowerCase();
  switch (chip) {
    case "Tout":
      return true;
    case "Produit":
      return page.type === "sell" && !/landing|accueil|home/i.test(name);
    case "Landing":
      return page.type === "sell" && /landing/i.test(name);
    case "Accueil":
      return page.type === "blank" || /accueil|home/i.test(name);
    case "Advertorial":
      return page.type === "write" && /advertorial|adv/i.test(name);
    case "Blog":
      return page.type === "write" && !/advertorial|adv/i.test(name);
    default:
      return true;
  }
}
function filterPages(pages, chip, query) {
  const q = query.trim().toLowerCase();
  return pages.filter((page) => {
    if (!pageMatchesChip(page, chip)) return false;
    if (!q) return true;
    return page.name.toLowerCase().includes(q) || page.type.toLowerCase().includes(q);
  });
}
function sortPages(pages, sortBy, desc) {
  const dir = desc ? -1 : 1;
  return [...pages].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "fr") * dir;
    if (sortBy === "type") return a.type.localeCompare(b.type) * dir;
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
  });
}

// src/hydrate/app-chrome.ts
var NAV_HREF = {
  Accueil: "/dashboard",
  Pages: "/dashboard",
  "Mon abonnement": "/facturation",
  Facturation: "/facturation",
  R\u00E9glages: "/facturation",
  "R\xE9glages de l'espace": "/facturation",
  "R\xE9glages du compte": "/facturation",
  "Partager et gagner": "/parrainage",
  Parrainage: "/parrainage",
  "Back to app": "/dashboard"
};
var NAV_LABELS = ["Accueil", "Mon abonnement", "Parrainage", "R\xE9glages"];
var PATH_ACTIVE = {
  "/dashboard": ["Accueil"],
  "/parrainage": ["Parrainage"],
  "/facturation": ["Mon abonnement"]
};
var MOCKUP_HREF = {
  "buildstore-parrainage.html": "/parrainage",
  "facturation.dc.html": "/facturation",
  "buildstore dashboard.dc.html": "/dashboard",
  "buildstore-dashboard.html": "/dashboard"
};
var NAV_ITEM_HREFS = ["/dashboard", "/facturation", "/parrainage", "/facturation"];
function resolveNavHref(label) {
  return NAV_HREF[label.trim()] ?? null;
}
function rewriteMockupHref(href) {
  const raw = href.trim();
  const file = raw.split(/[?#]/)[0].split("/").pop()?.toLowerCase() ?? "";
  return MOCKUP_HREF[file] ?? raw;
}
function setScIf(el, open) {
  if (!el) return;
  el.removeAttribute("hidden");
  el.style.setProperty("display", open ? "block" : "none", "important");
}
function workspaceCaption(name) {
  const title = name.trim() || "Espace";
  if (title.toLowerCase() === "espace") return { title, subtitle: "Ton espace" };
  return { title, subtitle: `Espace ${title}` };
}
function activeNavLabels(path) {
  const clean = path.split(/[?#]/)[0];
  return PATH_ACTIVE[clean] ?? [];
}
function fillProfile(me, root = document) {
  const { title, subtitle } = workspaceCaption(me.workspace.name);
  const userToggle = root.querySelector('[sc-camel-on-click="{{ toggleUser }}"]');
  const userGrid = userToggle?.querySelector("div[style*='display: grid']");
  const userSpans = userGrid?.querySelectorAll("span");
  if (userSpans?.[0]) userSpans[0].textContent = me.name?.trim() || me.email;
  if (userSpans?.[1]) userSpans[1].textContent = me.email;
  const initial = userToggle?.querySelector("span[style*='PP Editorial']");
  if (initial) initial.textContent = (me.name?.trim() || me.email).charAt(0).toUpperCase();
  const wsToggle = root.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]');
  const wsGrid = wsToggle?.querySelector("div[style*='display: grid']");
  const wsSpans = wsGrid?.querySelectorAll("span");
  if (wsSpans?.[0]) wsSpans[0].textContent = title;
  if (wsSpans?.[1]) wsSpans[1].textContent = subtitle;
  const wsMenu = root.querySelector('sc-if[value="{{ workspaceOpen }}"]');
  const wsCurrent = wsMenu?.querySelector("span[style*='flex: 1']");
  if (wsCurrent) wsCurrent.textContent = title;
  const wsNameInput = root.querySelector('[sc-camel-on-change="{{ onWsName }}"]');
  if (wsNameInput && (!wsNameInput.value || wsNameInput.value.includes("{{") || wsNameInput.value === "ACAI")) {
    wsNameInput.value = title;
  }
  const siteNameInput = root.querySelector('[sc-camel-on-change="{{ onSiteName }}"]');
  if (siteNameInput && (!siteNameInput.value || siteNameInput.value.includes("{{") || siteNameInput.value === "ACAI")) {
    siteNameInput.value = title;
  }
}
function navIfChildren(group) {
  const scoped = [...group.querySelectorAll(":scope > sc-if")];
  if (scoped.length) return scoped;
  return [...group.children].filter((el) => el.tagName.toLowerCase() === "sc-if");
}
function paintActiveNav(currentPath, root = document) {
  const wanted = new Set(activeNavLabels(currentPath));
  for (const group of root.querySelectorAll('sc-for[list="{{ navItems }}"]')) {
    const kids = navIfChildren(group);
    for (let i = 0; i + 1 < kids.length; i += 2) {
      const label = kids[i].querySelector("span")?.textContent?.trim() || kids[i + 1].querySelector("span")?.textContent?.trim() || NAV_LABELS[i / 2];
      if (!label) continue;
      const on = wanted.has(label);
      setScIf(kids[i], on);
      setScIf(kids[i + 1], !on);
    }
  }
}
function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}
async function syncReferralCard(root = document, fetchFn = fetch) {
  const card = root.querySelector('sc-if[value="{{ showReferralCard }}"]');
  if (!card) return;
  try {
    const res = await fetchFn("/api/referral");
    if (!res.ok) return;
    const data = await res.json();
    for (const el of card.querySelectorAll("span")) {
      const raw = el.textContent?.trim() ?? "";
      if (raw === "0 clic" || raw === "0 clics") {
        el.textContent = `${data.clicks} clic${data.clicks === 1 ? "" : "s"}`;
      }
      if (raw === "0,00 \u20AC") {
        el.textContent = formatUsd(data.earningsUsd);
      }
    }
  } catch {
  }
}
function applyAppChrome(me, currentPath, opts = {}) {
  const root = opts.root ?? document;
  fillProfile(me, root);
  paintActiveNav(currentPath, root);
  bindAppChrome(opts);
  void syncReferralCard(root);
}
function setOpen(el, open) {
  setScIf(el, open);
}
function isShown(el) {
  if (!el) return false;
  if (el.getAttribute("hidden") != null) return false;
  return el.style.display !== "none";
}
function bindAppChrome(opts = {}) {
  const root = opts.root ?? document;
  const go = opts.go ?? ((href) => {
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    location.assign(href);
  });
  const logout = opts.logout ?? (async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.assign("/connexion");
  });
  const workspaceMenu = root.querySelector('sc-if[value="{{ workspaceOpen }}"]');
  const userMenu = root.querySelector('sc-if[value="{{ userOpen }}"]');
  const learnMenu = root.querySelector('sc-if[value="{{ learnOpen }}"]');
  const overlay = root.querySelector('sc-if[value="{{ anyOpen }}"]');
  setOpen(workspaceMenu, false);
  setOpen(userMenu, false);
  setOpen(learnMenu, false);
  setOpen(overlay, false);
  const syncOverlay = () => {
    setOpen(overlay, isShown(workspaceMenu) || isShown(userMenu) || isShown(learnMenu));
  };
  const closeMenus = () => {
    setOpen(workspaceMenu, false);
    setOpen(userMenu, false);
    setOpen(learnMenu, false);
    setOpen(overlay, false);
  };
  overlay?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
  });
  for (const a of root.querySelectorAll("a[href]")) {
    const next = rewriteMockupHref(a.getAttribute("href") ?? "");
    if (next !== a.getAttribute("href")) a.setAttribute("href", next);
  }
  const bound = /* @__PURE__ */ new Set();
  const bindGo = (el, href) => {
    if (bound.has(el)) return;
    bound.add(el);
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      go(href);
    });
  };
  for (const el of root.querySelectorAll("span, a")) {
    const label = el.textContent?.trim() ?? "";
    const href = resolveNavHref(label);
    if (!href) continue;
    const host = el.closest("[sc-camel-on-click], a") ?? el.parentElement ?? el;
    bindGo(host, href);
  }
  root.querySelectorAll('sc-for[list="{{ navItems }}"]').forEach((group) => {
    const buttons = [...group.querySelectorAll('[sc-camel-on-click="{{ item.onClick }}"]')];
    buttons.forEach((btn, i) => {
      const href = NAV_ITEM_HREFS[Math.floor(i / 2)] ?? NAV_ITEM_HREFS[i % NAV_ITEM_HREFS.length];
      bindGo(btn, href);
    });
  });
  const toggle = (menu) => {
    const open = !isShown(menu);
    closeMenus();
    if (open) {
      setOpen(menu, true);
      setOpen(overlay, true);
    }
  };
  root.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]')?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(workspaceMenu);
    }
  );
  root.querySelector('[sc-camel-on-click="{{ toggleUser }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(userMenu);
  });
  root.querySelector('[sc-camel-on-click="{{ toggleLearn }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(learnMenu);
  });
  const expanded = root.querySelector('sc-if[value="{{ expanded }}"]');
  const collapsed = root.querySelector('sc-if[value="{{ collapsed }}"]');
  if (expanded && collapsed && !expanded.dataset.wefloCollapseBound) {
    expanded.dataset.wefloCollapseBound = "1";
    setOpen(expanded, true);
    setOpen(collapsed, false);
    for (const el of root.querySelectorAll('[sc-camel-on-click="{{ toggleCollapse }}"]')) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = isShown(expanded);
        setOpen(expanded, !open);
        setOpen(collapsed, open);
      });
    }
  }
  root.querySelector('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
  });
  for (const el of root.querySelectorAll("span")) {
    if (el.textContent?.trim() !== "Se d\xE9connecter") continue;
    const host = el.closest("div") ?? el;
    host.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void logout();
    });
  }
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

// src/dashboard/home-view.ts
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function projectCard(project) {
  const name = escapeHtml(project.name);
  const preview = project.previewImage ? `<img src="${escapeHtml(project.previewImage)}" alt="Aper\xE7u de ${name}" loading="lazy">` : `<div class="page-preview-fallback"><span>${escapeHtml(project.typeLabel)}</span><strong>${name}</strong><i>weflo.</i></div>`;
  return `<article class="project-card" data-project-id="${escapeHtml(project.id)}">
    <button class="project-preview" data-project-command="open" aria-label="Ouvrir ${name}">${preview}</button>
    <div class="project-info"><div><span class="status ${project.statusTone}">${project.statusLabel}</span><h3>${name}</h3><p>${escapeHtml(project.typeLabel)} \xB7 ${escapeHtml(project.updatedLabel)}</p></div>
      <details class="project-menu"><summary aria-label="Actions pour ${name}">\u2022\u2022\u2022</summary><div><button data-project-command="open">Ouvrir</button><button data-project-command="duplicate">Dupliquer</button><button data-project-command="rename">Renommer</button><button data-project-command="copy">Copier le lien</button><button class="danger" data-project-command="delete">Supprimer</button></div></details>
    </div>
  </article>`;
}
function renderDashboardHome(model) {
  const cards = model.projects.length ? model.projects.map(projectCard).join("") : `<button class="empty-project" data-dashboard-action="generate"><span>\uFF0B</span><strong>Ta premi\xE8re boutique commence ici</strong><small>Ajoute un produit et Weflo construit chaque section.</small></button>`;
  return `<div class="shell dashboard-shell">
    <aside class="sidebar" aria-label="Navigation principale">
      <a class="brand" href="/dashboard">weflo<span>.</span></a>
      <nav class="main-nav"><a class="nav-item is-active" href="/dashboard"><span>\u2302</span>Accueil</a><a class="nav-item" href="/creations"><span>\u25A3</span>Mes cr\xE9ations <b>${model.totalProjects}</b></a><a class="nav-item" href="/studio"><span>\u2726</span>Studio images</a><a class="nav-item" href="/boutique"><span>\u25C6</span>Ma boutique</a><a class="nav-item" href="/facturation"><span>\u25C8</span>Abonnement</a></nav>
      <div class="sidebar-bottom"><a class="nav-item" href="/parrainage"><span>\u2667</span>Parrainage</a><a class="nav-item" href="/facturation"><span>\u2699</span>R\xE9glages</a><div class="profile"><span class="avatar">${escapeHtml(model.greeting.replace("Bonjour", "").trim().charAt(0) || "W")}</span><span><strong>${escapeHtml(model.workspace.name)}</strong><small>Ton espace</small></span></div></div>
    </aside>
    <main><header class="topbar"><div><p class="hello">${escapeHtml(model.greeting)}</p><p class="subhello">Transforme ton prochain produit en boutique.</p></div><a class="pro-button" href="/facturation">Passer Pro</a></header>
      <section class="creation-desk"><div class="duck" aria-hidden="true">\u{1F425}</div><div class="desk-copy"><h1>Que veux-tu vendre ?</h1><p>Donne-moi un produit. Je m\u2019occupe de l\u2019offre, des mots et de la boutique.</p></div>
        <form class="prompt" data-dashboard-prompt><textarea aria-label="D\xE9crire le produit ou coller son lien" placeholder="Colle un lien produit ou d\xE9cris ce que tu veux vendre\u2026"></textarea><div class="prompt-footer"><span>Amazon, AliExpress, Shopify ou n\u2019importe quel site</span><button type="submit" data-dashboard-action="generate">G\xE9n\xE9rer ma boutique <span>\u2197</span></button></div></form>
        <div class="start-modes"><button data-dashboard-action="link"><span>\u2197</span><strong>Importer un lien</strong><small>Produit et images</small></button><button data-dashboard-action="image"><span>\u25A7</span><strong>Ajouter une image</strong><small>On reconna\xEEt le produit</small></button><button data-dashboard-action="shopify"><span class="shopify-brand">${shopifyLogo()}</span><strong>Depuis Shopify</strong><small>Choisir dans le catalogue</small></button><button data-dashboard-action="blank"><span>\uFF0B</span><strong>Partir de z\xE9ro</strong><small>Une page vraiment vierge</small></button></div>
      </section>
      <section class="projects" id="creations"><div class="section-heading"><div><h2>Mes cr\xE9ations</h2><p>Reprends l\xE0 o\xF9 tu t\u2019es arr\xEAt\xE9.</p></div><a href="/creations">Tout afficher \u2192</a></div><div class="project-shelf">${cards}</div></section>
      <section class="workbench"><div class="next-actions"><div class="section-heading compact"><div><h2>Le prochain geste</h2><p>Publie sans casser ton th\xE8me Shopify.</p></div></div><button class="task-row" data-dashboard-action="shopify"><span class="task-icon shopify-brand">${shopifyLogo()}</span><span><strong>Connecter Shopify</strong><small>Choisir le th\xE8me au moment de publier</small></span><b>Configurer \u2192</b></button><button class="task-row" data-dashboard-action="generate"><span class="task-icon">Aa</span><span><strong>Cr\xE9er une nouvelle offre</strong><small>Canardo adapte le message au produit</small></span><b>Commencer \u2192</b></button></div>
        <aside class="shopify-card"><span class="shopify-brand large">${shopifyLogo()}</span><p class="mini-title">Publication Shopify</p><h2>Ta boutique, dans ton vrai th\xE8me.</h2><p>Sections modifiables, copie s\xE9curis\xE9e et retour arri\xE8re inclus.</p><button data-dashboard-action="shopify">Connecter ma boutique</button></aside></section>
    </main></div>
    <nav class="mobile-nav"><a href="/dashboard">\u2302<span>Accueil</span></a><a href="/creations">\u25A3<span>Cr\xE9ations</span></a><a href="/studio">\u2726<span>Studio</span></a><a href="/boutique">\u25C6<span>Boutique</span></a><a href="/facturation">\u2699<span>R\xE9glages</span></a></nav>`;
}

// src/create/workspace.ts
function creationActionUrl(action, prompt = "") {
  if (action === "link") return "/creer?source=link";
  if (action === "image") return "/creer?source=image";
  if (action === "blank") return "/creer?format=blank";
  return prompt ? `/creer?source=description&prompt=${encodeURIComponent(prompt)}` : "/creer";
}

// src/hydrate/dashboard.ts
var TYPE_LABEL2 = {
  sell: "Page produit",
  write: "Article de blog",
  blank: "Page vierge"
};
var DEFAULT_NAME = {
  sell: "Page produit",
  write: "Article de blog",
  blank: "Page vierge"
};
function formatEdited(iso) {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 6e4));
  if (mins < 1) return "\xE0 l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "il y a 1 h" : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(iso).toLocaleDateString("fr-FR");
}
function showToast(text, href) {
  const toastIf = document.querySelector('sc-if[value="{{ toastOn }}"]');
  const box = toastIf?.querySelector("div");
  const label = box?.querySelectorAll("span")[1];
  if (label) label.textContent = text;
  toastIf?.querySelector("[data-credits-cta]")?.remove();
  if (href && box) {
    const link = document.createElement("a");
    link.dataset.creditsCta = "1";
    link.href = href;
    link.textContent = "Ajouter des cr\xE9dits";
    link.style.color = "#FBC531";
    box.appendChild(link);
  }
  if (toastIf) toastIf.style.display = "block";
  window.setTimeout(() => {
    if (toastIf) toastIf.style.display = "none";
  }, href ? 3600 : 2200);
}
function setChatOpen(open) {
  const closed = document.querySelector('sc-if[value="{{ chatClosed }}"]');
  const opened = document.querySelector('sc-if[value="{{ chatOpen }}"]');
  setScIf(closed, !open);
  if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
}
function appendChat(text, mine) {
  const list = document.querySelector('sc-for[list="{{ chatMsgs }}"]');
  if (!list) return;
  const row = document.createElement("div");
  row.style.cssText = `display:flex;align-items:flex-end;gap:8px;justify-content:${mine ? "flex-end" : "flex-start"}`;
  const bubble = document.createElement("div");
  bubble.textContent = text;
  bubble.style.cssText = mine ? "max-width:78%;padding:10px 13px;box-sizing:border-box;border-radius:14px;background:#141310;color:#fff;font-size:14px;line-height:20px" : "max-width:78%;padding:10px 13px;box-sizing:border-box;border-radius:14px;background:#fff;color:#404040;border:0.5px solid rgba(82,82,82,0.22);font-size:14px;line-height:20px";
  row.appendChild(bubble);
  list.appendChild(row);
}
function previewUrl(workspace, page) {
  return `${location.origin}/s/${workspace.slug}/${page.slug}`;
}
async function json(input, init) {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(String(res.status));
  if (res.status === 204) return void 0;
  return await res.json();
}
function goEditor(pageId, prompt) {
  if (prompt) sessionStorage.setItem("weflo-canardo-prompt", prompt);
  location.assign("/editeur?page=" + pageId);
}
async function createAndOpen(type, name = DEFAULT_NAME[type]) {
  const page = await json("/api/pages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, name })
  });
  goEditor(page.id);
}
var CREATE_TYPE = {
  "Page produit": "sell",
  "Landing page": "sell",
  "Page d'accueil": "blank",
  Advertorial: "write",
  "Article de blog": "write",
  "Page vierge": "blank"
};
function bindCreateMenu() {
  const menu = document.querySelector('sc-if[value="{{ newPageOpen }}"]');
  setScIf(menu, false);
  const cta = document.querySelector('[sc-camel-on-click="{{ onNewPage }}"]');
  cta?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!menu) {
      void createAndOpen("sell");
      return;
    }
    const open = menu.style.display !== "none";
    setScIf(menu, !open);
  });
  for (const el of menu?.querySelectorAll('[sc-camel-on-click="{{ opt.onClick }}"]') ?? []) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const type = CREATE_TYPE[label];
    if (!type) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void createAndOpen(type, label);
    });
  }
}
function bindRow(rowEl, page, workspace, reload) {
  const cols = [...rowEl.children];
  const nameCol = cols[0];
  const editedCol = cols[1];
  const typeCol = cols[2];
  const nameBtn = nameCol?.querySelector('[sc-camel-on-click="{{ row.onOpen }}"]');
  if (nameBtn) nameBtn.textContent = page.name;
  if (editedCol) editedCol.textContent = formatEdited(page.updatedAt);
  const typeSpan = typeCol?.querySelector("span");
  if (typeSpan) typeSpan.textContent = TYPE_LABEL2[page.type] ?? page.type;
  const published = page.status !== "draft";
  const pubIf = nameCol?.querySelector('sc-if[value="{{ row.published }}"]');
  if (pubIf) pubIf.style.display = published ? "" : "none";
  const renameIf = nameCol?.querySelector('sc-if[value="{{ row.renaming }}"]');
  const notRenameIf = nameCol?.querySelector('sc-if[value="{{ row.notRenaming }}"]');
  const renameInput = nameCol?.querySelector("input");
  const menuIf = rowEl.querySelector('sc-if[value="{{ row.menuOpen }}"]');
  if (renameIf) renameIf.style.display = "none";
  if (menuIf) menuIf.style.display = "none";
  const open = () => {
    location.assign("/editeur?page=" + page.id);
  };
  const startRename = (e) => {
    e.stopPropagation();
    if (menuIf) menuIf.style.display = "none";
    if (notRenameIf) notRenameIf.style.display = "none";
    if (renameIf) renameIf.style.display = "";
    if (renameInput) {
      renameInput.value = page.name;
      renameInput.focus();
      renameInput.select();
    }
  };
  const commitRename = async () => {
    const next = renameInput?.value.trim() || page.name;
    if (next !== page.name) {
      await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: next })
      });
    }
    await reload();
  };
  renameInput?.addEventListener("click", (e) => e.stopPropagation());
  renameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    }
    if (e.key === "Escape") void reload();
  });
  renameInput?.addEventListener("blur", () => {
    void commitRename();
  });
  nameBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  rowEl.addEventListener("click", () => open());
  rowEl.querySelector('[sc-camel-on-click="{{ row.onMenu }}"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!menuIf) return;
    menuIf.style.display = menuIf.style.display === "none" ? "block" : "none";
  });
  for (const openEl of rowEl.querySelectorAll('[sc-camel-on-click="{{ row.onOpen }}"]')) {
    if (openEl === nameBtn) continue;
    openEl.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });
  }
  rowEl.querySelector('[sc-camel-on-click="{{ row.onDuplicate }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await fetch(`/api/pages/${page.id}/duplicate`, { method: "POST" });
    await reload();
  });
  rowEl.querySelector('[sc-camel-on-click="{{ row.onRename }}"]')?.addEventListener("click", startRename);
  rowEl.querySelector('[sc-camel-on-click="{{ row.onCopy }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const url = previewUrl(workspace, page);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Lien de pr\xE9visualisation", url);
    }
    showToast("Lien copi\xE9");
    if (menuIf) menuIf.style.display = "none";
  });
  rowEl.querySelector('[sc-camel-on-click="{{ row.onDelete }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    await reload();
  });
}
function renderRows(pages, workspace, reload) {
  const list = document.querySelector('sc-for[list="{{ rows }}"]');
  if (!list) return;
  const first = list.firstElementChild;
  if (!first) return;
  const proto = first.cloneNode(true);
  list.replaceChildren();
  for (const page of pages) {
    const row = proto.cloneNode(true);
    bindRow(row, page, workspace, reload);
    list.appendChild(row);
  }
  const empty = document.querySelector('sc-if[value="{{ isEmpty }}"]');
  setScIf(empty, pages.length === 0);
}
function bindCanardo(getPages) {
  document.querySelector('[sc-camel-on-click="{{ openChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChatOpen(true);
  });
  document.querySelector('[sc-camel-on-click="{{ closeChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChatOpen(false);
  });
  const input = document.querySelector('input[sc-camel-on-change="{{ onChatInput }}"]');
  const sendBtn = document.querySelector('[sc-camel-on-click="{{ sendChat }}"]');
  let sending = false;
  const sendPrompt = async (raw) => {
    const prompt = (raw ?? input?.value ?? "").trim();
    if (!prompt || sending) return;
    sending = true;
    appendChat(prompt, true);
    if (input) input.value = "";
    try {
      let page = getPages()[0];
      if (!page) {
        page = await json("/api/pages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "sell", name: DEFAULT_NAME.sell })
        });
      }
      goEditor(page.id, prompt);
    } catch {
      showToast("Impossible d'ouvrir l'\xE9diteur");
    } finally {
      sending = false;
    }
  };
  sendBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendPrompt();
    },
    true
  );
  input?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendPrompt();
    },
    true
  );
  for (const el of document.querySelectorAll('[sc-camel-on-click="{{ c.onPick }}"]')) {
    const label = el.textContent?.trim() ?? "";
    if (!label) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setChatOpen(true);
      void sendPrompt(label);
    });
  }
}
function bindAnnouncement() {
  const box = document.querySelector('sc-if[value="{{ showAnnouncement }}"]');
  if (!box) return;
  const slides = [
    {
      title: "Cr\xE9er une boutique en parlant",
      body: "D\xE9cris ce que tu vends, le canard monte la boutique et tu corriges une phrase \xE0 la fois.",
      link: "Par o\xF9 commencer"
    },
    {
      title: "Les tests A/B sortent de b\xEAta",
      body: "Deux versions d'une page s'affrontent, le canard d\xE9signe la gagnante en trois jours.",
      link: "Lire les notes"
    },
    {
      title: "Le parrainage paie au mois",
      body: "Chaque espace que tu am\xE8nes rapporte douze mois, tes liens d\xE9j\xE0 partag\xE9s compris.",
      link: "Voir les conditions"
    }
  ];
  const imgs = [...box.querySelectorAll("img")];
  const titleEl = box.querySelector("p");
  const bodyEl = titleEl?.nextElementSibling;
  const linkEl = bodyEl?.nextElementSibling;
  const countEl = [...box.querySelectorAll("span")].find((el) => /\d+\s*\/\s*\d+/.test(el.textContent ?? ""));
  let index = 0;
  const paint = () => {
    const slide = slides[index % slides.length];
    if (titleEl) titleEl.textContent = slide.title;
    if (bodyEl) bodyEl.textContent = slide.body;
    if (linkEl) linkEl.textContent = slide.link;
    if (countEl) countEl.textContent = `${index % slides.length + 1} / ${slides.length}`;
    imgs.forEach((img, i) => {
      img.style.display = i === index % imgs.length ? "block" : "none";
    });
  };
  document.querySelector('[sc-camel-on-click="{{ annPrev }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    index = (index - 1 + slides.length) % slides.length;
    paint();
  });
  document.querySelector('[sc-camel-on-click="{{ annNext }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    index = (index + 1) % slides.length;
    paint();
  });
  linkEl?.addEventListener("click", (e) => {
    e.preventDefault();
    if (index % slides.length === 2) location.assign("/parrainage");
    else {
      void (async () => {
        try {
          const data = await json("/api/pages");
          const page = data.pages[0] ?? await json("/api/pages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "sell", name: DEFAULT_NAME.sell })
          });
          goEditor(page.id);
        } catch {
          setChatOpen(true);
        }
      })();
    }
  });
}
function bindCoach() {
  const coach = document.querySelector('sc-if[value="{{ coachOn }}"]');
  setScIf(coach, false);
  document.querySelector('[sc-camel-on-click="{{ tutSkip }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(coach, false);
  });
}
async function hydrateDashboard() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/dashboard");
  bindCreateMenu();
  bindAnnouncement();
  bindCoach();
  let pages = [];
  let workspace = me.workspace;
  let chip = "Tout";
  let query = "";
  let sortBy = "edited";
  let desc = true;
  const home = document.querySelector("#weflo-dashboard-home");
  const mountHome = () => {
    if (!home) return;
    home.innerHTML = renderDashboardHome(dashboardHomeModel({ pages, workspace, userName: me.name }));
    home.querySelector("[data-dashboard-prompt]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = home.querySelector("textarea")?.value.trim() ?? "";
      location.assign(creationActionUrl("generate", value));
    });
    for (const button of home.querySelectorAll("[data-dashboard-action]")) {
      button.addEventListener("click", (event) => {
        const action = button.dataset.dashboardAction;
        if (action === "generate" && button.closest("form")) return;
        event.preventDefault();
        if (action === "generate" || action === "link") location.assign(creationActionUrl(action));
        if (action === "image") location.assign(creationActionUrl("image"));
        if (action === "shopify") location.assign("/facturation#shopify");
        if (action === "blank") location.assign(creationActionUrl("blank"));
        if (action === "all") home.querySelector("#creations")?.scrollIntoView({ behavior: "smooth" });
      });
    }
    for (const card of home.querySelectorAll("[data-project-id]")) {
      const page = pages.find((item) => item.id === card.dataset.projectId);
      if (!page) continue;
      for (const button of card.querySelectorAll("[data-project-command]")) {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const command = button.dataset.projectCommand;
          if (command === "open") goEditor(page.id);
          if (command === "duplicate") {
            await fetch(`/api/pages/${page.id}/duplicate`, { method: "POST" });
            await reload();
          }
          if (command === "rename") {
            const name = window.prompt("Nouveau nom", page.name)?.trim();
            if (name) {
              await fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
              await reload();
            }
          }
          if (command === "copy") {
            const url = previewUrl(workspace, page);
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              window.prompt("Lien de pr\xE9visualisation", url);
            }
            showToast("Lien copi\xE9");
          }
          if (command === "delete" && window.confirm(`Supprimer \xAB ${page.name} \xBB ?`)) {
            await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
            await reload();
          }
        });
      }
    }
  };
  const groups = groupChips(document.querySelectorAll('[sc-camel-on-click="{{ chip.onClick }}"]'));
  paintChip(groups, chip, setScIf);
  const hasQueryIf = document.querySelector('sc-if[value="{{ hasQuery }}"]');
  const sortLabel = document.querySelector('[sc-camel-on-click="{{ toggleSort }}"] span');
  const dirLabel = document.querySelector('[sc-camel-on-click="{{ toggleDirection }}"] span');
  const paint = () => {
    setScIf(hasQueryIf, query.trim().length > 0);
    if (sortLabel) {
      sortLabel.textContent = sortBy === "name" ? "Nom" : sortBy === "type" ? "Type" : "Modifi\xE9 r\xE9cemment";
    }
    if (dirLabel) dirLabel.textContent = desc ? "D\xE9croissant" : "Croissant";
    const visible = sortPages(filterPages(pages, chip, query), sortBy, desc);
    renderRows(visible, workspace, reload);
  };
  const reload = async () => {
    const data = await json("/api/pages");
    pages = data.pages;
    workspace = data.workspace;
    fillProfile({ ...me, workspace: data.workspace });
    mountHome();
    paint();
  };
  for (const btn of document.querySelectorAll('[sc-camel-on-click="{{ chip.onClick }}"]')) {
    const label = btn.querySelector("span")?.textContent?.trim();
    if (!label) continue;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip = label;
      paintChip(groups, chip, setScIf);
      paint();
    });
  }
  const search = document.querySelector('input[sc-camel-on-change="{{ onQuery }}"]');
  search?.addEventListener("input", () => {
    query = search.value;
    paint();
  });
  document.querySelector('[sc-camel-on-click="{{ clearQuery }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    if (search) search.value = "";
    query = "";
    paint();
  });
  const sortMenu = document.querySelector('sc-if[value="{{ sortOpen }}"]');
  setScIf(sortMenu, false);
  document.querySelector('[sc-camel-on-click="{{ toggleSort }}"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    setScIf(sortMenu, sortMenu?.style.display === "none");
  });
  const applySort = (next, nextDesc = desc) => {
    sortBy = next;
    desc = nextDesc;
    setScIf(sortMenu, false);
    paint();
  };
  document.querySelector('[sc-camel-on-click="{{ sortByName }}"]')?.addEventListener("click", () => applySort("name"));
  document.querySelector('[sc-camel-on-click="{{ sortByEdited }}"]')?.addEventListener("click", () => applySort("edited"));
  document.querySelector('[sc-camel-on-click="{{ sortByType }}"]')?.addEventListener("click", () => applySort("type"));
  document.querySelector('[sc-camel-on-click="{{ toggleDirection }}"]')?.addEventListener("click", () => {
    applySort(sortBy, !desc);
  });
  const SORT_LABEL = {
    "Modifi\xE9 r\xE9cemment": "edited",
    "Date de cr\xE9ation": "edited",
    Nom: "name",
    Type: "type"
  };
  for (const el of sortMenu?.querySelectorAll('[sc-camel-on-click="{{ opt.onClick }}"]') ?? []) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const next = SORT_LABEL[label];
    if (!next) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      applySort(next);
    });
  }
  document.querySelector('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(sortMenu, false);
    setScIf(document.querySelector('sc-if[value="{{ newPageOpen }}"]'), false);
  });
  bindCanardo(() => pages);
  mountHome();
  await reload();
}
void hydrateDashboard();
export {
  hydrateDashboard
};
