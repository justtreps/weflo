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

// public/template-previews/manifest.json
var manifest_default = {
  "store-editorial-commerce": {
    desktop: "/template-previews/store-editorial-commerce-desktop.webp",
    mobile: "/template-previews/store-editorial-commerce-mobile.webp",
    desktopHash: "bbbe4b41dc286791",
    mobileHash: "251bc0ae18dee1c2",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "store-conversion-modern": {
    desktop: "/template-previews/store-conversion-modern-desktop.webp",
    mobile: "/template-previews/store-conversion-modern-mobile.webp",
    desktopHash: "0e24241dc5fdb293",
    mobileHash: "71fb7e58b95dfda8",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "store-maison-premium": {
    desktop: "/template-previews/store-maison-premium-desktop.webp",
    mobile: "/template-previews/store-maison-premium-mobile.webp",
    desktopHash: "185697fc4c948357",
    mobileHash: "2a57c2b9dc8ddb15",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "product-buybox-premium": {
    desktop: "/template-previews/product-buybox-premium-desktop.webp",
    mobile: "/template-previews/product-buybox-premium-mobile.webp",
    desktopHash: "8b22de9e8f11da3f",
    mobileHash: "d34b5d21ec509f4b",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "product-demonstration": {
    desktop: "/template-previews/product-demonstration-desktop.webp",
    mobile: "/template-previews/product-demonstration-mobile.webp",
    desktopHash: "903993c4dfc4410f",
    mobileHash: "5194babf7f014ea1",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "product-bundle-first": {
    desktop: "/template-previews/product-bundle-first-desktop.webp",
    mobile: "/template-previews/product-bundle-first-mobile.webp",
    desktopHash: "e82d67002dd60ac3",
    mobileHash: "106cd6d729bad03d",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "landing-direct-response": {
    desktop: "/template-previews/landing-direct-response-desktop.webp",
    mobile: "/template-previews/landing-direct-response-mobile.webp",
    desktopHash: "d280f11bd0354413",
    mobileHash: "6a6fa0edcae19c5a",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "landing-editorial-premium": {
    desktop: "/template-previews/landing-editorial-premium-desktop.webp",
    mobile: "/template-previews/landing-editorial-premium-mobile.webp",
    desktopHash: "4f467a248ab4c8a6",
    mobileHash: "f11ce0a6fbaa9db9",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "landing-visual-demo": {
    desktop: "/template-previews/landing-visual-demo-desktop.webp",
    mobile: "/template-previews/landing-visual-demo-mobile.webp",
    desktopHash: "7ec1893917ae577a",
    mobileHash: "76fe3b1f27738d6f",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "advertorial-journal": {
    desktop: "/template-previews/advertorial-journal-desktop.webp",
    mobile: "/template-previews/advertorial-journal-mobile.webp",
    desktopHash: "e4c34ad60bb3cd97",
    mobileHash: "de5689e6c5c27cde",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "advertorial-founder-story": {
    desktop: "/template-previews/advertorial-founder-story-desktop.webp",
    mobile: "/template-previews/advertorial-founder-story-mobile.webp",
    desktopHash: "9c63bd132c0affbb",
    mobileHash: "51dded105ea9dc2a",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "advertorial-comparison": {
    desktop: "/template-previews/advertorial-comparison-desktop.webp",
    mobile: "/template-previews/advertorial-comparison-mobile.webp",
    desktopHash: "1195772356c08de3",
    mobileHash: "9b6bd4e8ab510086",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "quiz-diagnostic": {
    desktop: "/template-previews/quiz-diagnostic-desktop.webp",
    mobile: "/template-previews/quiz-diagnostic-mobile.webp",
    desktopHash: "37ad7330f8f77b86",
    mobileHash: "4bafc18876f3efaa",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "quiz-routine": {
    desktop: "/template-previews/quiz-routine-desktop.webp",
    mobile: "/template-previews/quiz-routine-mobile.webp",
    desktopHash: "6788734360bcbcd3",
    mobileHash: "95237377f31dd5e5",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "quiz-recommendation": {
    desktop: "/template-previews/quiz-recommendation-desktop.webp",
    mobile: "/template-previews/quiz-recommendation-mobile.webp",
    desktopHash: "79f3411adbc5ff82",
    mobileHash: "abade84d591d8dae",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "home-brand-editorial": {
    desktop: "/template-previews/home-brand-editorial-desktop.webp",
    mobile: "/template-previews/home-brand-editorial-mobile.webp",
    desktopHash: "5d0f6f2df94d195a",
    mobileHash: "d8c19de6b6c56873",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "home-catalogue-premium": {
    desktop: "/template-previews/home-catalogue-premium-desktop.webp",
    mobile: "/template-previews/home-catalogue-premium-mobile.webp",
    desktopHash: "66d140e6f47c4f25",
    mobileHash: "7dbed246bafc1f69",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "home-story-first": {
    desktop: "/template-previews/home-story-first-desktop.webp",
    mobile: "/template-previews/home-story-first-mobile.webp",
    desktopHash: "fe1797a08fd1e639",
    mobileHash: "54274763955ebba7",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "blog-magazine": {
    desktop: "/template-previews/blog-magazine-desktop.webp",
    mobile: "/template-previews/blog-magazine-mobile.webp",
    desktopHash: "83db75d1b262d7dd",
    mobileHash: "9f32fbeedbcbb040",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "blog-guide": {
    desktop: "/template-previews/blog-guide-desktop.webp",
    mobile: "/template-previews/blog-guide-mobile.webp",
    desktopHash: "753cf79ebab6e6a5",
    mobileHash: "58507a38d998d580",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  },
  "blog-study": {
    desktop: "/template-previews/blog-study-desktop.webp",
    mobile: "/template-previews/blog-study-mobile.webp",
    desktopHash: "893d67410f285b0d",
    mobileHash: "d179ebe1a5328e56",
    dimensions: {
      desktop: {
        width: 1440,
        height: 1100
      },
      mobile: {
        width: 390,
        height: 844
      }
    }
  }
};

// src/create/format-flow.ts
var TEMPLATE_IDS = {
  store: ["store-editorial-commerce", "store-conversion-modern", "store-maison-premium"],
  product: ["product-buybox-premium", "product-demonstration", "product-bundle-first"],
  landing: ["landing-direct-response", "landing-editorial-premium", "landing-visual-demo"],
  advertorial: ["advertorial-journal", "advertorial-founder-story", "advertorial-comparison"],
  quiz: ["quiz-diagnostic", "quiz-routine", "quiz-recommendation"],
  home: ["home-brand-editorial", "home-catalogue-premium", "home-story-first"],
  blog: ["blog-magazine", "blog-guide", "blog-study"],
  blank: []
};
var templateDetails = {
  "store-editorial-commerce": { name: "Commerce \xE9ditorial", description: "Une boutique guid\xE9e par l\u2019univers de marque.", artProfile: "editorial", sectionVariants: { hero: "editorial", collectionGrid: "curated" } },
  "store-conversion-modern": { name: "Conversion moderne", description: "Une boutique pens\xE9e pour guider rapidement vers l\u2019achat.", artProfile: "conversion", sectionVariants: { hero: "conversion", productMain: "buybox" } },
  "store-maison-premium": { name: "Maison premium", description: "Une composition raffin\xE9e pour les collections haut de gamme.", artProfile: "minimal", sectionVariants: { hero: "split", collectionGrid: "premium" } },
  "product-buybox-premium": { name: "Fiche produit premium", description: "Une fiche produit d\xE9taill\xE9e avec une offre claire.", artProfile: "conversion", sectionVariants: { productMain: "premium", reviews: "featured" } },
  "product-demonstration": { name: "D\xE9monstration produit", description: "Une fiche centr\xE9e sur l\u2019usage et les b\xE9n\xE9fices.", artProfile: "editorial", sectionVariants: { hero: "demonstration", benefits: "visual" } },
  "product-bundle-first": { name: "Offre group\xE9e", description: "Une fiche qui met les packs et quantit\xE9s en avant.", artProfile: "conversion", sectionVariants: { productMain: "bundle-led", bundle: "quantity-break" } },
  "landing-direct-response": { name: "R\xE9ponse directe", description: "Une page de campagne focalis\xE9e sur une action.", artProfile: "conversion", sectionVariants: { hero: "direct-response", cta: "repeated" } },
  "landing-editorial-premium": { name: "\xC9ditorial premium", description: "Une landing page narrative et haut de gamme.", artProfile: "editorial", sectionVariants: { hero: "editorial", imageText: "story" } },
  "landing-visual-demo": { name: "D\xE9monstration visuelle", description: "Une page qui rend le m\xE9canisme visible d\xE8s le d\xE9part.", artProfile: "minimal", sectionVariants: { hero: "visual", benefits: "diagram" } },
  "advertorial-journal": { name: "Journal", description: "Un r\xE9cit \xE9ditorial qui m\xE8ne naturellement vers l\u2019offre.", artProfile: "editorial", sectionVariants: { richText: "journal", press: "inline" } },
  "advertorial-founder-story": { name: "Histoire du fondateur", description: "Un t\xE9moignage de marque personnel et cr\xE9dible.", artProfile: "editorial", sectionVariants: { hero: "founder", richText: "narrative" } },
  "advertorial-comparison": { name: "Comparatif", description: "Une argumentation structur\xE9e autour des diff\xE9rences produit.", artProfile: "conversion", sectionVariants: { comparison: "feature-led", productMain: "inline" } },
  "quiz-diagnostic": { name: "Diagnostic", description: "Un parcours de questions pour qualifier un besoin.", artProfile: "minimal", sectionVariants: { quiz: "diagnostic", form: "stepper" } },
  "quiz-routine": { name: "Routine", description: "Un questionnaire qui compose une routine personnalis\xE9e.", artProfile: "editorial", sectionVariants: { quiz: "routine", productMain: "recommendation" } },
  "quiz-recommendation": { name: "Recommandation", description: "Un funnel qui m\xE8ne vers une recommandation utile.", artProfile: "conversion", sectionVariants: { quiz: "recommendation", cta: "result" } },
  "home-brand-editorial": { name: "\xC9ditorial de marque", description: "Une vitrine de marque riche en histoire et en collections.", artProfile: "editorial", sectionVariants: { hero: "editorial", imageText: "brand-story" } },
  "home-catalogue-premium": { name: "Catalogue premium", description: "Une page d\u2019accueil qui donne la priorit\xE9 aux collections.", artProfile: "minimal", sectionVariants: { hero: "catalogue", collectionGrid: "premium" } },
  "home-story-first": { name: "L\u2019histoire d\u2019abord", description: "Une page d\u2019accueil qui pr\xE9sente d\u2019abord le r\xE9cit de marque.", artProfile: "editorial", sectionVariants: { hero: "story", richText: "manifesto" } },
  "blog-magazine": { name: "Magazine", description: "Un article de marque avec une lecture \xE9ditoriale forte.", artProfile: "editorial", sectionVariants: { hero: "magazine", richText: "longform" } },
  "blog-guide": { name: "Guide", description: "Un contenu pratique, structur\xE9 pour \xEAtre facilement consult\xE9.", artProfile: "minimal", sectionVariants: { richText: "guide", faq: "inline" } },
  "blog-study": { name: "\xC9tude", description: "Une analyse approfondie avec preuves et sources.", artProfile: "editorial", sectionVariants: { hero: "study", press: "sources" } }
};
var generatedTemplatePreviews = manifest_default;
function template(id, format) {
  const details = templateDetails[id];
  if (!details) throw new Error(`Missing creation template details for ${id}`);
  const generated = generatedTemplatePreviews[id];
  return {
    id,
    format,
    ...details,
    previewDesktop: generated?.desktop ?? `/template-previews/${id}-desktop.webp`,
    previewMobile: generated?.mobile ?? `/template-previews/${id}-mobile.webp`
  };
}
function fields(...intake) {
  return intake;
}
var field = (id, label, placeholder, kind = "text", required = true) => ({ id, label, placeholder, kind, required });
var sources = ["link", "image", "description", "shopify"];
var FORMAT_FLOWS = [
  { id: "store", title: "Boutique compl\xE8te", description: "Accueil, produit, offre et confiance", pageType: "sell", allowedSources: sources, intake: fields(field("activity", "Activit\xE9", "Ex. soins naturels pour peaux sensibles"), field("positioning", "Positionnement", "Ce qui rend votre marque diff\xE9rente", "textarea"), field("collections", "Collections", "Ex. Visage, corps, coffrets", "list"), field("products", "Nombre de produits", "Ex. 12"), field("identity", "Identit\xE9 de marque", "Ton, univers et r\xE9f\xE9rences", "textarea"), field("objective", "Objectif", "Ex. pr\xE9senter la marque et vendre", "textarea")), templates: TEMPLATE_IDS.store.map((id) => template(id, "store")) },
  { id: "product", title: "Page produit", description: "Une fiche de vente Shopify compl\xE8te", pageType: "sell", allowedSources: sources, intake: fields(field("benefits", "B\xE9n\xE9fices", "Les b\xE9n\xE9fices essentiels", "list"), field("objections", "Objections", "Les freins \xE0 lever", "list"), field("offer", "Offre", "Prix, bundle ou garantie", "textarea"), field("variants", "Variantes", "Tailles, couleurs ou d\xE9clinaisons", "list"), field("proof", "Preuves disponibles", "\xC9tudes, certifications ou t\xE9moignages", "textarea", false)), templates: TEMPLATE_IDS.product.map((id) => template(id, "product")) },
  { id: "landing", title: "Landing page", description: "Une campagne, une promesse, une action", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("campaign", "Campagne", "Le nom ou contexte de la campagne"), field("audience", "Audience", "\xC0 qui la page doit-elle parler ?", "textarea"), field("promise", "Promesse", "Le r\xE9sultat principal propos\xE9", "textarea"), field("traffic", "Source du trafic", "Ex. Meta Ads, email, recherche"), field("cta", "Action attendue", "Ex. D\xE9couvrir l\u2019offre")), templates: TEMPLATE_IDS.landing.map((id) => template(id, "landing")) },
  { id: "advertorial", title: "Advertorial", description: "Un r\xE9cit \xE9ditorial qui m\xE8ne vers l\u2019offre", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("angle", "Angle narratif", "L\u2019id\xE9e centrale de l\u2019article", "textarea"), field("author", "Auteur", "Qui porte ce r\xE9cit ?"), field("proof", "Niveau de preuve", "\xC9tudes, exp\xE9rience ou d\xE9monstration", "textarea"), field("product", "Produit final", "Le produit ou l\u2019offre vers lequel conduire")), templates: TEMPLATE_IDS.advertorial.map((id) => template(id, "advertorial")) },
  { id: "quiz", title: "Quiz et funnel", description: "Questions, recommandation et capture", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("objective", "Objectif", "Le r\xE9sultat que doit produire le quiz", "textarea"), field("segments", "Segments", "Les profils ou besoins \xE0 distinguer", "list"), field("result", "Recommandation", "Ce que chaque profil doit recevoir", "textarea"), field("steps", "Nombre d\u2019\xE9tapes", "Ex. 5", "text", false), field("destination", "Destination des r\xE9ponses", "Ex. une recommandation produit", "textarea", false)), templates: TEMPLATE_IDS.quiz.map((id) => template(id, "quiz")) },
  { id: "home", title: "Page d\u2019accueil", description: "La vitrine compl\xE8te d\u2019une marque", pageType: "sell", allowedSources: ["description", "shopify"], intake: fields(field("brand", "Nom de la marque", "Le nom affich\xE9 sur votre page"), field("activity", "Activit\xE9", "Ex. objets durables pour la maison"), field("promise", "Promesse", "La promesse principale de la marque", "textarea"), field("collections", "Collections principales", "Ex. Nouveaut\xE9s, best-sellers, cadeaux", "list"), field("story", "Histoire de la marque", "Ce que vous voulez raconter", "textarea")), templates: TEMPLATE_IDS.home.map((id) => template(id, "home")) },
  { id: "blog", title: "Article de blog", description: "Contenu de marque structur\xE9 et lisible", pageType: "write", allowedSources: ["description", "shopify"], intake: fields(field("topic", "Sujet", "Le th\xE8me de l\u2019article"), field("intent", "Intention de recherche", "La question \xE0 laquelle r\xE9pondre", "textarea"), field("angle", "Angle", "Votre point de vue ou approche", "textarea"), field("relatedProducts", "Produits li\xE9s", "Les produits \xE0 citer si n\xE9cessaire", "list", false)), templates: TEMPLATE_IDS.blog.map((id) => template(id, "blog")) },
  { id: "blank", title: "Page vierge", description: "Construire librement dans l\u2019\xE9diteur", pageType: "blank", allowedSources: [], intake: [], templates: [] }
];

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
function formatCard(flow) {
  const templateCount = flow.templates.length;
  const templateLabel = templateCount === 1 ? "mod\xE8le" : "mod\xE8les";
  return `<a class="format-card" href="/creer?format=${encodeURIComponent(flow.id)}"><span class="format-card__count">${templateCount} ${templateLabel}</span><h3>${escapeHtml(flow.title)}</h3><p>${escapeHtml(flow.description)}</p><span class="format-card__arrow" aria-hidden="true">\u2192</span></a>`;
}
function renderDashboardHome(model) {
  const cards = model.projects.length ? model.projects.map(projectCard).join("") : `<button class="empty-project" data-dashboard-action="generate"><span>\uFF0B</span><strong>Ta premi\xE8re boutique commence ici</strong><small>Ajoute un produit et Weflo construit chaque section.</small></button>`;
  return `<div class="shell dashboard-shell">
    <aside class="sidebar" aria-label="Navigation principale">
      <a class="brand" href="/dashboard">weflo<span>.</span></a>
      <nav class="main-nav"><a class="nav-item is-active" href="/dashboard"><span>\u2302</span>Accueil</a><a class="nav-item" href="/creations"><span>\u25A3</span>Mes cr\xE9ations <b>${model.totalProjects}</b></a><a class="nav-item" href="/studio"><span>\u2726</span>Studio images</a><a class="nav-item" href="/boutique"><span>\u25C6</span>Ma boutique</a><a class="nav-item" href="/facturation"><span>\u25C8</span>Abonnement</a></nav>
      <div class="sidebar-bottom"><a class="nav-item" href="/parrainage"><span>\u2667</span>Parrainage</a><a class="nav-item" href="/facturation"><span>\u2699</span>R\xE9glages</a><div class="profile"><span class="avatar">${escapeHtml(model.greeting.replace("Bonjour", "").trim().charAt(0) || "W")}</span><span><strong>${escapeHtml(model.workspace.name)}</strong><small>Ton espace</small></span></div></div>
    </aside>
    <main><header class="topbar"><div><p class="hello">${escapeHtml(model.greeting)}</p><p class="subhello">Transforme ton prochain produit en boutique.</p></div><div class="top-actions"><button class="new-page-button" data-new-page>\uFF0B Nouvelle page</button><a class="pro-button" href="/facturation">Passer Pro</a></div></header>
      <section class="creation-desk"><div class="duck" aria-hidden="true">\u{1F425}</div><div class="desk-copy"><h1>Que veux-tu vendre ?</h1><p>Donne-moi un produit. Je m\u2019occupe de l\u2019offre, des mots et de la boutique.</p></div>
        <form class="prompt" data-dashboard-prompt><textarea aria-label="D\xE9crire le produit ou coller son lien" placeholder="Colle un lien produit ou d\xE9cris ce que tu veux vendre\u2026"></textarea><div class="prompt-footer"><span>Amazon, AliExpress, Shopify ou n\u2019importe quel site</span><button type="submit" data-dashboard-action="generate">G\xE9n\xE9rer ma boutique <span>\u2197</span></button></div></form>
        <div class="start-modes"><button data-dashboard-action="link"><span>\u2197</span><strong>Importer un lien</strong><small>Produit et images</small></button><button data-dashboard-action="image"><span>\u25A7</span><strong>Ajouter une image</strong><small>On reconna\xEEt le produit</small></button><button data-dashboard-action="shopify"><span class="shopify-brand">${shopifyLogo()}</span><strong>Depuis Shopify</strong><small>Choisir dans le catalogue</small></button><button data-dashboard-action="blank"><span>\uFF0B</span><strong>Partir de z\xE9ro</strong><small>Une page vraiment vierge</small></button></div>
      </section>
      <section class="projects" id="creations"><div class="section-heading"><div><h2>Mes cr\xE9ations</h2><p>Reprends l\xE0 o\xF9 tu t\u2019es arr\xEAt\xE9.</p></div><a href="/creations">Tout afficher \u2192</a></div><div class="project-shelf">${cards}</div></section>
      <section class="workbench"><div class="next-actions"><div class="section-heading compact"><div><h2>Le prochain geste</h2><p>Publie sans casser ton th\xE8me Shopify.</p></div></div><button class="task-row" data-dashboard-action="shopify"><span class="task-icon shopify-brand">${shopifyLogo()}</span><span><strong>Connecter Shopify</strong><small>Choisir le th\xE8me au moment de publier</small></span><b>Configurer \u2192</b></button><button class="task-row" data-dashboard-action="generate"><span class="task-icon">Aa</span><span><strong>Cr\xE9er une nouvelle offre</strong><small>Canardo adapte le message au produit</small></span><b>Commencer \u2192</b></button></div>
        <aside class="shopify-card"><span class="shopify-brand large">${shopifyLogo()}</span><p class="mini-title">Publication Shopify</p><h2>Ta boutique, dans ton vrai th\xE8me.</h2><p>Sections modifiables, copie s\xE9curis\xE9e et retour arri\xE8re inclus.</p><button data-dashboard-action="shopify">Connecter ma boutique</button></aside></section>
    </main></div>
    <dialog class="format-dialog" data-format-dialog aria-labelledby="format-dialog-title"><div class="format-dialog__header"><div><p class="format-dialog__eyebrow">Choisis un point de d\xE9part</p><h2 id="format-dialog-title">Nouvelle page</h2><p>Pars d\u2019un format adapt\xE9 \xE0 ce que tu veux cr\xE9er.</p></div><button class="format-dialog__close" type="button" data-format-dialog-close aria-label="Fermer la s\xE9lection de format">\xD7</button></div><div class="format-card-grid">${FORMAT_FLOWS.map(formatCard).join("")}</div></dialog>
    <nav class="mobile-nav"><a href="/dashboard">\u2302<span>Accueil</span></a><a href="/creations">\u25A3<span>Cr\xE9ations</span></a><a href="/studio">\u2726<span>Studio</span></a><a href="/boutique">\u25C6<span>Boutique</span></a><a href="/facturation">\u2699<span>R\xE9glages</span></a></nav>`;
}

// src/create/draft-safety.ts
var sensitiveQueryParts = /* @__PURE__ */ new Set(["token", "key", "apikey", "password", "secret", "auth", "signature", "credential"]);
var urlCandidate = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi;
var queryKey = /[?&]([^=&#\s]+)=/g;
function decoded(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}
function isSensitiveQueryKey(value) {
  const normalized = decoded(value).replace(/([a-z\d])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
  return normalized.split(/[^a-z\d]+/).some((part) => sensitiveQueryParts.has(part));
}
function persistentCreationText(value) {
  if (typeof value !== "string") return "";
  if (/\b(?:data|blob):/i.test(value)) return "";
  for (const candidate of value.match(urlCandidate) ?? []) {
    try {
      const url = new URL(candidate);
      if (url.username || url.password) return "";
      if ([...url.searchParams.keys()].some(isSensitiveQueryKey)) return "";
    } catch {
    }
  }
  for (const match of value.matchAll(queryKey)) {
    if (isSensitiveQueryKey(match[1])) return "";
  }
  return value;
}

// src/create/workspace.ts
var formatIcons = {
  store: "\u25C6",
  product: "\u25A3",
  landing: "\u2197",
  advertorial: "\xB6",
  quiz: "?",
  home: "\u2302",
  blog: "\u2261",
  blank: "\uFF0B"
};
var creationFormats = FORMAT_FLOWS.map(({ id, title, description }) => ({ id, title, description, icon: formatIcons[id] }));
function creationActionUrl(action, prompt = "") {
  if (action === "link") return "/creer?source=link";
  if (action === "image") return "/creer?source=image";
  if (action === "blank") return "/creer?format=blank";
  const persistentPrompt = persistentCreationText(prompt);
  if (!prompt) return "/creer";
  return persistentPrompt ? `/creer?source=description&prompt=${encodeURIComponent(persistentPrompt)}` : "/creer?source=description";
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
    const newPageButton = home.querySelector("[data-new-page]");
    const formatDialog = home.querySelector("[data-format-dialog]");
    newPageButton?.addEventListener("click", () => {
      if (formatDialog && !formatDialog.open) formatDialog.showModal();
    });
    home.querySelector("[data-format-dialog-close]")?.addEventListener("click", () => {
      formatDialog?.close();
    });
    formatDialog?.addEventListener("click", (event) => {
      if (event.target === formatDialog) formatDialog.close();
    });
    formatDialog?.addEventListener("close", () => {
      newPageButton?.focus();
    });
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
