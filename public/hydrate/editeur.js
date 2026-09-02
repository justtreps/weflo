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

// src/editor/ui/autosave.ts
var AutosaveConflictError = class extends Error {
  constructor(serverPage) {
    super("editor save conflict");
    this.serverPage = serverPage;
    this.name = "AutosaveConflictError";
  }
};
function createEditorAutosave(options) {
  const key = `weflo-editor-draft:${options.pageId}`;
  const storage = options.draftStorage ?? (typeof localStorage === "undefined" ? void 0 : localStorage);
  const delay = options.delay ?? 600;
  let documentVersion = options.initialVersion;
  let timer;
  let saving = false;
  let queued = false;
  let serverConflict;
  const flush = async () => {
    if (saving) {
      queued = true;
      return;
    }
    clearTimeout(timer);
    timer = void 0;
    saving = true;
    options.store.setState({ saveStatus: "saving" });
    const document2 = options.store.getState().document;
    try {
      const result = await options.save(document2, documentVersion);
      documentVersion = result.documentVersion;
      serverConflict = void 0;
      storage?.removeItem(key);
      options.store.setState({ saveStatus: "saved" });
    } catch (error) {
      if (error instanceof AutosaveConflictError) {
        serverConflict = error.serverPage;
        options.store.setState({ saveStatus: "conflict" });
      } else {
        options.store.setState({ saveStatus: "error" });
      }
    } finally {
      saving = false;
      if (queued) {
        queued = false;
        timer = setTimeout(() => {
          void flush();
        }, delay);
      }
    }
  };
  const unsubscribe = options.store.subscribe((state) => {
    if (state.saveStatus !== "modified") return;
    storage?.setItem(key, JSON.stringify(state.document));
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, delay);
  });
  return {
    flush,
    version: () => documentVersion,
    conflict: () => serverConflict,
    destroy() {
      clearTimeout(timer);
      unsubscribe();
    }
  };
}

// src/sections/registry.ts
var definitions = /* @__PURE__ */ new Map();
function assertComplete(definition) {
  if (!definition.type?.trim()) throw new Error("Section type is required");
  if (!definition.name?.trim()) throw new Error(`Section ${definition.type} name is required`);
  if (!definition.category) throw new Error(`Section ${definition.type} category is required`);
  if (!definition.defaults || !Array.isArray(definition.settings) || !Array.isArray(definition.blocks)) throw new Error(`Section ${definition.type} schema is incomplete`);
  if (typeof definition.renderWeb !== "function" || typeof definition.renderLiquid !== "function") throw new Error(`Section ${definition.type} renderers are required`);
}
function registerSection(definition) {
  assertComplete(definition);
  if (definitions.has(definition.type)) throw new Error(`Section ${definition.type} is already registered`);
  definitions.set(definition.type, definition);
  return definition;
}
function getSectionDefinition(type) {
  return definitions.get(type);
}
function listSectionDefinitions() {
  return [...definitions.values()];
}

// src/sections/shared.ts
function escapeHtml(value2) {
  return String(value2 ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function safeMediaUrl(value2) {
  if (typeof value2 !== "string") return "";
  const url = value2.trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,|\/(?!\/))/i.test(url) ? escapeHtml(url) : "";
}
function safeLink(value2) {
  if (typeof value2 !== "string") return "#";
  const url = value2.trim();
  return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(url) ? escapeHtml(url) : "#";
}
function value(section2, key, fallback = "") {
  const current = section2.settings[key];
  return typeof current === "string" || typeof current === "number" ? String(current) : fallback;
}
function edit(tag, key, content, className = "") {
  return `<${tag}${className ? ` class="${escapeHtml(className)}"` : ""} data-wf-edit-key="${escapeHtml(key)}">${escapeHtml(content)}</${tag}>`;
}
function image(section2, key = "image", alt = "", className = "wf-section__image") {
  const url = safeMediaUrl(section2.settings[key]);
  return url ? `<img class="${escapeHtml(className)}" src="${url}" alt="${escapeHtml(alt)}" loading="lazy" data-wf-media-key="${escapeHtml(key)}">` : `<div class="${escapeHtml(className)} wf-media-empty" data-wf-media-key="${escapeHtml(key)}" role="img" aria-label="Ajouter une image"></div>`;
}
function blockValue(block2, key, fallback = "") {
  const current = block2.settings[key];
  return typeof current === "string" || typeof current === "number" ? String(current) : fallback;
}
var textControl = (key, label, type = "text") => ({ key, label, type, scope: "settings" });

// src/sections/factory.ts
var common = [
  textControl("title", "Titre"),
  textControl("subtitle", "Sous-titre"),
  textControl("text", "Texte", "textarea")
];
var cta = [textControl("cta_label", "Libell\xE9 du bouton"), textControl("cta_link", "Lien", "link")];
var media = [textControl("image", "Image", "image"), textControl("image_alt", "Texte alternatif")];
var itemBlock = { type: "item", name: "\xC9l\xE9ment", defaults: { title: "Nouvel \xE9l\xE9ment", text: "D\xE9cris cet \xE9l\xE9ment." }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea"), textControl("image", "Image", "image"), textControl("link", "Lien", "link")] };
function renderBlocks(blocks2, tag = "article") {
  return blocks2.map((block2) => {
    const rating = Number(block2.settings.rating);
    return `<${tag} class="wf-section__card" data-wf-block-id="${escapeHtml(block2.id)}">${block2.settings.image ? `<img src="${safeMediaUrl(block2.settings.image)}" alt="${escapeHtml(blockValue(block2, "image_alt", blockValue(block2, "title")))}">` : ""}${Number.isFinite(rating) && rating > 0 ? `<span role="img" aria-label="${rating} \xE9toiles sur 5">${"\u2605".repeat(Math.min(5, rating))}</span>` : ""}<h3>${escapeHtml(blockValue(block2, "title", blockValue(block2, "label", "\xC9l\xE9ment")))}</h3><p>${escapeHtml(blockValue(block2, "text"))}</p>${block2.settings.link ? `<a href="${safeLink(block2.settings.link)}">${escapeHtml(blockValue(block2, "label", "D\xE9couvrir"))}</a>` : ""}</${tag}>`;
  }).join("");
}
function button(section2) {
  const label = value(section2, "cta_label");
  return label ? `<a class="wf-section__button" href="${safeLink(section2.settings.cta_link)}">${escapeHtml(label)}</a>` : "";
}
function web(layout, section2, pageName) {
  const title = value(section2, "title", pageName);
  const subtitle = value(section2, "subtitle");
  const copy = value(section2, "text");
  const variant = value(section2, "variant", "default");
  const heading = edit(layout === "hero" || layout === "productHero" || layout === "videoHero" ? "h1" : "h2", "title", title);
  const intro = `${subtitle ? edit("p", "subtitle", subtitle, "wf-section__eyebrow") : ""}${heading}${copy ? edit("p", "text", copy, "wf-section__copy") : ""}`;
  if (layout === "navigation") return `<nav class="wf-section wf-navigation" aria-label="Navigation principale"><a class="wf-navigation__brand" href="/">${escapeHtml(title)}</a><div>${section2.blocks.map((block2) => `<a href="${safeLink(block2.settings.link)}">${escapeHtml(blockValue(block2, "label", "Lien"))}</a>`).join("")}</div>${button(section2)}</nav>`;
  if (layout === "announcement") return `<aside class="wf-section wf-announcement">${edit("p", "text", copy || title)}${button(section2)}</aside>`;
  if (layout === "hero" || layout === "productHero") return `<div class="wf-section wf-hero wf-hero--${layout}"><div class="wf-hero__content">${intro}${layout === "productHero" ? `<strong class="wf-section__price">${escapeHtml(value(section2, "price", "49,00 \u20AC"))}</strong>` : ""}${button(section2)}</div><figure>${image(section2, "image", value(section2, "image_alt", title))}</figure></div>`;
  if (layout === "videoHero") {
    const source = safeMediaUrl(section2.settings.video);
    return `<div class="wf-section wf-video-hero">${source ? `<video autoplay muted loop playsinline poster="${safeMediaUrl(section2.settings.image)}"><source src="${source}"></video>` : image(section2, "image", value(section2, "image_alt", title))}<div>${intro}${button(section2)}</div></div>`;
  }
  if (layout === "gallery") return `<div class="wf-section wf-gallery">${intro}<div class="wf-section__grid">${renderBlocks(section2.blocks)}</div></div>`;
  if (layout === "imageText") return `<div class="wf-section wf-image-text">${image(section2, "image", value(section2, "image_alt", title))}<div>${intro}${button(section2)}</div></div>`;
  if (layout === "beforeAfter") return `<div class="wf-section wf-before-after">${intro}<div class="wf-before-after__media">${image(section2, "before_image", value(section2, "before_alt", "Avant"))}${image(section2, "after_image", value(section2, "after_alt", "Apr\xE8s"))}</div></div>`;
  if (layout === "product") {
    const variants = section2.blocks.filter((block2) => block2.type === "variant");
    return `<div class="wf-section wf-product">${intro}<div class="wf-section__grid">${renderBlocks(section2.blocks.filter((block2) => block2.type !== "variant"))}</div><form class="wf-product__form" action="/cart/add" method="post"><label>Variante<select name="id">${variants.length ? variants.map((block2) => `<option value="${escapeHtml(blockValue(block2, "variant_id", block2.id))}">${escapeHtml(blockValue(block2, "title", "Option"))}</option>`).join("") : '<option value="">Choisir dans Shopify</option>'}</select></label><label>Quantit\xE9<input type="number" name="quantity" value="1" min="1"></label><button type="submit">${escapeHtml(value(section2, "cta_label", "Ajouter au panier"))}</button></form></div>`;
  }
  if (layout === "bundle") return `<div class="wf-section wf-bundle">${intro}<fieldset><legend>Compose ton bundle</legend>${section2.blocks.map((block2) => `<label><input type="checkbox" name="bundle" value="${escapeHtml(block2.id)}"><span>${escapeHtml(blockValue(block2, "title"))}</span><strong>${escapeHtml(blockValue(block2, "price"))}</strong></label>`).join("")}</fieldset><output class="wf-bundle__total" aria-live="polite">${escapeHtml(value(section2, "price", "Total calcul\xE9 dans le panier"))}</output>${button(section2)}</div>`;
  if (layout === "comparison") return `<div class="wf-section wf-comparison">${intro}<div role="table">${renderBlocks(section2.blocks, "div")}</div></div>`;
  if (layout === "faq") return `<div class="wf-section wf-faq">${intro}${section2.blocks.map((block2) => `<details><summary>${escapeHtml(blockValue(block2, "title", "Question"))}</summary><p>${escapeHtml(blockValue(block2, "text"))}</p></details>`).join("")}</div>`;
  if (layout === "form") return `<div class="wf-section wf-form">${intro}<form><label>Email<input type="email" name="email" autocomplete="email" required></label><button type="submit">${escapeHtml(value(section2, "cta_label", "Envoyer"))}</button></form></div>`;
  if (layout === "quiz") return `<div class="wf-section wf-quiz">${intro}<form>${section2.blocks.map((block2, index) => `<fieldset${index ? " hidden" : ""}><legend>${escapeHtml(blockValue(block2, "title", `\xC9tape ${index + 1}`))}</legend><label><input type="radio" name="step-${index}" value="yes"> ${escapeHtml(blockValue(block2, "text", "Oui"))}</label></fieldset>`).join("")}<button type="button">Continuer</button></form></div>`;
  if (layout === "cta") return `<div class="wf-section wf-cta">${intro}${button(section2)}</div>`;
  if (layout === "richText") return `<article class="wf-section wf-rich-text">${intro}${renderBlocks(section2.blocks)}</article>`;
  if (layout === "footer") return `<footer class="wf-section wf-footer"><div>${heading}${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div><nav aria-label="Pied de page">${renderBlocks(section2.blocks, "div")}</nav></footer>`;
  if (layout === "spacer") return `<div class="wf-spacer" aria-hidden="true" style="height:${Number(section2.settings.height) || 48}px"></div>`;
  if (layout === "divider") return `<hr class="wf-divider">`;
  if (variant === "home-stories" || variant === "beauty-journal" || variant === "press-quotes") return `<section class="wf-section wf-cards wf-proof__stories" data-wf-variant="${escapeHtml(variant)}"><header>${intro}</header><div class="wf-proof__editorial-flow">${renderBlocks(section2.blocks)}</div>${button(section2)}</section>`;
  if (variant === "results-wall" || variant === "measured-proof" || variant === "field-tests") return `<section class="wf-section wf-cards wf-proof__results" data-wf-variant="${escapeHtml(variant)}"><div class="wf-proof__score">${escapeHtml(value(section2, "subtitle", "5/5"))}</div><header>${heading}${copy ? edit("p", "text", copy, "wf-section__copy") : ""}</header><div class="wf-section__grid">${renderBlocks(section2.blocks)}</div>${button(section2)}</section>`;
  return `<div class="wf-section wf-cards" data-wf-variant="${escapeHtml(variant)}">${intro}<div class="wf-section__grid">${renderBlocks(section2.blocks)}</div>${button(section2)}</div>`;
}
function createSectionDefinition(type, name, category, layout, extraDefaults = {}, extraSettings = [], blocks2 = [itemBlock]) {
  const defaults = { title: name, subtitle: "", text: "", cta_label: "D\xE9couvrir", cta_link: "#", ...extraDefaults };
  return {
    type,
    name,
    category,
    defaults,
    settings: [...common, ...cta, ...layout === "hero" || layout === "productHero" || layout === "imageText" || layout === "videoHero" ? media : [], ...extraSettings],
    blocks: blocks2,
    renderWeb: ({ section: section2, pageName }) => web(layout, section2, pageName),
    renderLiquid: (section2) => {
      const variant = section2 ? value(section2, "variant", "default") : "default";
      return `<section class="wf-section wf-${escapeHtml(type)} wf-${escapeHtml(type)}--${escapeHtml(variant)}" data-wf-variant="${escapeHtml(variant)}"><h2>{{ section.settings.title | escape }}</h2><div>{{ section.settings.text }}</div>{% for block in section.blocks %}<article {{ block.shopify_attributes }}><h3>{{ block.settings.title | escape }}</h3><p>{{ block.settings.text }}</p></article>{% endfor %}</section>`;
    }
  };
}

// src/sections/navigation.ts
var navigationSection = createSectionDefinition("navigation", "Navigation", "brand", "navigation");

// src/sections/announcement.ts
var announcementSection = createSectionDefinition("announcement", "Barre d\u2019annonce", "brand", "announcement");

// src/sections/hero.ts
var heroSection = createSectionDefinition("hero", "Hero de marque", "brand", "hero", { title: "Une marque qui m\xE9rite d\u2019\xEAtre remarqu\xE9e", image: "", image_alt: "" });

// src/sections/product-hero.ts
var base = createSectionDefinition("productHero", "Hero produit", "commerce", "productHero", { price: "49,00 \u20AC", image: "", image_alt: "", variant: "ambient-editorial" });
var productHeroSection = {
  ...base,
  renderWeb: ({ section: section2, pageName }) => {
    const title = value(section2, "title", pageName);
    const subtitle = value(section2, "subtitle");
    const body = value(section2, "text");
    const price = value(section2, "price");
    const cta2 = value(section2, "cta_label", "Ajouter au panier");
    const media3 = image(section2, "image", value(section2, "image_alt", title), "wf-hero__image");
    const action = `<a class="wf-section__button" href="${safeLink(section2.settings.cta_link)}">${escapeHtml(cta2)}</a>`;
    const variant = value(section2, "variant", "ambient-editorial");
    if (variant === "problem-solution") return `<section class="wf-section wf-hero wf-hero__problem" data-wf-variant="problem-solution"><div class="wf-hero__problem-copy"><span>Le probl\xE8me, r\xE9solu.</span>${edit("h1", "title", title)}${edit("p", "text", body)}<div class="wf-hero__proof">\u2713 Simple \xE0 choisir \xB7 \u2713 Pens\xE9 pour le quotidien</div>${price ? edit("strong", "price", price, "wf-section__price") : ""}${action}</div><figure>${media3}<figcaption>${escapeHtml(subtitle)}</figcaption></figure></section>`;
    if (variant === "clinical-evidence") return `<section class="wf-section wf-hero wf-hero__clinical" data-wf-variant="clinical-evidence"><div><span class="wf-section__eyebrow">${escapeHtml(subtitle)}</span>${edit("h1", "title", title)}${edit("p", "text", body)}<dl><div><dt>Usage</dt><dd>Clair</dd></div><div><dt>Choix</dt><dd>Guid\xE9</dd></div></dl>${action}</div><figure>${media3}</figure></section>`;
    return `<section class="wf-section wf-hero wf-hero__atmosphere" data-wf-variant="${escapeHtml(variant)}"><figure>${media3}</figure><div class="wf-hero__editorial-copy"><span class="wf-section__eyebrow">${escapeHtml(subtitle)}</span>${edit("h1", "title", title)}${edit("p", "text", body)}${price ? edit("strong", "price", price, "wf-section__price") : ""}${action}</div></section>`;
  },
  renderLiquid: (section2) => {
    const variant = section2 ? value(section2, "variant", "ambient-editorial") : "ambient-editorial";
    const modifier = variant === "problem-solution" ? "wf-hero__problem" : variant === "clinical-evidence" ? "wf-hero__clinical" : "wf-hero__atmosphere";
    return `<section class="wf-section wf-hero ${modifier}" data-wf-variant="${escapeHtml(variant)}"><div class="wf-hero__media">{{ section.settings.image | image_url: width: 1800 | image_tag }}</div><div class="wf-hero__content"><p>{{ section.settings.subtitle | escape }}</p><h1>{{ section.settings.title | escape }}</h1><div>{{ section.settings.text }}</div><strong>{{ section.settings.price | escape }}</strong><a href="{{ section.settings.cta_link }}">{{ section.settings.cta_label | escape }}</a></div></section>`;
  }
};

// src/sections/video-hero.ts
var videoHeroSection = createSectionDefinition("videoHero", "Hero vid\xE9o", "media", "videoHero", { video: "", image: "", image_alt: "" });

// src/sections/gallery.ts
var gallerySection = createSectionDefinition("gallery", "Galerie", "media", "gallery");

// src/sections/image-text.ts
var imageTextSection = createSectionDefinition("imageText", "Image + texte", "media", "imageText", { image: "", image_alt: "" });

// src/sections/before-after.ts
var beforeAfterSection = createSectionDefinition("beforeAfter", "Avant / apr\xE8s", "media", "beforeAfter", { before_image: "", after_image: "", before_alt: "Avant", after_alt: "Apr\xE8s" }, [textControl("before_image", "Image avant", "image"), textControl("after_image", "Image apr\xE8s", "image")]);

// src/sections/brand-media.ts
var brandMediaSections = [navigationSection, announcementSection, heroSection, productHeroSection, videoHeroSection, gallerySection, imageTextSection, beforeAfterSection];
for (const definition of brandMediaSections) registerSection(definition);

// src/sections/product-main.ts
var base2 = createSectionDefinition("productMain", "Fiche produit", "commerce", "product", { cta_label: "Ajouter au panier", product_handle: "", variant: "calm-buy-box" }, [textControl("product_handle", "Produit Shopify", "text")]);
var productMainSection = {
  ...base2,
  renderWeb: ({ section: section2, pageName }) => {
    const title = value(section2, "title", pageName);
    const body = value(section2, "text");
    const price = value(section2, "price");
    const compare = value(section2, "compare_at_price");
    const cta2 = value(section2, "cta_label", "Ajouter au panier");
    const variant = value(section2, "variant", "calm-buy-box");
    const variants = section2.blocks.filter((block2) => block2.type === "variant");
    const options = variants.length ? variants.map((block2) => `<option value="${escapeHtml(blockValue(block2, "variant_id", block2.id))}">${escapeHtml(blockValue(block2, "title", "Option"))}</option>`).join("") : '<option value="">Choisir dans Shopify</option>';
    return `<section class="wf-section wf-product wf-product--${escapeHtml(variant)}" id="product" data-wf-variant="${escapeHtml(variant)}"><div class="wf-product__gallery">${image(section2, "image", title, "wf-product__image")}<div class="wf-product__thumbs"><button type="button" aria-label="Voir l\u2019image principale"></button><button type="button" aria-label="Voir une autre image"></button></div></div><div class="wf-product__buy-box"><div class="wf-product__rating">\u2605\u2605\u2605\u2605\u2605 <span>Les avis import\xE9s apparaissent ici</span></div>${edit("h1", "title", title)}${edit("p", "text", body)}<div class="wf-product__prices">${edit("strong", "price", price, "wf-section__price")}${compare ? `<s data-wf-edit-key="compare_at_price">${escapeHtml(compare)}</s>` : ""}</div><form action="/cart/add" method="post"><label>Option<select name="id">${options}</select></label><label>Quantit\xE9<input name="quantity" type="number" value="1" min="1"></label><fieldset class="wf-product__bundle"><legend>Bundle & \xE9conomies</legend><label><input type="radio" name="properties[Offre]" value="Solo" checked> Solo</label><label><input type="radio" name="properties[Offre]" value="Duo"> Duo \u2014 meilleur choix</label></fieldset><button type="submit">${escapeHtml(cta2)}</button></form><p class="wf-product__trust">Paiement s\xE9curis\xE9 \xB7 Commande suivie \xB7 Assistance disponible</p></div><div class="wf-product__sticky"><span>${escapeHtml(title)}</span><strong>${escapeHtml(price)}</strong><button type="button">${escapeHtml(cta2)}</button></div></section>`;
  },
  renderLiquid: (section2) => {
    const variant = section2 ? value(section2, "variant", "calm-buy-box") : "calm-buy-box";
    return `<section class="weflo-product-main wf-product--${escapeHtml(variant)}">{% assign selected_product = all_products[section.settings.product_handle] | default: product %}<div class="wf-product__gallery">{{ selected_product.featured_image | image_url: width: 1600 | image_tag }}{% for image in selected_product.images limit: 4 %}{{ image | image_url: width: 500 | image_tag }}{% endfor %}</div><div class="wf-product__buy-box"><h1>{{ selected_product.title | default: section.settings.title | escape }}</h1><div>{{ selected_product.description | default: section.settings.text }}</div><div class="wf-product__prices"><strong>{{ selected_product.price | money }}</strong>{% if selected_product.compare_at_price > selected_product.price %}<s>{{ selected_product.compare_at_price | money }}</s>{% endif %}</div>{% form 'product', selected_product %}<label>Option<select name="id">{% for variant in selected_product.variants %}<option value="{{ variant.id }}">{{ variant.title }} \u2014 {{ variant.price | money }}</option>{% endfor %}</select></label><label>Quantit\xE9<input name="quantity" type="number" min="1" value="1"></label><fieldset class="wf-product__bundle"><legend>Bundle & \xE9conomies</legend><label><input type="radio" name="properties[Offre]" value="Solo" checked>Solo</label><label><input type="radio" name="properties[Offre]" value="Duo">Duo</label></fieldset><button type="submit">{{ section.settings.cta_label | escape }}</button>{% endform %}<p class="wf-product__trust">Paiement s\xE9curis\xE9 \xB7 Commande suivie \xB7 Assistance disponible</p></div><div class="wf-product__sticky"><span>{{ selected_product.title }}</span><strong>{{ selected_product.price | money }}</strong><button type="submit" form="product-form-{{ section.id }}">{{ section.settings.cta_label | escape }}</button></div></section>`;
  }
};

// src/sections/product-grid.ts
var productGridSection = {
  ...createSectionDefinition("productGrid", "Grille de produits", "commerce", "product"),
  renderLiquid: () => `<section class="weflo-product-grid"><h2>{{ section.settings.title | escape }}</h2><div>{% for product in section.settings.collection.products %}<a href="{{ product.url }}">{{ product.featured_image | image_url: width: 700 | image_tag }}<h3>{{ product.title | escape }}</h3><span>{{ product.price | money }}</span></a>{% endfor %}</div></section>`
};

// src/sections/collection-grid.ts
var collectionGridSection = {
  ...createSectionDefinition("collectionGrid", "Grille de collections", "commerce", "product", { collection_handle: "" }, [textControl("collection_handle", "Collection Shopify", "text")]),
  renderLiquid: () => `<section class="weflo-collection-grid"><h2>{{ section.settings.title | escape }}</h2>{% assign selected_collection = collections[section.settings.collection_handle] %}<div>{% for product in selected_collection.products %}<a href="{{ product.url }}"><h3>{{ product.title | escape }}</h3>{{ product.price | money }}</a>{% endfor %}</div></section>`
};

// src/sections/bundle.ts
var bundleSection = {
  ...createSectionDefinition("bundle", "Offre bundle", "commerce", "bundle", { title: "Cr\xE9e ton bundle", price: "" }),
  renderLiquid: () => `<section class="weflo-bundle"><h2>{{ section.settings.title | escape }}</h2><fieldset><legend>{{ section.settings.text }}</legend>{% for block in section.blocks %}<label {{ block.shopify_attributes }}><input type="checkbox" name="items[]" value="{{ block.settings.variant.id }}">{{ block.settings.title | escape }}</label>{% endfor %}</fieldset><button type="button">{{ section.settings.cta_label | escape }}</button></section>`
};

// src/sections/comparison.ts
var comparisonSection = createSectionDefinition("comparison", "Comparateur", "conversion", "comparison", { title: "Pourquoi nous choisir" });

// src/sections/ingredients.ts
var ingredientsSection = createSectionDefinition("ingredients", "Ingr\xE9dients & d\xE9tails", "content", "cards", { title: "Ce qu\u2019il y a dedans" });

// src/sections/commerce.ts
var commerceSections = [productMainSection, productGridSection, collectionGridSection, bundleSection, comparisonSection, ingredientsSection];
for (const definition of commerceSections) registerSection(definition);

// src/sections/benefits.ts
var benefitsSection = createSectionDefinition("benefits", "B\xE9n\xE9fices", "conversion", "cards");

// src/sections/steps.ts
var stepsSection = createSectionDefinition("steps", "\xC9tapes", "content", "cards");

// src/sections/stats.ts
var statsSection = createSectionDefinition("stats", "Chiffres cl\xE9s", "conversion", "cards");

// src/sections/testimonials.ts
var testimonialsSection = createSectionDefinition("testimonials", "T\xE9moignages", "conversion", "cards");

// src/sections/reviews.ts
var reviewsSection = createSectionDefinition("reviews", "Avis clients", "conversion", "cards");

// src/sections/press.ts
var pressSection = createSectionDefinition("press", "Ils parlent de nous", "conversion", "cards");

// src/sections/guarantees.ts
var guaranteesSection = createSectionDefinition("guarantees", "Garanties", "conversion", "cards");

// src/sections/shipping.ts
var shippingSection = createSectionDefinition("shipping", "Livraison", "conversion", "cards");

// src/sections/faq.ts
var faqSection = createSectionDefinition("faq", "Questions fr\xE9quentes", "content", "faq");

// src/sections/newsletter.ts
var newsletterSection = createSectionDefinition("newsletter", "Newsletter", "conversion", "form");

// src/sections/form.ts
var formSection = createSectionDefinition("form", "Formulaire", "content", "form");

// src/sections/quiz.ts
var quizSection = createSectionDefinition("quiz", "Quiz", "conversion", "quiz");

// src/sections/cta.ts
var ctaSection = createSectionDefinition("cta", "Appel \xE0 l\u2019action", "conversion", "cta");

// src/sections/rich-text.ts
var richTextSection = createSectionDefinition("richText", "Texte riche", "content", "richText");

// src/sections/footer.ts
var footerSection = createSectionDefinition("footer", "Pied de page", "brand", "footer");

// src/sections/conversion.ts
var conversionSections = [benefitsSection, stepsSection, statsSection, testimonialsSection, reviewsSection, pressSection, guaranteesSection, shippingSection, faqSection, newsletterSection, formSection, quizSection, ctaSection, richTextSection, footerSection];
for (const definition of conversionSections) registerSection(definition);

// src/sections/spacer.ts
var spacerSection = createSectionDefinition("spacer", "Espacement", "layout", "spacer", { height: 64 }, [], []);

// src/sections/divider.ts
var dividerSection = createSectionDefinition("divider", "S\xE9parateur", "layout", "divider", {}, [], []);

// src/editor/custom-code-policy.ts
function validateCustomCode(input) {
  const errors = [];
  if (/<\/?(?:script|iframe|object|embed|base)\b|\son[a-z]+\s*=/i.test(input.html)) errors.push("HTML interdit : scripts, cadres et gestionnaires inline ne sont pas autoris\xE9s.");
  if (/{%\s*(?:render|include|section|liquid)\b/i.test(input.html)) errors.push("Balise Liquid non autoris\xE9e.");
  if (/(?:document\.cookie|localStorage|sessionStorage|indexedDB|window\.top|window\.parent|parent\.|opener\.|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|eval\s*\(|new\s+Function)/i.test(input.js)) errors.push("JavaScript non autoris\xE9 : acc\xE8s r\xE9seau, identifiants ou contexte parent.");
  if (/@import|url\s*\(\s*["']?https?:\/\//i.test(input.css)) errors.push("Les imports CSS distants sont interdits.");
  const root = `[data-wf-custom-id="${input.namespace.replace(/[^a-z0-9_-]/gi, "")}"]`;
  const selectors = [...input.css.matchAll(/(^|})(\s*)([^@}{][^{]*){/g)].map((match) => match[3].trim());
  if (selectors.some((group) => group.split(",").some((selector) => !selector.trim().startsWith(root)))) errors.push("Chaque s\xE9lecteur CSS doit \xEAtre limit\xE9 \xE0 la section.");
  return { ok: errors.length === 0, errors };
}

// src/sections/custom-code.ts
var customCodeSection = {
  type: "customCode",
  name: "Code personnalis\xE9",
  category: "layout",
  defaults: { html: "<div><h2>Ta section sur mesure</h2></div>", css: "", js: "" },
  settings: [
    { key: "html", label: "HTML", type: "code", scope: "settings" },
    { key: "css", label: "CSS", type: "code", scope: "settings" },
    { key: "js", label: "JavaScript local", type: "code", scope: "settings" }
  ],
  blocks: [],
  renderWeb: ({ section: section2 }) => {
    const html = String(section2.settings.html ?? "");
    const css = String(section2.settings.css ?? "");
    const js = String(section2.settings.js ?? "");
    const validation = validateCustomCode({ html, css, js, allowedDomains: [], namespace: section2.id });
    if (!validation.ok) return `<div class="wf-section wf-custom-error" role="alert"><strong>Cette section doit \xEAtre corrig\xE9e</strong><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>`;
    const source = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}${css}</style><div data-wf-custom-id="${escapeHtml(section2.id)}">${html}</div>${js ? `<script>${js}<\/script>` : ""}`;
    return `<iframe class="wf-custom-frame" title="Section personnalis\xE9e" sandbox="allow-scripts" srcdoc="${escapeHtml(source)}"></iframe>`;
  },
  renderLiquid: () => `<section class="weflo-custom-code" data-wf-custom-id="{{ section.id }}">{{ section.settings.html }}<style>{{ section.settings.css }}</style><script>{{ section.settings.js }}<\/script></section>`
};

// src/sections/index.ts
registerSection(spacerSection);
registerSection(dividerSection);
registerSection(customCodeSection);

// src/editor/ui/panels/add-section.ts
function addSectionPanel() {
  const groups = listSectionDefinitions().reduce((result, definition) => {
    const entries = result.get(definition.category) ?? [];
    entries.push(definition);
    result.set(definition.category, entries);
    return result;
  }, /* @__PURE__ */ new Map());
  const labels = { commerce: "Produit et offre", conversion: "Conversion", media: "Histoire et m\xE9dias", content: "Contenu", layout: "Mise en page" };
  return `<section data-panel="add"><p class="editor-panel-help">Ajoute une section enti\xE8rement modifiable apr\xE8s la s\xE9lection actuelle.</p>${[...groups].map(([category, definitions2]) => `<h3 class="editor-panel-heading">${labels[category] ?? category}</h3><div class="editor-panel-grid">${definitions2.map((definition) => `<button type="button" data-panel-action="insert" data-section-type="${definition.type}"><i class="editor-section-thumb editor-section-thumb--${definition.type}"><span></span><span></span><span></span></i><b>${definition.name}</b><small>+ Ajouter la section</small></button>`).join("")}</div>`).join("")}</section>`;
}

// src/editor/ui/panels/commerce.ts
function commercePanel(state) {
  const product = state.document.commerce?.sourceProduct;
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  const groups = [["Produit", ["productHero", "gallery", "productMain"]], ["Offres group\xE9es", ["bundle", "cta"]], ["Client cible", ["benefits", "reviews", "testimonials"]], ["Angle marketing", ["imageText", "comparison", "guarantees"]]];
  return `<section data-panel="commerce">${product ? `<div class="editor-product-card">${product.images[0] ? `<img src="${product.images[0]}" alt="">` : ""}<div><strong>${product.title}</strong><small>${product.vendor}</small></div></div>` : ""}<p class="editor-panel-help">Sections e-commerce cr\xE9\xE9es \xE0 partir de ton produit et de ta strat\xE9gie.</p><div class="editor-commerce-groups">${groups.map(([label, types]) => {
    const section2 = page.sections.find((item) => types.includes(item.type));
    return `<button type="button" data-panel-action="${section2 ? "select" : "insert"}" ${section2 ? `data-section-id="${section2.id}"` : `data-section-type="${types[0]}"`}><span><b>${label}</b><small>${section2 ? section2.name : "Ajouter \xE0 la page"}</small></span><i>\u203A</i></button>`;
  }).join("")}</div><a class="editor-shopify-link" href="/dashboard#shopify">Connexion et publication Shopify \u2192</a></section>`;
}

// src/editor/ui/panels/layers.ts
function layersPanel(state) {
  const kit = state.document.commerce?.brandKit;
  const fonts = ["Inter", "DM Sans", "Manrope", "Space Grotesk", "Playfair Display", "Libre Baskerville"];
  const fontSelect = (key, value2) => `<select data-theme-key="${key}">${fonts.map((font) => `<option value="${font}"${font === value2 ? " selected" : ""}>${font}</option>`).join("")}</select>`;
  const colorLabels = { background: "Arri\xE8re-plan", surface: "Surface", ink: "Texte", accent: "Accent" };
  return `<section data-panel="layers"><p class="editor-panel-help">L\u2019identit\xE9 globale de ta marque. Les changements s\u2019appliquent \xE0 toutes les sections.</p><div class="editor-brand-preview"><small>IDENTIT\xC9 DE MARQUE</small><strong>${state.document.name}</strong><span style="font-family:${kit?.headingFont ?? "Inter"}">Aa</span></div><h3 class="editor-panel-heading">Couleurs</h3><div class="editor-theme-colors">${["background", "surface", "ink", "accent"].map((key) => `<label><input type="color" data-theme-key="${key}" value="${state.document.theme[key]}"><small>${colorLabels[key]}</small></label>`).join("")}</div><h3 class="editor-panel-heading">Typographie</h3><label class="editor-theme-field"><small>Titres</small>${fontSelect("headingFont", kit?.headingFont ?? "Inter")}</label><label class="editor-theme-field"><small>Texte</small>${fontSelect("bodyFont", kit?.bodyFont ?? "Inter")}</label></section>`;
}

// src/editor/ui/panels/media.ts
function mediaPanel(state) {
  return `<section data-panel="media"><button type="button" class="editor-panel-primary" data-panel-action="uploadMedia">Importer un m\xE9dia</button><div class="editor-media-grid">${state.document.assets.length ? state.document.assets.map((asset) => `<button type="button" data-panel-action="pickMedia" data-asset-id="${asset.id}"><img src="${asset.url}" alt="${asset.alt ?? ""}"></button>`).join("") : "<p>Aucun m\xE9dia. Importe une image ou une vid\xE9o.</p>"}</div></section>`;
}

// src/editor/ui/panels/pages.ts
function pagesPanel(state) {
  return `<section data-panel="pages"><button type="button" class="editor-panel-primary" data-panel-action="addPage">Ajouter une page</button>${state.document.pages.map((page) => `<button type="button" class="editor-panel-row" data-panel-action="selectPage" data-page-id="${page.id}" aria-pressed="${page.id === state.pageId}"><span>${page.name}</span><small>/${page.slug}</small></button>`).join("")}</section>`;
}

// src/editor/ui/panels/structure.ts
function structurePanel(state) {
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  const rows = page.sections.map((section2, index) => `<button type="button" class="editor-panel-row" data-panel-action="select" data-section-id="${section2.id}" aria-pressed="${state.selectedId === section2.id}"><i>${String(index + 1).padStart(2, "0")}</i><span>${section2.name}</span><small>${section2.hidden ? "Masqu\xE9e" : "Modifier"}</small></button>`).join("");
  return `<section data-panel="structure"><p class="editor-panel-help">S\xE9lectionne, modifie et r\xE9organise chaque section r\xE9elle de la boutique.</p><div class="editor-panel-list">${rows}</div></section>`;
}

// src/editor/ui/left-rail.ts
function activateEditorPanel(store, panel) {
  store.setState({ activePanel: panel, leftCollapsed: false });
}
function editorPanelMarkup(state) {
  switch (state.activePanel) {
    case "structure":
      return structurePanel(state);
    case "add":
      return addSectionPanel();
    case "layers":
      return layersPanel(state);
    case "pages":
      return pagesPanel(state);
    case "media":
      return mediaPanel(state);
    case "commerce":
      return commercePanel(state);
  }
}
function nextSection(state, type) {
  const definition = getSectionDefinition(type);
  const used = new Set(state.document.pages.flatMap((page) => page.sections.map((section2) => section2.id)));
  let index = 1;
  while (used.has(`${type}-${index}`)) index += 1;
  return {
    id: `${type}-${index}`,
    type,
    name: definition?.name ?? type,
    hidden: false,
    locked: false,
    settings: definition ? structuredClone(definition.defaults) : { title: "Nouvelle section" },
    style: {},
    responsive: {},
    blocks: []
  };
}
function runPanelAction(store, action) {
  const state = store.getState();
  if (action.action === "select") store.setState({ selectedId: action.sectionId, rightCollapsed: false });
  if (action.action === "toggleHidden" || action.action === "toggleLocked") {
    store.dispatch({ type: action.action, sectionId: action.sectionId });
  }
  if (action.action === "selectPage") store.setState({ pageId: action.pageId, selectedId: null });
  if (action.action === "addPage") {
    const name = action.name.trim() || "Nouvelle page";
    const base3 = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
    const slugs = new Set(state.document.pages.map((page2) => page2.slug));
    let slug2 = base3;
    let suffix = 2;
    while (slugs.has(slug2)) slug2 = `${base3}-${suffix++}`;
    const page = { id: `page-${slug2}`, name, slug: slug2, sections: [] };
    store.setState({ document: { ...state.document, pages: [...state.document.pages, page] }, pageId: page.id, selectedId: null, saveStatus: "modified" });
  }
  if (action.action === "addAsset") {
    store.setState({ document: { ...state.document, assets: [...state.document.assets.filter((asset) => asset.id !== action.asset.id), action.asset] }, saveStatus: "modified" });
  }
  if (action.action === "pickMedia") {
    const asset = state.document.assets.find((item) => item.id === action.assetId);
    if (asset && state.selectedId) store.dispatch({ type: "updateSetting", sectionId: state.selectedId, key: "image", value: asset.url });
  }
  if (action.action === "insert") {
    const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
    const selectedIndex = page.sections.findIndex((section3) => section3.id === state.selectedId);
    const section2 = nextSection(state, action.sectionType);
    store.dispatch({ type: "insertSection", pageId: page.id, index: selectedIndex < 0 ? page.sections.length : selectedIndex + 1, section: section2 });
    store.setState({ selectedId: section2.id, activePanel: "structure", rightCollapsed: false });
  }
}
function bindLeftRail(root, store) {
  const click = (event) => {
    const target = event.target.closest("[data-editor-panel-button],[data-panel-action]");
    if (!target) return;
    const panel = target.dataset.editorPanelButton;
    if (panel) return activateEditorPanel(store, panel);
    const action = target.dataset.panelAction;
    const sectionId = target.dataset.sectionId;
    if ((action === "select" || action === "toggleHidden" || action === "toggleLocked") && sectionId) runPanelAction(store, { action, sectionId });
    if (action === "insert" && target.dataset.sectionType) runPanelAction(store, { action, sectionType: target.dataset.sectionType });
    if (action === "selectPage" && target.dataset.pageId) runPanelAction(store, { action, pageId: target.dataset.pageId });
    if (action === "addPage") runPanelAction(store, { action, name: window.prompt("Nom de la page", "Nouvelle page") ?? "Nouvelle page" });
    if (action === "pickMedia" && target.dataset.assetId) runPanelAction(store, { action, assetId: target.dataset.assetId });
    if (action === "uploadMedia") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,video/*";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (typeof reader.result !== "string") return;
          runPanelAction(store, { action: "addAsset", asset: { id: `asset-${Date.now()}`, type: file.type.startsWith("video/") ? "video" : "image", url: reader.result, alt: file.name } });
        });
        reader.readAsDataURL(file);
      });
      input.click();
    }
  };
  const change = (event) => {
    const control = event.target.closest("[data-theme-key]");
    if (!control) return;
    const state = store.getState();
    const key = control.dataset.themeKey;
    if (key === "headingFont" || key === "bodyFont") {
      if (!state.document.commerce) return;
      const commerce = { ...state.document.commerce, brandKit: { ...state.document.commerce.brandKit, [key]: control.value } };
      store.setState({ document: { ...state.document, commerce }, saveStatus: "modified" });
    } else if (key && ["background", "surface", "ink", "accent"].includes(key)) {
      store.setState({ document: { ...state.document, theme: { ...state.document.theme, [key]: control.value } }, saveStatus: "modified" });
    }
  };
  root.addEventListener("click", click);
  root.addEventListener("change", change);
  return () => {
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
  };
}

// src/editor/section-schema.ts
var CONTENT = [
  { key: "title", label: "Titre", type: "text", scope: "settings" },
  { key: "subtitle", label: "Sous-titre", type: "text", scope: "settings" },
  { key: "text", label: "Texte", type: "textarea", scope: "settings" },
  { key: "image", label: "Image", type: "image", scope: "settings" },
  { key: "cta_label", label: "Bouton", type: "text", scope: "settings" }
];
function inspectorGroupsForSection(type) {
  const content = type === "customCode" ? [{ key: "html", label: "HTML", type: "code", scope: "settings" }, { key: "css", label: "CSS", type: "code", scope: "settings" }, { key: "js", label: "JavaScript", type: "code", scope: "settings" }] : CONTENT;
  return [
    { id: "content", label: "Contenu", controls: content },
    { id: "style", label: "Style", controls: [{ key: "backgroundColor", label: "Arri\xE8re-plan", type: "color", scope: "style" }, { key: "color", label: "Texte", type: "color", scope: "style" }] },
    { id: "layout", label: "Disposition", controls: [{ key: "paddingTop", label: "Espace sup\xE9rieur", type: "number", scope: "style" }, { key: "paddingBottom", label: "Espace inf\xE9rieur", type: "number", scope: "style" }, { key: "textAlign", label: "Alignement", type: "select", scope: "style", options: ["left", "center", "right"] }] },
    { id: "responsive", label: "Responsive", controls: [{ key: "paddingTop", label: "Espace sur cet \xE9cran", type: "number", scope: "responsive" }] },
    { id: "animation", label: "Animation", controls: [{ key: "animation", label: "Entr\xE9e", type: "select", scope: "style", options: ["none", "fade", "reveal"] }] }
  ];
}

// src/editor/ui/controls.ts
function escape(value2) {
  return String(value2 ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function controlValue(section2, control, breakpoint) {
  if (control.scope === "settings") return section2.settings[control.key];
  if (control.scope === "responsive") return section2.responsive[breakpoint]?.[control.key];
  return section2.style[control.key];
}
function inspectorControlMarkup(section2, control, breakpoint) {
  const value2 = controlValue(section2, control, breakpoint);
  const attrs = `data-inspector-control="${control.type}" data-inspector-scope="${control.scope}" data-inspector-key="${control.key}"`;
  if (control.type === "textarea" || control.type === "code") return `<label class="editor-control"><span>${control.label}</span><textarea ${attrs} rows="${control.type === "code" ? 8 : 4}">${escape(value2)}</textarea></label>`;
  const optionLabels = { left: "Gauche", center: "Centre", right: "Droite", none: "Aucune", fade: "Fondu", reveal: "R\xE9v\xE9lation" };
  if (control.type === "select") return `<label class="editor-control"><span>${control.label}</span><select ${attrs}>${control.options?.map((option) => `<option value="${option}"${value2 === option ? " selected" : ""}>${optionLabels[option] ?? option}</option>`).join("")}</select></label>`;
  if (control.type === "toggle") return `<label class="editor-control editor-control--toggle"><span>${control.label}</span><input type="checkbox" ${attrs}${value2 ? " checked" : ""}></label>`;
  const inputType = control.type === "number" ? "number" : control.type === "color" ? "color" : "text";
  return `<label class="editor-control"><span>${control.label}</span><input type="${inputType}" ${attrs} value="${escape(value2)}">${control.type === "image" && value2 ? `<button type="button" class="editor-image-ai" data-image-ai data-image-key="${control.key}">\u2726 Modifier avec l\u2019IA</button>` : ""}</label>`;
}

// src/editor/ui/inspector.ts
function inspectorChangeFromControl(input) {
  if (!["settings", "style", "responsive"].includes(input.scope) || !/^[a-z][a-z0-9_]*$/i.test(input.key)) return null;
  const value2 = input.type === "number" ? Number(input.value) : input.type === "toggle" ? input.checked : input.value;
  if (input.type === "number" && !Number.isFinite(value2)) return null;
  return { scope: input.scope, key: input.key, value: value2, breakpoint: input.breakpoint };
}
function selectedSection(state) {
  return state.document.pages.flatMap((page) => page.sections).find((section2) => section2.id === state.selectedId);
}
function inspectorMarkup(state) {
  const section2 = selectedSection(state);
  if (!section2) return `<div class="editor-inspector-empty"><strong>S\xE9lectionne une section</strong><p>Clique dans la page ou dans la structure pour modifier son contenu et son style.</p></div>`;
  const groups = inspectorGroupsForSection(section2.type);
  return `<div class="editor-inspector" data-inspector-section="${section2.id}"><div class="editor-inspector-tabs">${groups.map((group) => `<button type="button" data-inspector-tab="${group.id}">${group.label}</button>`).join("")}</div>${groups.map((group, index) => `<section data-inspector-group="${group.id}"${index ? " hidden" : ""}><h3>${group.label}</h3>${group.controls.map((control) => inspectorControlMarkup(section2, control, state.breakpoint)).join("")}</section>`).join("")}</div>`;
}
function applyInspectorValue(store, change) {
  const sectionId = store.getState().selectedId;
  if (!sectionId) return;
  if (/color/i.test(change.key) && change.value !== null && (typeof change.value !== "string" || !/^#[0-9a-f]{6}$/i.test(change.value))) {
    throw new Error("Couleur invalide");
  }
  if (change.scope === "settings") store.dispatch({ type: "updateSetting", sectionId, key: change.key, value: change.value });
  if (change.scope === "style") store.dispatch({ type: "updateStyle", sectionId, key: change.key, value: change.value });
  if (change.scope === "responsive") store.dispatch({ type: "updateResponsiveStyle", sectionId, breakpoint: change.breakpoint ?? store.getState().breakpoint, key: change.key, value: change.value });
}
function bindInspector(root, store) {
  const click = async (event) => {
    const imageButton = event.target.closest("[data-image-ai]");
    if (imageButton) {
      const state = store.getState();
      const section2 = selectedSection(state);
      const key = imageButton.dataset.imageKey ?? "image";
      const sourceUrl = section2?.settings[key];
      if (!section2 || typeof sourceUrl !== "string" || !sourceUrl) return;
      const prompt = window.prompt("D\xE9cris la nouvelle sc\xE8ne. Weflo conservera exactement le m\xEAme produit.", "Place exactement ce produit dans une sc\xE8ne premium avec une composition pens\xE9e pour la conversion");
      if (!prompt) return;
      imageButton.disabled = true;
      imageButton.textContent = "G\xE9n\xE9ration\u2026";
      try {
        const response = await fetch("/api/images/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl, prompt }) });
        const body = await response.json();
        if (!response.ok || !body.url) throw new Error(body.message || "La g\xE9n\xE9ration de l\u2019image a \xE9chou\xE9.");
        store.dispatch({ type: "updateSetting", sectionId: section2.id, key, value: body.url });
        const latest = store.getState();
        store.setState({ document: { ...latest.document, assets: [...latest.document.assets, { id: `ai-image-${Date.now()}`, type: "image", url: body.url, alt: `Image IA \u2014 ${section2.name}` }] }, saveStatus: "modified" });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "La g\xE9n\xE9ration de l\u2019image a \xE9chou\xE9.");
      }
      return;
    }
    const tab = event.target.closest("[data-inspector-tab]");
    if (!tab) return;
    const inspector = tab.closest("[data-inspector-section]");
    inspector?.querySelectorAll("[data-inspector-group]").forEach((group) => {
      group.hidden = group.dataset.inspectorGroup !== tab.dataset.inspectorTab;
    });
  };
  const change = (event) => {
    const control = event.target.closest("[data-inspector-control]");
    if (!control) return;
    const normalized = inspectorChangeFromControl({
      scope: control.dataset.inspectorScope ?? "",
      key: control.dataset.inspectorKey ?? "",
      type: control.dataset.inspectorControl ?? "text",
      value: control.value,
      checked: control instanceof HTMLInputElement ? control.checked : false,
      breakpoint: store.getState().breakpoint
    });
    if (normalized) applyInspectorValue(store, normalized);
  };
  root.addEventListener("click", click);
  root.addEventListener("change", change);
  return () => {
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
  };
}

// src/editor/render/render-section.ts
function escapeEditorHtml(value2) {
  return value2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function text(section2, ...keys) {
  for (const key of keys) {
    const value2 = section2.settings[key];
    if (typeof value2 === "string" && value2.trim()) return escapeEditorHtml(value2.trim());
  }
  return "";
}
function safeMedia(value2) {
  if (typeof value2 !== "string") return "";
  if (/^\/(?!\/)/.test(value2) || /^https?:\/\//i.test(value2)) return escapeEditorHtml(value2);
  return "";
}
function blocks(section2) {
  return section2.blocks.map((block2) => {
    const label = typeof block2.settings.label === "string" ? block2.settings.label : typeof block2.settings.text === "string" ? block2.settings.text : block2.type;
    return `<div class="wf-v2-block" data-wf-block-id="${escapeEditorHtml(block2.id)}">${escapeEditorHtml(label)}</div>`;
  }).join("");
}
function editable(tag, key, value2, className = "") {
  const cls = className ? ` class="${className}"` : "";
  return `<${tag}${cls} data-wf-edit-key="${key}">${value2}</${tag}>`;
}
function renderKnownSection(section2, pageName) {
  const title = text(section2, "title", "heading") || escapeEditorHtml(pageName);
  const subtitle = text(section2, "subtitle", "subheading");
  const body = text(section2, "text", "body");
  const price = text(section2, "price");
  const cta2 = text(section2, "cta", "cta_label", "button") || "D\xE9couvrir";
  const image2 = safeMedia(section2.settings.image);
  const variant = text(section2, "variant") || "default";
  const media3 = image2 ? `<figure class="wf-v2-media"><img src="${image2}" alt="${title}"></figure>` : `<div class="wf-v2-media wf-v2-media--empty" aria-label="Image \xE0 ajouter"></div>`;
  const blockMarkup = blocks(section2);
  switch (section2.type) {
    case "navigation":
      return `<nav class="wf-v2-wrap wf-v2-nav">${editable("strong", "title", title)}<div>${blockMarkup || '<a href="#product">Produit</a><a href="#story">Histoire</a>'}</div><a href="#cart">Panier</a></nav>`;
    case "footer":
      return `<footer class="wf-v2-wrap wf-v2-footer"><strong>${title}</strong><span>Con\xE7u avec Weflo</span>${blockMarkup}</footer>`;
    case "productHero":
      return `<div class="wf-v2-wrap wf-v2-split wf-v2-hero--${variant}">${variant === "problem-solution" ? '<span class="wf-v2-problem-label">Le probl\xE8me, r\xE9solu.</span>' : ""}${media3}<div>${subtitle ? editable("p", "subtitle", subtitle, "wf-v2-kicker") : ""}${editable("h1", "title", title)}${body ? editable("p", "text", body) : ""}${price ? editable("strong", "price", price, "wf-v2-price") : ""}<a class="wf-v2-button" href="#buy">${cta2}</a>${blockMarkup}</div></div>`;
    case "productMain":
      return `<div class="wf-v2-wrap wf-v2-product wf-v2-product--${variant}"><div class="wf-v2-product__gallery">${media3}<div class="wf-v2-product__thumbs"><button>Image 1</button><button>Image 2</button></div></div><div class="wf-v2-product__buy-box">${editable("h1", "title", title)}${editable("p", "text", body)}<div class="wf-v2-product__prices">${editable("strong", "price", price, "wf-v2-price")}<s data-wf-edit-key="compare_at_price">${text(section2, "compare_at_price")}</s></div>${blockMarkup}<label>Quantit\xE9<input type="number" value="1" min="1"></label><div class="wf-v2-product__bundle">Solo \xB7 Duo \xB7 Pack</div><button class="wf-v2-button">${cta2}</button><p>Paiement s\xE9curis\xE9 \xB7 Commande suivie</p></div><div class="wf-v2-product__sticky"><span>${title}</span><strong>${price}</strong><button>${cta2}</button></div></div>`;
    case "hero":
      return `<div class="wf-v2-wrap wf-v2-split"><div>${subtitle ? editable("p", "subtitle", subtitle, "wf-v2-kicker") : ""}${editable("h1", "title", title)}${body ? editable("p", "text", body) : ""}<a class="wf-v2-button" href="#start">${cta2}</a>${blockMarkup}</div>${media3}</div>`;
    case "bundle":
    case "cta":
      return `<div class="wf-v2-wrap wf-v2-band"><div>${editable("p", "subtitle", subtitle || section2.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}</div><div>${price ? editable("strong", "price", price, "wf-v2-price") : ""}<a class="wf-v2-button" href="#buy">${cta2}</a></div>${blockMarkup}</div>`;
    case "faq":
      return `<div class="wf-v2-wrap wf-v2-content">${editable("h2", "title", title)}<details open><summary>${title}</summary>${editable("p", "text", body)}</details>${blockMarkup}</div>`;
    case "atelier":
    case "article":
      return `<div class="wf-v2-wrap wf-v2-split">${media3}<div>${editable("p", "subtitle", subtitle || section2.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}${blockMarkup}</div></div>`;
    default:
      return `<div class="wf-v2-wrap wf-v2-content">${editable("p", "subtitle", subtitle || section2.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}<div class="wf-v2-grid">${blockMarkup || `<article><h3>${title}</h3><p>${body || "Pens\xE9 dans les moindres d\xE9tails."}</p></article><article><h3>Simple</h3><p>Une exp\xE9rience claire.</p></article><article><h3>Durable</h3><p>Fait pour durer.</p></article>`}</div></div>`;
  }
}

// src/editor/render/registry.ts
var renderers = /* @__PURE__ */ new Map();
function rendererForSection(type) {
  const definition = getSectionDefinition(type);
  return renderers.get(type) ?? (definition ? (section2, pageName) => definition.renderWeb({ section: section2, pageName }) : renderKnownSection);
}

// src/editor/render/render-document.ts
function cssName(value2) {
  return value2.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).replace(/[^a-z0-9-]/g, "");
}
function cssValue(key, value2) {
  if (typeof value2 === "number" && !/^(opacity|zIndex|fontWeight|lineHeight)$/.test(key)) return `${value2}px`;
  return String(value2);
}
function styleRule(sectionId, style) {
  const declarations = Object.entries(style).filter(([, value2]) => value2 !== null).map(([key, value2]) => `${cssName(key)}:${cssValue(key, value2)}`).join(";");
  return declarations ? `[data-wf-section-id="${escapeEditorHtml(sectionId)}"]{${declarations}}` : "";
}
function sectionStyles(section2) {
  const desktop = styleRule(section2.id, section2.style);
  const tablet = styleRule(section2.id, section2.responsive.tablet ?? {});
  const mobile = styleRule(section2.id, section2.responsive.mobile ?? {});
  return `${desktop}${tablet ? `@media(max-width:1000px){${tablet}}` : ""}${mobile ? `@media(max-width:700px){${mobile}}` : ""}`;
}
function themeFont(display) {
  if (display === "serif") return "Georgia,'Times New Roman',serif";
  if (display === "condensed") return "'Arial Narrow',Impact,sans-serif";
  return "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";
}
function safeFont(value2, fallback) {
  const allowed = /* @__PURE__ */ new Set(["Inter", "DM Sans", "Manrope", "Space Grotesk", "Playfair Display", "Libre Baskerville"]);
  return allowed.has(value2 ?? "") ? `'${value2}',${fallback}` : fallback;
}
function renderEditorDocument(document2, options) {
  const page = document2.pages[0];
  const sections = page.sections.filter((section2) => options.mode === "edit" || !section2.hidden).map((section2) => {
    const selected = options.mode === "edit" && section2.id === options.selectedId ? ' data-wf-selected="true"' : "";
    const hidden = options.mode === "edit" && section2.hidden ? ' data-wf-hidden="true"' : "";
    return `<section data-wf-section-id="${escapeEditorHtml(section2.id)}" data-wf-section-type="${escapeEditorHtml(section2.type)}"${selected}${hidden}>${rendererForSection(section2.type)(section2, page.name)}</section>`;
  }).join("");
  const theme = document2.theme;
  const radius = theme.radius === "none" ? "0px" : theme.radius === "round" ? "36px" : "18px";
  const headingFont = safeFont(document2.commerce?.brandKit.headingFont, themeFont(theme.display));
  const bodyFont = safeFont(document2.commerce?.brandKit.bodyFont, "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif");
  const scopedStyles = `body{font-family:${bodyFont}}.wf-section h1,.wf-section h2,.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-family:${headingFont}}${page.sections.map(sectionStyles).join("")}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEditorHtml(document2.name)}</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${theme.background};color:${theme.ink};font:15px/1.5 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}a{color:inherit}.wf-section{width:min(1180px,calc(100% - 56px));margin-inline:auto;padding-block:clamp(54px,8vw,112px)}.wf-section h1,.wf-section h2{max-width:900px;margin:.12em 0 .35em;font-family:${themeFont(theme.display)};font-size:clamp(42px,6.5vw,92px);font-weight:700;line-height:.94;letter-spacing:-.055em}.wf-section__eyebrow{text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.15em}.wf-section__copy{max-width:650px;font-size:clamp(17px,2vw,22px);line-height:1.45}.wf-section__button,.wf-section button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:24px;padding:0 22px;border:0;border-radius:${radius};background:${theme.ink};color:${theme.surface};font-weight:800;text-decoration:none;cursor:pointer}.wf-section__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:38px}.wf-section__card{padding:24px;border:1px solid color-mix(in srgb,${theme.ink} 14%,transparent);border-radius:${radius};background:${theme.surface}}.wf-section__card img,.wf-section__image{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:${radius}}.wf-media-empty{min-height:360px;background:linear-gradient(135deg,${theme.surface},color-mix(in srgb,${theme.accent} 70%,${theme.background}));border:1px dashed color-mix(in srgb,${theme.ink} 25%,transparent)}.wf-navigation{min-height:76px;padding-block:0;display:flex;align-items:center;justify-content:space-between;gap:24px}.wf-navigation>div{display:flex;gap:24px}.wf-navigation a{text-decoration:none}.wf-navigation__brand{font-weight:900;font-size:20px}.wf-navigation .wf-section__button{margin-top:0;min-height:40px}.wf-announcement{width:100%;padding:10px 28px;display:flex;justify-content:center;align-items:center;gap:18px;background:${theme.accent};text-align:center}.wf-announcement p{margin:0}.wf-announcement .wf-section__button{min-height:auto;margin:0;padding:0;background:transparent;color:inherit;text-decoration:underline}.wf-hero,.wf-image-text{min-height:680px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(32px,7vw,100px)}.wf-hero figure{margin:0}.wf-hero .wf-section__image,.wf-image-text>.wf-section__image{aspect-ratio:4/5;min-height:560px}.wf-video-hero{position:relative;width:100%;min-height:760px;padding:80px;display:grid;align-items:end;color:#fff;overflow:hidden}.wf-video-hero video,.wf-video-hero>.wf-section__image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.62)}.wf-video-hero>div{position:relative;z-index:1}.wf-gallery .wf-section__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wf-before-after__media{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:36px}.wf-product form{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin-top:28px}.wf-product label{display:grid;gap:6px}.wf-product input,.wf-product select,.wf-form input{min-height:48px;padding:0 12px;border:1px solid color-mix(in srgb,${theme.ink} 25%,transparent);border-radius:10px;background:${theme.background}}.wf-bundle fieldset,.wf-quiz fieldset{display:grid;gap:8px;margin-top:28px;padding:20px;border:1px solid color-mix(in srgb,${theme.ink} 18%,transparent);border-radius:${radius}}.wf-bundle label{display:grid;grid-template-columns:auto 1fr auto;gap:12px;padding:12px}.wf-bundle__total{display:block;margin-top:18px;font-size:22px;font-weight:800}.wf-faq details{padding:20px 0;border-bottom:1px solid color-mix(in srgb,${theme.ink} 18%,transparent)}.wf-faq summary{font-size:20px;font-weight:700;cursor:pointer}.wf-form form{display:flex;gap:10px;margin-top:30px}.wf-form label{display:grid;gap:5px;flex:1;max-width:440px}.wf-cta{width:min(1180px,calc(100% - 56px));margin-block:56px;padding:clamp(38px,7vw,90px);border-radius:${radius};background:${theme.accent}}.wf-footer{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid color-mix(in srgb,${theme.ink} 18%,transparent)}.wf-v2-wrap{width:min(1180px,calc(100% - 56px));margin-inline:auto}.wf-v2-nav,.wf-v2-footer{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:24px}.wf-v2-nav>div{display:flex;gap:20px}.wf-v2-nav a{text-decoration:none}.wf-v2-split{min-height:620px;padding-block:52px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(28px,6vw,88px)}.wf-v2-media{margin:0;min-height:500px;background:${theme.surface};border-radius:${radius};overflow:hidden}.wf-v2-media img{display:block;width:100%;height:100%;min-height:500px;object-fit:cover}.wf-v2-media--empty{background:linear-gradient(145deg,${theme.surface},${theme.accent})}.wf-v2-kicker{text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.14em}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-family:${themeFont(theme.display)};font-size:clamp(42px,6vw,84px);line-height:.96;letter-spacing:-.045em;margin:.2em 0}.wf-v2-price{display:block;font-size:26px;margin-top:24px}.wf-v2-button{display:inline-flex;margin-top:22px;padding:14px 22px;border-radius:999px;background:${theme.ink};color:${theme.surface};font-weight:800;text-decoration:none}.wf-v2-content{padding-block:90px;border-top:1px solid color-mix(in srgb,${theme.ink} 16%,transparent)}.wf-v2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.wf-v2-grid article,.wf-v2-block{padding:22px;background:${theme.surface};border-radius:${radius}}.wf-v2-band{margin-block:56px;padding:44px;background:${theme.accent};border-radius:${radius};display:grid;grid-template-columns:1fr auto;gap:40px}.wf-v2-footer{border-top:1px solid ${theme.ink}}body[data-wf-mode="edit"] [data-wf-selected="true"]{outline:2px solid #315efb;outline-offset:-2px}body[data-wf-mode="edit"] [data-wf-hidden="true"]{opacity:.42}
@media(max-width:700px){.wf-section{width:calc(100% - 28px);padding-block:54px}.wf-navigation>div{display:none}.wf-hero,.wf-image-text,.wf-footer{grid-template-columns:1fr;min-height:auto}.wf-hero .wf-section__image,.wf-image-text>.wf-section__image{min-height:390px}.wf-section__grid,.wf-gallery .wf-section__grid,.wf-before-after__media{grid-template-columns:1fr}.wf-video-hero{min-height:640px;padding:32px 20px}.wf-form form{display:grid}.wf-v2-wrap{width:calc(100% - 28px)}.wf-v2-nav>div{display:none}.wf-v2-split{grid-template-columns:1fr;min-height:auto;padding-block:24px}.wf-v2-media,.wf-v2-media img{min-height:390px}.wf-v2-grid{grid-template-columns:1fr}.wf-v2-band{grid-template-columns:1fr;padding:28px}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-size:48px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}${scopedStyles}</style></head><body data-wf-mode="${options.mode}" data-wf-breakpoint="${options.breakpoint}">${sections}</body></html>`;
}

// src/editor/ui/canvas-bridge.ts
function parseCanvasBridgeMessage(value2) {
  if (!value2 || typeof value2 !== "object") return null;
  const message = value2;
  if (message.source !== "weflo-canvas") return null;
  if (typeof message.sectionId !== "string" || !/^[a-z0-9_-]+$/i.test(message.sectionId)) return null;
  if (message.type === "canvas:select") return { type: "select", sectionId: message.sectionId };
  if (message.type === "canvas:inline-edit" && typeof message.key === "string" && /^[a-z][a-z0-9_]*$/i.test(message.key) && typeof message.value === "string") {
    return { type: "inlineEdit", sectionId: message.sectionId, key: message.key, value: message.value };
  }
  if (message.type === "canvas:image-edit" && typeof message.key === "string" && /^[a-z][a-z0-9_]*$/i.test(message.key)) return { type: "imageEdit", sectionId: message.sectionId, key: message.key };
  if (message.type === "canvas:move" && typeof message.toIndex === "number" && Number.isInteger(message.toIndex) && message.toIndex >= 0) {
    return { type: "move", sectionId: message.sectionId, toIndex: message.toIndex };
  }
  const actions = ["moveUp", "moveDown", "duplicate", "hide", "remove"];
  if (message.type === "canvas:action" && actions.includes(message.action)) {
    return { type: "action", sectionId: message.sectionId, action: message.action };
  }
  return null;
}

// src/editor/ui/canvas-runtime.ts
var CANVAS_RUNTIME = `<style>.wf-canvas-toolbar{position:absolute;z-index:9999;display:flex;gap:2px;padding:3px;border-radius:7px;background:#141310;color:#fff;transform:translateY(-100%)}.wf-canvas-toolbar button{border:0;padding:6px 8px;background:transparent;color:inherit;font:600 11px/1 sans-serif;cursor:pointer}[data-wf-section-id]{position:relative}[data-wf-section-id][draggable="true"]{cursor:grab}[data-wf-edit-key][contenteditable="true"]{outline:2px solid #315efb;outline-offset:3px}</style><script>(()=>{
  const post=(type,payload={})=>parent.postMessage({source:"weflo-canvas",type,...payload},location.origin);
  let dragging=null;
  const toolbar=(section,imageKey)=>{document.querySelector("[data-canvas-toolbar]")?.remove();const bar=document.createElement("div");bar.className="wf-canvas-toolbar";bar.dataset.canvasToolbar="";bar.innerHTML=(imageKey?'<button data-canvas-action="editImage">\u2726 Modifier avec l\u2019IA</button>':'')+'<button data-canvas-action="moveUp" title="Monter">\u2191</button><button data-canvas-action="moveDown" title="Descendre">\u2193</button><button data-canvas-action="duplicate">Dupliquer</button><button data-canvas-action="hide">Masquer</button><button data-canvas-action="remove">Supprimer</button>';bar.addEventListener("click",e=>{const action=e.target.closest("[data-canvas-action]")?.dataset.canvasAction;if(action==="editImage")post("canvas:image-edit",{sectionId:section.dataset.wfSectionId,key:imageKey});else if(action)post("canvas:action",{sectionId:section.dataset.wfSectionId,action})});section.prepend(bar)};
  document.addEventListener("click",event=>{
    if(document.body.dataset.wfMode!=="edit")return;
    const section=event.target.closest("[data-wf-section-id]");
    if(!section)return;
    event.preventDefault();
    event.stopPropagation();
    post("canvas:select",{sectionId:section.dataset.wfSectionId});
    toolbar(section,event.target.closest("[data-wf-media-key]")?.dataset.wfMediaKey);
  },true);
  document.querySelectorAll("[data-wf-section-id]").forEach(section=>{section.draggable=true;section.addEventListener("dragstart",()=>{dragging=section.dataset.wfSectionId});section.addEventListener("dragover",event=>event.preventDefault());section.addEventListener("drop",event=>{event.preventDefault();if(!dragging)return;const siblings=[...section.parentElement.querySelectorAll(":scope > [data-wf-section-id]")];post("canvas:move",{sectionId:dragging,toIndex:siblings.indexOf(section)});dragging=null})});
  document.addEventListener("dblclick",event=>{if(document.body.dataset.wfMode!=="edit")return;const editable=event.target.closest("[data-wf-edit-key]");if(!editable)return;editable.setAttribute("contenteditable","true");editable.focus()});
  document.addEventListener("submit",event=>{if(document.body.dataset.wfMode==="edit")event.preventDefault()},true);
  document.addEventListener("focusout",event=>{const editable=event.target.closest?.("[data-wf-edit-key][contenteditable="true"]");if(!editable)return;editable.removeAttribute("contenteditable");const section=editable.closest("[data-wf-section-id]");post("canvas:inline-edit",{sectionId:section.dataset.wfSectionId,key:editable.dataset.wfEditKey,value:editable.textContent||""})},true);
})();<\/script>`;

// src/editor/ui/drag-sections.ts
function sectionMoveTarget(document2, sectionId, direction) {
  for (const page of document2.pages) {
    const index = page.sections.findIndex((section2) => section2.id === sectionId);
    if (index < 0) continue;
    const target = index + direction;
    if (target < 0 || target >= page.sections.length) return null;
    return { pageId: page.id, toIndex: direction > 0 ? target + 1 : target };
  }
  return null;
}

// src/editor/ui/canvas.ts
function viewportLayout(breakpoint, availableWidth) {
  const available = Math.max(1, Math.floor(availableWidth));
  if (breakpoint === "desktop") {
    if (available >= 700) return { width: available, zoom: 1 };
    return { width: 1440, zoom: Number((available / 1440).toFixed(4)) };
  }
  const target = breakpoint === "tablet" ? 834 : 390;
  return available >= target ? { width: target, zoom: 1 } : { width: target, zoom: Number((available / target).toFixed(4)) };
}
function canvasSrcdoc(document2, options) {
  const html = renderEditorDocument(document2, {
    mode: options.mode,
    breakpoint: options.breakpoint,
    ...options.selectedId ? { selectedId: options.selectedId } : {}
  });
  return options.mode === "edit" ? html.replace("</body>", `${CANVAS_RUNTIME}</body>`) : html;
}
function mountCanvas(container, store) {
  const iframe = document.createElement("iframe");
  iframe.title = "Aper\xE7u de la page";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  iframe.style.cssText = "display:block;height:100%;min-height:900px;border:0;background:#fff;transform-origin:top left";
  container.replaceChildren(iframe);
  let lastDocument = null;
  let lastViewKey = "";
  const paint = (force = false) => {
    const state = store.getState();
    const layout = viewportLayout(state.breakpoint, container.clientWidth || 1440);
    const viewKey = `${state.mode}:${state.breakpoint}:${state.selectedId ?? ""}:${layout.width}:${layout.zoom}`;
    if (!force && state.document === lastDocument && viewKey === lastViewKey) return;
    lastDocument = state.document;
    lastViewKey = viewKey;
    iframe.width = String(layout.width);
    iframe.style.width = `${layout.width}px`;
    iframe.style.transform = layout.zoom === 1 ? "none" : `scale(${layout.zoom})`;
    iframe.srcdoc = canvasSrcdoc(state.document, { mode: state.mode, breakpoint: state.breakpoint, selectedId: state.selectedId });
  };
  const receive = async (event) => {
    if (event.source !== iframe.contentWindow) return;
    const action = parseCanvasBridgeMessage(event.data);
    if (!action) return;
    if (action.type === "select") store.setState({ selectedId: action.sectionId, rightCollapsed: false });
    if (action.type === "inlineEdit") store.dispatch({ type: "updateSetting", sectionId: action.sectionId, key: action.key, value: action.value });
    if (action.type === "imageEdit") {
      const section2 = store.getState().document.pages.flatMap((page) => page.sections).find((item) => item.id === action.sectionId);
      const sourceUrl = section2?.settings[action.key];
      const prompt = typeof sourceUrl === "string" ? window.prompt("D\xE9cris la nouvelle sc\xE8ne. Le produit restera exactement le m\xEAme.", "Place exactement ce produit dans une sc\xE8ne premium") : null;
      if (section2 && typeof sourceUrl === "string" && prompt) {
        try {
          const response = await fetch("/api/images/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl, prompt }) });
          const result = await response.json();
          if (!response.ok || !result.url) throw new Error(result.message || "La modification de l\u2019image a \xE9chou\xE9.");
          store.dispatch({ type: "updateSetting", sectionId: section2.id, key: action.key, value: result.url });
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "La modification de l\u2019image a \xE9chou\xE9.");
        }
      }
    }
    if (action.type === "move") store.dispatch({ type: "moveSection", sectionId: action.sectionId, toPageId: store.getState().pageId, toIndex: action.toIndex });
    if (action.type === "action") {
      if (action.action === "hide") store.dispatch({ type: "toggleHidden", sectionId: action.sectionId });
      if (action.action === "remove") store.dispatch({ type: "removeSection", sectionId: action.sectionId });
      if (action.action === "duplicate") store.dispatch({ type: "duplicateSection", sectionId: action.sectionId, newSectionId: `${action.sectionId}-copy-${Date.now()}` });
      if (action.action === "moveUp" || action.action === "moveDown") {
        const target = sectionMoveTarget(store.getState().document, action.sectionId, action.action === "moveUp" ? -1 : 1);
        if (target) store.dispatch({ type: "moveSection", sectionId: action.sectionId, toPageId: target.pageId, toIndex: target.toIndex });
      }
    }
  };
  const resize = new ResizeObserver(() => paint(true));
  resize.observe(container);
  window.addEventListener("message", receive);
  const unsubscribe = store.subscribe(() => paint());
  paint(true);
  return () => {
    resize.disconnect();
    window.removeEventListener("message", receive);
    unsubscribe();
  };
}

// src/editor/ui/shell.ts
function runEditorShellAction(store, action) {
  if (action === "undo") store.undo();
  if (action === "redo") store.redo();
  if (action === "desktop" || action === "tablet" || action === "mobile") store.setState({ breakpoint: action });
  if (action === "preview") store.setState((state) => ({ mode: state.mode === "edit" ? "preview" : "edit" }));
  if (action === "collapseLeft") store.setState((state) => ({ leftCollapsed: !state.leftCollapsed }));
  if (action === "collapseRight") store.setState((state) => ({ rightCollapsed: !state.rightCollapsed }));
}
var ICONS = {
  add: "+",
  commerce: "\u25A3",
  structure: "\u2637",
  layers: "\u25C9",
  pages: "\u25A4",
  media: "\u25A7"
};
var LABELS = {
  add: "Ajouter une section",
  commerce: "Produit et offre",
  structure: "Sections",
  layers: "Marque et style",
  pages: "Pages",
  media: "M\xE9dias"
};
function editorShellMarkup(state) {
  const rail = Object.entries(LABELS).map(([id2, label]) => `<button type="button" data-editor-panel-button="${id2}" aria-label="${label}" aria-pressed="${state.activePanel === id2}"><span aria-hidden="true">${ICONS[id2]}</span><small>${label}</small></button>`).join("");
  return `<div class="weflo-editor" data-editor-shell data-active-panel="${state.activePanel}" data-left-collapsed="${state.leftCollapsed}" data-right-collapsed="${state.rightCollapsed}">
    <header class="weflo-editor__topbar" data-editor-topbar>
      <div class="weflo-editor__identity"><a href="/dashboard" aria-label="Retour au tableau de bord">W</a><strong>${state.document.name}</strong></div>
      <div class="weflo-editor__history"><button type="button" data-editor-undo aria-label="Annuler">\u21B6</button><button type="button" data-editor-redo aria-label="R\xE9tablir">\u21B7</button></div>
      <div class="weflo-editor__viewports" aria-label="Taille de l\u2019aper\xE7u"><button type="button" data-editor-breakpoint="desktop" aria-pressed="${state.breakpoint === "desktop"}" title="Ordinateur">\u25B0</button><button type="button" data-editor-breakpoint="tablet" aria-pressed="${state.breakpoint === "tablet"}" title="Tablette">\u25AF</button><button type="button" data-editor-breakpoint="mobile" aria-pressed="${state.breakpoint === "mobile"}" title="Mobile">\u25AF</button></div>
      <span class="weflo-editor__save" data-editor-save-status="${state.saveStatus}">${state.saveStatus === "saved" ? "Enregistr\xE9" : "Modifi\xE9"}</span>
      <button type="button" data-editor-preview>${state.mode === "edit" ? "Aper\xE7u" : "Modifier"}</button>
      <button type="button" class="weflo-editor__publish" data-editor-publish>Publier</button>
    </header>
    <nav class="weflo-editor__rail" data-editor-left-rail aria-label="Outils de l\u2019\xE9diteur">${rail}</nav>
    <aside class="weflo-editor__sidebar" data-editor-sidebar><header><strong>${LABELS[state.activePanel]}</strong><button type="button" data-editor-collapse-left aria-label="Fermer le panneau">\xD7</button></header><div data-editor-sidebar-content>${editorPanelMarkup(state)}</div></aside>
    <main class="weflo-editor__stage" data-editor-canvas><div class="weflo-editor__viewport" data-editor-viewport data-breakpoint="${state.breakpoint}"></div></main>
    <aside class="weflo-editor__inspector" data-editor-inspector><header><strong>R\xE9glages</strong><button type="button" data-editor-collapse-right aria-label="Fermer les r\xE9glages">\xD7</button></header><div data-editor-inspector-content>${inspectorMarkup(state)}</div></aside>
    <section class="weflo-editor__canardo" data-editor-canardo><span aria-hidden="true">\u{1F425}</span><input aria-label="Demander \xE0 Canardo" placeholder="D\xE9cris une section ou une modification\u2026"><button type="button" data-canardo-send aria-label="Envoyer \xE0 Canardo">\u2191</button></section>
  </div>`;
}
function mountEditorShell(root, store) {
  root.innerHTML = editorShellMarkup(store.getState());
  const viewport = root.querySelector("[data-editor-viewport]");
  if (!viewport) throw new Error("Editor viewport missing");
  const unmountCanvas = mountCanvas(viewport, store);
  const patch = (state) => {
    const shell = root.querySelector("[data-editor-shell]");
    if (shell) {
      shell.dataset.activePanel = state.activePanel;
      shell.dataset.leftCollapsed = String(state.leftCollapsed);
      shell.dataset.rightCollapsed = String(state.rightCollapsed);
    }
    root.querySelectorAll("[data-editor-panel-button]").forEach((button2) => button2.setAttribute("aria-pressed", String(button2.dataset.editorPanelButton === state.activePanel)));
    const sidebarTitle = root.querySelector("[data-editor-sidebar]>header strong");
    if (sidebarTitle) sidebarTitle.textContent = LABELS[state.activePanel];
    const sidebar = root.querySelector("[data-editor-sidebar-content]");
    if (sidebar) sidebar.innerHTML = editorPanelMarkup(state);
    const inspector = root.querySelector("[data-editor-inspector-content]");
    if (inspector) inspector.innerHTML = inspectorMarkup(state);
    root.querySelectorAll("[data-editor-breakpoint]").forEach((button2) => button2.setAttribute("aria-pressed", String(button2.dataset.editorBreakpoint === state.breakpoint)));
    const save = root.querySelector("[data-editor-save-status]");
    if (save) {
      save.dataset.editorSaveStatus = state.saveStatus;
      save.textContent = state.saveStatus === "saved" ? "Enregistr\xE9" : state.saveStatus === "saving" ? "Enregistrement\u2026" : "Modifi\xE9";
    }
    const preview = root.querySelector("[data-editor-preview]");
    if (preview) preview.textContent = state.mode === "edit" ? "Aper\xE7u" : "Modifier";
  };
  const unsubscribe = store.subscribe(patch);
  const unbind = bindLeftRail(root, store);
  const unbindInspector = bindInspector(root, store);
  const topbarClick = (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.matches("[data-editor-undo]")) runEditorShellAction(store, "undo");
    if (target.matches("[data-editor-redo]")) runEditorShellAction(store, "redo");
    if (target.matches("[data-editor-preview]")) runEditorShellAction(store, "preview");
    if (target.matches("[data-editor-collapse-left]")) runEditorShellAction(store, "collapseLeft");
    if (target.matches("[data-editor-collapse-right]")) runEditorShellAction(store, "collapseRight");
    const breakpoint = target.dataset.editorBreakpoint;
    if (breakpoint === "desktop" || breakpoint === "tablet" || breakpoint === "mobile") runEditorShellAction(store, breakpoint);
  };
  root.addEventListener("click", topbarClick);
  return () => {
    unsubscribe();
    unbind();
    unbindInspector();
    unmountCanvas();
    root.removeEventListener("click", topbarClick);
  };
}

// src/editor/commands.ts
var EditorCommandError = class extends Error {
};
function clone(value2) {
  return structuredClone(value2);
}
function sectionLocation(document2, sectionId) {
  for (let pageIndex = 0; pageIndex < document2.pages.length; pageIndex += 1) {
    const sectionIndex = document2.pages[pageIndex].sections.findIndex((section2) => section2.id === sectionId);
    if (sectionIndex >= 0) return { pageIndex, sectionIndex };
  }
  throw new EditorCommandError(`Section not found: ${sectionId}`);
}
function pageLocation(document2, pageId) {
  const index = document2.pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new EditorCommandError(`Page not found: ${pageId}`);
  return index;
}
function sectionIds(document2) {
  return new Set(document2.pages.flatMap((page) => page.sections.map((section2) => section2.id)));
}
function blockIds(document2) {
  return new Set(document2.pages.flatMap((page) => page.sections.flatMap((section2) => section2.blocks.map((block2) => block2.id))));
}
function checkedIndex(index, length) {
  if (!Number.isInteger(index) || index < 0 || index > length) throw new EditorCommandError(`Invalid insertion index: ${index}`);
  return index;
}
function editableSection(document2, sectionId) {
  const location2 = sectionLocation(document2, sectionId);
  const section2 = document2.pages[location2.pageIndex].sections[location2.sectionIndex];
  if (section2.locked) throw new EditorCommandError(`Section is locked: ${sectionId}`);
  return { ...location2, section: section2 };
}
function applyCommand(document2, command) {
  if (command.type === "restoreDocument") return clone(command.document);
  const next = clone(document2);
  switch (command.type) {
    case "insertSection": {
      if (sectionIds(next).has(command.section.id)) throw new EditorCommandError(`Duplicate section id: ${command.section.id}`);
      const pageIndex = pageLocation(next, command.pageId);
      next.pages[pageIndex].sections.splice(checkedIndex(command.index, next.pages[pageIndex].sections.length), 0, clone(command.section));
      break;
    }
    case "moveSection": {
      const from = editableSection(next, command.sectionId);
      const targetPageIndex = pageLocation(next, command.toPageId);
      const [moving] = next.pages[from.pageIndex].sections.splice(from.sectionIndex, 1);
      let targetIndex = command.toIndex;
      if (from.pageIndex === targetPageIndex && from.sectionIndex < targetIndex) targetIndex -= 1;
      next.pages[targetPageIndex].sections.splice(checkedIndex(targetIndex, next.pages[targetPageIndex].sections.length), 0, moving);
      break;
    }
    case "updateSetting": {
      const { section: section2 } = editableSection(next, command.sectionId);
      section2.settings[command.key] = clone(command.value);
      break;
    }
    case "updateStyle": {
      const { section: section2 } = editableSection(next, command.sectionId);
      section2.style[command.key] = command.value;
      break;
    }
    case "updateResponsiveStyle": {
      const { section: section2 } = editableSection(next, command.sectionId);
      section2.responsive[command.breakpoint] = {
        ...section2.responsive[command.breakpoint] ?? {},
        [command.key]: command.value
      };
      break;
    }
    case "duplicateSection": {
      const from = editableSection(next, command.sectionId);
      if (sectionIds(next).has(command.newSectionId)) throw new EditorCommandError(`Duplicate section id: ${command.newSectionId}`);
      const copy = clone(from.section);
      copy.id = command.newSectionId;
      copy.name = `${copy.name} copy`;
      copy.blocks = copy.blocks.map((block2, index) => ({ ...block2, id: `${command.newSectionId}-block-${index + 1}` }));
      const insertion = command.index ?? from.sectionIndex + 1;
      next.pages[from.pageIndex].sections.splice(checkedIndex(insertion, next.pages[from.pageIndex].sections.length), 0, copy);
      break;
    }
    case "removeSection": {
      const location2 = editableSection(next, command.sectionId);
      next.pages[location2.pageIndex].sections.splice(location2.sectionIndex, 1);
      break;
    }
    case "toggleHidden": {
      const location2 = editableSection(next, command.sectionId);
      location2.section.hidden = !location2.section.hidden;
      break;
    }
    case "toggleLocked": {
      const location2 = sectionLocation(next, command.sectionId);
      const section2 = next.pages[location2.pageIndex].sections[location2.sectionIndex];
      section2.locked = !section2.locked;
      break;
    }
    case "insertBlock": {
      const { section: section2 } = editableSection(next, command.sectionId);
      if (blockIds(next).has(command.block.id)) throw new EditorCommandError(`Duplicate block id: ${command.block.id}`);
      section2.blocks.splice(checkedIndex(command.index, section2.blocks.length), 0, clone(command.block));
      break;
    }
    case "moveBlock": {
      const { section: section2 } = editableSection(next, command.sectionId);
      const from = section2.blocks.findIndex((block2) => block2.id === command.blockId);
      if (from < 0) throw new EditorCommandError(`Block not found: ${command.blockId}`);
      const [moving] = section2.blocks.splice(from, 1);
      let target = command.toIndex;
      if (from < target) target -= 1;
      section2.blocks.splice(checkedIndex(target, section2.blocks.length), 0, moving);
      break;
    }
    case "removeBlock": {
      const { section: section2 } = editableSection(next, command.sectionId);
      const index = section2.blocks.findIndex((block2) => block2.id === command.blockId);
      if (index < 0) throw new EditorCommandError(`Block not found: ${command.blockId}`);
      section2.blocks.splice(index, 1);
      break;
    }
  }
  return next;
}

// src/editor/history.ts
function clone2(value2) {
  return structuredClone(value2);
}
function createHistory(initial) {
  return { past: [], present: clone2(initial), future: [] };
}
function dispatch(history, command) {
  return {
    past: [...history.past, clone2(history.present)].slice(-100),
    present: applyCommand(history.present, command),
    future: []
  };
}
function undo(history) {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: clone2(previous),
    future: [clone2(history.present), ...history.future].slice(0, 100)
  };
}
function redo(history) {
  if (history.future.length === 0) return history;
  const [next, ...future] = history.future;
  return {
    past: [...history.past, clone2(history.present)].slice(-100),
    present: clone2(next),
    future
  };
}

// src/editor/ui/store.ts
function createEditorStore(initial) {
  let state = structuredClone(initial);
  let history = createHistory(initial.document);
  const listeners = /* @__PURE__ */ new Set();
  return {
    getState: () => state,
    setState(patch) {
      const changes = typeof patch === "function" ? patch(state) : patch;
      if (changes.document && changes.document !== state.document) history = createHistory(changes.document);
      state = { ...state, ...changes };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    dispatch(command) {
      history = dispatch(history, command);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    undo() {
      history = undo(history);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    redo() {
      history = redo(history);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// src/hydrate/publish-access.ts
function renderPublishPaywall() {
  return `<div class="publish-paywall" role="dialog" aria-modal="true" aria-labelledby="publish-paywall-title">
    <button type="button" class="publish-paywall__close" data-paywall-close aria-label="Fermer">\xD7</button>
    <div class="publish-paywall__mark">P</div>
    <p class="publish-paywall__label">Weflo Pro</p>
    <h2 id="publish-paywall-title">D\xE9bloque la publication avec Weflo Pro</h2>
    <p>Ta boutique est pr\xEAte. Passe \xE0 l\u2019offre Pro pour l\u2019installer directement dans le th\xE8me Shopify de ton choix.</p>
    <ul><li>Publication dans tes th\xE8mes Shopify</li><li>Th\xE8me actif, copie ou nouveau th\xE8me</li><li>Pages et modifications illimit\xE9es</li></ul>
    <button type="button" data-pro-checkout>Passer \xE0 Weflo Pro</button>
    <p class="publish-paywall__error" data-pro-checkout-error role="alert" hidden></p>
  </div>`;
}

// src/hydrate/pro-checkout.ts
async function responseJson(response, context) {
  if (!response.ok) throw new Error(context);
  try {
    return await response.json();
  } catch {
    throw new Error(context);
  }
}
async function createProCheckout(fetchImpl = fetch) {
  const billingResponse = await fetchImpl("/api/billing");
  const billing = await responseJson(billingResponse, "Impossible de charger la facturation.");
  const workspaceId = typeof billing.workspace?.id === "string" ? billing.workspace.id : "";
  const planId = typeof billing.catalog?.pro === "string" ? billing.catalog.pro : "";
  if (!workspaceId || !planId) throw new Error("L\u2019offre Pro n\u2019est pas encore disponible.");
  const checkoutResponse = await fetchImpl("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, kind: "subscription", planId })
  });
  const checkout = await responseJson(checkoutResponse, "Impossible d\u2019ouvrir le paiement.");
  const rawUrl = typeof checkout.url === "string" ? checkout.url : "";
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Le lien de paiement re\xE7u est invalide.");
  }
  if (url.protocol !== "https:" || url.hostname !== "whop.com" && !url.hostname.endsWith(".whop.com")) {
    throw new Error("Le lien de paiement re\xE7u est invalide.");
  }
  return url.toString();
}

// src/editor/ui/canardo-review.ts
function canardoReviewMarkup(response) {
  return `<div class="editor-canardo-review" data-canardo-review><strong>${escapeEditorHtml(response.summary)}</strong><ul>${response.commands.map((command) => `<li>${escapeEditorHtml(command.type)}${"sectionId" in command ? ` \xB7 ${escapeEditorHtml(command.sectionId)}` : ""}</li>`).join("")}</ul><div><button type="button" data-canardo-reject>Annuler</button><button type="button" data-canardo-accept>Appliquer</button></div></div>`;
}

// src/editor/ui/canardo.ts
function canardoRequest(prompt, selectedId, extra = {}) {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, selectedId, ...extra }) };
}
function isConsequentialCanardoResponse(response) {
  return response.requiresConfirmation === true;
}
function applyCanardoDocument(store, document2) {
  store.dispatch({ type: "restoreDocument", document: document2 });
}
function mountCanardo(root, store, pageId) {
  const dock = root.querySelector("[data-editor-canardo]");
  const input = dock?.querySelector("input");
  const send = dock?.querySelector("[data-canardo-send]");
  if (!dock || !input || !send) return () => {
  };
  const log = document.createElement("div");
  log.className = "editor-canardo-log";
  log.setAttribute("aria-live", "polite");
  dock.prepend(log);
  let proposal = null;
  let lastPrompt = "";
  const note = (message, kind = "assistant") => {
    const entry = document.createElement("p");
    entry.dataset.canardoMessage = kind;
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  };
  const apply = (response) => {
    if (response.document?.version === 2) applyCanardoDocument(store, response.document);
    note(response.message || "Modification appliqu\xE9e.");
    const undo2 = document.createElement("button");
    undo2.type = "button";
    undo2.dataset.canardoUndo = "";
    undo2.textContent = "Annuler cette g\xE9n\xE9ration";
    log.appendChild(undo2);
  };
  const request = async (confirm = false) => {
    const prompt = confirm ? lastPrompt : input.value.trim();
    if (!prompt) return;
    if (!confirm) {
      lastPrompt = prompt;
      note(prompt, "user");
    }
    send.disabled = true;
    send.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}/canardo`, canardoRequest(prompt, store.getState().selectedId, confirm && proposal ? { confirm: true, response: proposal } : {}));
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Canardo n\u2019a pas pu appliquer cette demande.");
      if (isConsequentialCanardoResponse(body)) {
        proposal = { message: body.message || "Proposition", summary: body.summary || "Modification", commands: body.commands || [] };
        log.insertAdjacentHTML("beforeend", canardoReviewMarkup(proposal));
      } else {
        apply(body);
        input.value = "";
        proposal = null;
      }
    } catch (error) {
      note(error instanceof Error ? error.message : "Erreur Canardo", "error");
      input.value = lastPrompt;
    } finally {
      send.disabled = false;
      send.removeAttribute("aria-busy");
    }
  };
  const click = (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target === send) void request();
    if (target.matches("[data-canardo-accept]")) {
      target.closest("[data-canardo-review]")?.remove();
      void request(true);
    }
    if (target.matches("[data-canardo-reject]")) {
      target.closest("[data-canardo-review]")?.remove();
      proposal = null;
      note("Proposition annul\xE9e.");
    }
    if (target.matches("[data-canardo-undo]")) {
      store.undo();
      target.remove();
      note("G\xE9n\xE9ration annul\xE9e.");
    }
  };
  const keydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void request();
    }
  };
  dock.addEventListener("click", click);
  input.addEventListener("keydown", keydown);
  return () => {
    dock.removeEventListener("click", click);
    input.removeEventListener("keydown", keydown);
  };
}

// src/editor/ui/publish-dialog.ts
function publishRequest(choice) {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(choice) };
}
function publishDialogMarkup(options) {
  const active = options.shopify.themes.find((theme) => theme.role === "main");
  return `<style>.wf-publish-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}.wf-publish-dialog{width:min(620px,100%);max-height:90vh;overflow:auto;padding:28px;border-radius:18px;background:#191918;color:#f5f5f2;font:14px/1.45 Inter,-apple-system,sans-serif;border:1px solid #343431}.wf-publish-dialog header{display:flex;justify-content:space-between;align-items:center}.wf-publish-dialog h2{font-size:30px;line-height:1;margin:6px 0 10px}.wf-publish-dialog fieldset{display:grid;gap:8px;margin:22px 0;padding:0;border:0}.wf-publish-option{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:14px;border:1px solid #393936;border-radius:10px;color:inherit;text-decoration:none}.wf-publish-option small{display:block;color:#999991}.wf-publish-actions{display:flex;justify-content:flex-end;gap:8px}.wf-publish-actions button{min-height:42px;padding:0 16px;border:1px solid #444;border-radius:8px;background:#222;color:#fff}.wf-publish-actions button[type=submit]{border-color:#176dff;background:#176dff}.wf-publish-live{padding:12px;border-radius:8px;background:#3a3014;color:#ffe28a}</style><div class="wf-publish-overlay" data-publish-overlay><form class="wf-publish-dialog" data-publish-form><header><span>PUBLICATION SHOPIFY</span><button type="button" data-publish-close aria-label="Fermer">\xD7</button></header><h2>Publier sur ton th\xE8me Shopify</h2><p>Choisis pr\xE9cis\xE9ment o\xF9 Weflo doit installer cette page. Ton th\xE8me en ligne ne sera jamais modifi\xE9 sans confirmation.</p><fieldset>${options.shopify.connected ? `<label class="wf-publish-option"><input type="radio" name="destination" value="new_weflo" checked><span><strong>Nouveau th\xE8me Weflo</strong><small>Cr\xE9er un th\xE8me Shopify s\xE9par\xE9 et non publi\xE9.</small></span></label><label class="wf-publish-option"><input type="radio" name="destination" value="duplicate_active"><span><strong>Copier le th\xE8me actif</strong><small>Copier ${active?.name ?? "le th\xE8me actif"}, puis ajouter cette page.</small></span></label><label class="wf-publish-option"><input type="radio" name="destination" value="active"><span><strong>Publier sur le th\xE8me actif</strong><small>Ajouter le mod\xE8le directement \xE0 ta boutique en ligne.</small></span></label>` : `<a class="wf-publish-option" href="/dashboard#shopify"><span><strong>Connecter Shopify</strong><small>Shopify est n\xE9cessaire pour publier. Connecte d\u2019abord une boutique.</small></span></a>`}</fieldset><div data-publish-review></div><div class="wf-publish-actions"><button type="button" data-publish-close>Annuler</button><button type="submit"${options.shopify.connected ? "" : " disabled"}>Continuer</button></div></form></div>`;
}
function openPublishDialog(options, publish) {
  const host = document.createElement("div");
  host.innerHTML = publishDialogMarkup(options);
  const overlay = host.querySelector("[data-publish-overlay]");
  document.body.append(...Array.from(host.childNodes));
  const form = overlay.querySelector("[data-publish-form]");
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-publish-close]").forEach((button2) => button2.addEventListener("click", close));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = new FormData(form).get("destination")?.toString() ?? "new_weflo";
    const destination = "shopify";
    const strategy = selected;
    const review = form.querySelector("[data-publish-review]");
    if (!form.dataset.reviewed) {
      form.dataset.reviewed = "true";
      review.innerHTML = strategy === "active" ? `<div class="wf-publish-live"><strong>Publication sur le th\xE8me actif</strong><p>Cette action ajoute les fichiers Weflo directement au th\xE8me visible.</p><label><input type="checkbox" data-live-confirm required> Je confirme la publication en direct</label></div>` : `<p><strong>Pr\xEAt \xE0 publier.</strong> Le template Weflo reste isol\xE9 des autres pages.</p>`;
      form.querySelector('button[type="submit"]').textContent = "Publier maintenant";
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Publication\u2026";
    try {
      const result = await publish({ destination, ...strategy ? { strategy } : {}, ...strategy === "active" ? { confirmLive: Boolean(form.querySelector("[data-live-confirm]")?.checked) } : {}, expectedVersion: options.documentVersion });
      review.innerHTML = `<p><strong>${result.message ?? "Publication termin\xE9e."}</strong></p>${result.shopifyPreviewUrl || result.previewUrl ? `<a href="${result.shopifyPreviewUrl ?? result.previewUrl}" target="_blank" rel="noreferrer">Ouvrir la page publi\xE9e</a>` : ""}`;
      submit.textContent = "Publi\xE9";
    } catch (error) {
      review.innerHTML = `<p role="alert">${error instanceof Error ? error.message : "La publication a \xE9chou\xE9."}</p>`;
      submit.disabled = false;
      submit.textContent = "R\xE9essayer";
    }
  });
  return overlay;
}

// src/lib/catalog.ts
var TEMPLATES = {
  sell: [
    "navigation",
    "productHero",
    "benefits",
    "bundle",
    "guarantees",
    "reviews",
    "faq",
    "cta",
    "footer"
  ],
  write: ["navigation", "article", "footer"],
  blank: ["navigation", "hero", "footer"]
};
var THEMES = {
  "Nutrition": { background: "#F4F1DD", surface: "#FFFDF3", ink: "#182116", muted: "#66705D", accent: "#B8D865", display: "sans", radius: "round" },
  "Caf\xE9 & \xE9picerie": { background: "#EFE3D3", surface: "#FFF9EF", ink: "#2B1B13", muted: "#786152", accent: "#D56A35", display: "serif", radius: "soft" },
  "Beaut\xE9 & soin": { background: "#F3E8EB", surface: "#FFFAFC", ink: "#241A20", muted: "#796871", accent: "#DB8FA8", display: "serif", radius: "round" },
  "Maison & c\xE9ramique": { background: "#EBE6DC", surface: "#FAF8F2", ink: "#211E19", muted: "#6E675D", accent: "#C89D5A", display: "serif", radius: "none" },
  "Mode & accessoires": { background: "#ECECEF", surface: "#FFFFFF", ink: "#171719", muted: "#6D6D75", accent: "#7C71D8", display: "condensed", radius: "none" },
  "Sport & plein air": { background: "#E5EDF2", surface: "#FBFDFF", ink: "#101820", muted: "#60717D", accent: "#FF6B35", display: "condensed", radius: "soft" }
};
var DEFAULT_PAGE_THEME = {
  background: "#F4F2EC",
  surface: "#FFFFFF",
  ink: "#141310",
  muted: "#75736C",
  accent: "#FBC531",
  display: "sans",
  radius: "soft"
};
var MODEL_IMAGES = {
  proteo: "photo-1593095948071-474c5cc2989d",
  graine: "photo-1490645935967-10de6ba17061",
  cycle: "photo-1600185365483-26d7a4cc7519",
  brulerie: "photo-1447933601403-0c6688de566e",
  feuille: "photo-1544787219-7f47ccb76574",
  comptoir: "photo-1547592180-85f173990554",
  peau: "photo-1556228578-8c89e6adf883",
  saponaire: "photo-1607006483225-55c3e32e9ad4",
  onzieme: "photo-1541643600914-78b084683601",
  terre: "photo-1610701596007-11502861dcfa",
  fil: "photo-1615874959474-d609969a20ed",
  tenon: "photo-1555041469-a586c61ea9bc",
  cousu: "photo-1553062407-98eeb64c6a62",
  trame: "photo-1521572163474-6864f9cf17ab",
  orsecond: "photo-1515562141207-7a88fb7ce338",
  cadence: "photo-1485965120184-e220f721d03e",
  denivele: "photo-1551632811-561732d1e306",
  prise: "photo-1522163182402-834f871fd851"
};
function previewSlug(value2) {
  return value2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function pageModel(id2, name, brand, theme, description, price, cta2) {
  const imageId = MODEL_IMAGES[id2] ?? MODEL_IMAGES.proteo;
  const preview = `/assets/editor-preview-${previewSlug(brand)}`;
  return {
    id: id2,
    name,
    brand,
    theme,
    type: "sell",
    description,
    price,
    cta: cta2,
    image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1400&q=85`,
    themeConfig: THEMES[theme] ?? DEFAULT_PAGE_THEME,
    previewDesktop: `${preview}-desktop.webp`,
    previewMobile: `${preview}-mobile.webp`
  };
}
var PAGE_MODELS = [
  pageModel("proteo", "Compl\xE9ments du sport", "Prot\xE9o", "Sport & plein air", "Une formule nette pour r\xE9cup\xE9rer plus vite et repartir plus fort.", "39 \u20AC", "Choisir ma formule"),
  pageModel("graine", "\xC9picerie sant\xE9", "Graine & Cie", "Nutrition", "Des essentiels du placard, sourc\xE9s simplement et expliqu\xE9s clairement.", "12,90 \u20AC", "Composer mon panier"),
  pageModel("cycle", "Nutrition f\xE9minine", "Cycle", "Nutrition", "Une routine pens\xE9e pour accompagner chaque phase sans compliquer les journ\xE9es.", "34 \u20AC", "D\xE9couvrir la routine"),
  pageModel("brulerie", "Torr\xE9faction de quartier", "Br\xFBlerie Sud", "Caf\xE9 & \xE9picerie", "Un caf\xE9 de caract\xE8re, torr\xE9fi\xE9 en petite s\xE9rie au c\u0153ur du quartier.", "14 \u20AC", "Choisir mon caf\xE9"),
  pageModel("feuille", "Th\xE9 et infusions", "Feuille Nord", "Caf\xE9 & \xE9picerie", "Des feuilles enti\xE8res, des origines pr\xE9cises et une tasse qui prend son temps.", "16 \u20AC", "Infuser maintenant"),
  pageModel("comptoir", "\xC9picerie fine locale", "Comptoir 44", "Caf\xE9 & \xE9picerie", "Le meilleur des producteurs voisins r\xE9uni dans un comptoir g\xE9n\xE9reux.", "28 \u20AC", "Remplir mon panier"),
  pageModel("peau", "Soin minimaliste", "Peau Nue", "Beaut\xE9 & soin", "Trois actifs essentiels pour une peau calme, souple et lumineuse.", "42 \u20AC", "Adopter le rituel"),
  pageModel("saponaire", "Savonnerie artisanale", "Saponaire", "Beaut\xE9 & soin", "Des savons saponifi\xE9s \xE0 froid, doux pour la peau et beaux dans la salle de bain.", "9 \u20AC", "Choisir mon savon"),
  pageModel("onzieme", "Parfums de niche", "Onzi\xE8me", "Beaut\xE9 & soin", "Un sillage intime construit autour de mati\xE8res inattendues et durables.", "96 \u20AC", "Trouver mon sillage"),
  pageModel("terre", "C\xE9ramique utilitaire", "Terre Brute", "Maison & c\xE9ramique", "Des pi\xE8ces tourn\xE9es \xE0 la main pour rendre chaque repas plus tactile.", "32 \u20AC", "Voir les pi\xE8ces"),
  pageModel("fil", "Linge de maison", "Fil \xC9cru", "Maison & c\xE9ramique", "Du lin lav\xE9 qui vit, se patine et rend la maison imm\xE9diatement plus douce.", "68 \u20AC", "Habiller la maison"),
  pageModel("tenon", "Mobilier en kit", "Tenon", "Maison & c\xE9ramique", "Un mobilier pr\xE9cis \xE0 monter sans outil, con\xE7u pour suivre tous les espaces.", "189 \u20AC", "Configurer mon meuble"),
  pageModel("cousu", "Maroquinerie", "Cousu Main", "Mode & accessoires", "Des sacs trac\xE9s, coup\xE9s et assembl\xE9s pour durer bien au-del\xE0 des saisons.", "220 \u20AC", "Choisir mon cuir"),
  pageModel("trame", "V\xEAtement essentiel", "Trame", "Mode & accessoires", "La bonne coupe, la bonne mati\xE8re et rien qui ne soit pas n\xE9cessaire.", "79 \u20AC", "Trouver ma taille"),
  pageModel("orsecond", "Bijoux fondus", "Or Second", "Mode & accessoires", "Des m\xE9taux dormants refondus en bijoux singuliers, pi\xE8ce apr\xE8s pi\xE8ce.", "120 \u20AC", "Voir la collection"),
  pageModel("cadence", "V\xE9lo et pi\xE8ces", "Cadence", "Sport & plein air", "Des composants fiables pour rouler plus longtemps et entretenir facilement.", "59 \u20AC", "\xC9quiper mon v\xE9lo"),
  pageModel("denivele", "Randonn\xE9e l\xE9g\xE8re", "D\xE9nivel\xE9", "Sport & plein air", "Moins de poids sur le dos, plus de kilom\xE8tres et de libert\xE9 devant soi.", "149 \u20AC", "Pr\xE9parer ma sortie"),
  pageModel("prise", "Escalade", "Prise Franche", "Sport & plein air", "Du mat\xE9riel pr\xE9cis pour grimper concentr\xE9, du premier mouvement au relais.", "74 \u20AC", "Choisir mon \xE9quipement")
];
function initialDocument(name, type) {
  const sections = TEMPLATES[type].map((sectionType, i) => ({
    id: `${sectionType}-${i}`,
    type: sectionType,
    settings: { title: name }
  }));
  return { name, path: "/", sections };
}
function blankDocument(name) {
  const doc = initialDocument(name, "blank");
  return {
    ...doc,
    modelId: "blank",
    theme: DEFAULT_PAGE_THEME,
    sections: doc.sections.map((section2) => ({
      ...section2,
      settings: section2.type === "hero" ? { title: "Ton id\xE9e commence ici", subtitle: name, text: "Ajoute une section ou demande \xE0 Canardo de construire la page.", cta_label: "Commencer" } : { title: name }
    }))
  };
}
function fillSettings(type, name, model) {
  const { brand, image: image2, description, price, cta: cta2 } = model;
  switch (type) {
    case "navigation":
    case "footer":
      return { title: brand };
    case "productHero":
      return {
        title: name,
        subtitle: brand,
        text: description,
        price,
        image: image2,
        cta_label: cta2
      };
    case "hero":
      return {
        title: name,
        subtitle: brand,
        text: `La boutique ${brand}, mont\xE9e section par section.`,
        image: image2,
        cta_label: "Voir la collection"
      };
    case "benefits":
      return { title: "Pourquoi \xE7a change tout", text: `${description} Une promesse claire, soutenue par trois b\xE9n\xE9fices concrets.` };
    case "bundle":
      return { title: "Le duo qui part le plus", text: `Deux r\xE9f\xE9rences ${brand} \xE0 prix pack.`, price: "64 \u20AC" };
    case "guarantees":
      return { title: "Garanties", text: "Paiement s\xE9curis\xE9, retours 14 jours, suivi colis." };
    case "reviews":
      return { title: "Avis", text: "\xAB Enfin une page qui ressemble \xE0 une vraie boutique. \xBB" };
    case "faq":
      return { title: "Livraison", text: "Exp\xE9dition sous 48h ouvr\xE9es, suivi par e-mail." };
    case "cta":
      return { title: `Rejoins ${brand}`, text: "Premi\xE8re commande, page d\xE9j\xE0 en ligne.", cta_label: cta2 };
    case "collectionGrid":
      return { title: "La collection", text: `Six produits ${brand}.` };
    case "atelier":
      return { title: `L'atelier ${brand}`, text: "Petites s\xE9ries, photos et copy d\xE9j\xE0 pos\xE9s.", image: image2 };
    case "article":
      return { title: name, text: `Journal ${brand} \u2014 un article, des sections, un th\xE8me Shopify.` };
    default:
      return { title: name };
  }
}
function documentFromModel(modelId, pageName) {
  const model = PAGE_MODELS.find((m) => m.id === modelId) ?? PAGE_MODELS[0];
  const name = pageName.trim() || model.name;
  const base3 = initialDocument(name, model.type);
  return {
    ...base3,
    name,
    modelId: model.id,
    theme: { ...model.themeConfig },
    referencePreviews: { desktop: model.previewDesktop, mobile: model.previewMobile },
    sections: base3.sections.map((section2) => ({
      ...section2,
      settings: fillSettings(section2.type, name, model)
    }))
  };
}

// src/editor/document.ts
function isEditorDocument(value2) {
  if (!value2 || typeof value2 !== "object") return false;
  const candidate = value2;
  return candidate.version === 2 && Array.isArray(candidate.pages);
}

// src/models/assets.ts
function assetsForModel(model) {
  return [
    { id: `${model.id}-product`, type: "image", url: model.image, alt: `${model.name} \u2014 ${model.brand}` },
    { id: `${model.id}-desktop-reference`, type: "image", url: model.previewDesktop, alt: `R\xE9f\xE9rence bureau ${model.brand}` },
    { id: `${model.id}-mobile-reference`, type: "image", url: model.previewMobile, alt: `R\xE9f\xE9rence mobile ${model.brand}` }
  ];
}

// src/models/manifests/batch-1.ts
var MODEL_SPECIALTY_BATCH_1 = {
  proteo: "stats",
  graine: "ingredients",
  cycle: "quiz",
  brulerie: "imageText",
  feuille: "richText",
  comptoir: "collectionGrid"
};

// src/models/manifests/batch-2.ts
var MODEL_SPECIALTY_BATCH_2 = {
  peau: "beforeAfter",
  saponaire: "steps",
  onzieme: "videoHero",
  terre: "gallery",
  fil: "press",
  tenon: "comparison"
};

// src/models/manifests/batch-3.ts
var MODEL_SPECIALTY_BATCH_3 = {
  cousu: "shipping",
  trame: "productGrid",
  orsecond: "guarantees",
  cadence: "bundle",
  denivele: "testimonials",
  prise: "form"
};

// src/models/model-manifest.ts
var SPECIALTIES = { ...MODEL_SPECIALTY_BATCH_1, ...MODEL_SPECIALTY_BATCH_2, ...MODEL_SPECIALTY_BATCH_3 };
var modelManifestIds = Object.keys(SPECIALTIES);
function block(sectionId, index, title, text3, extra = {}) {
  return { id: `${sectionId}-block-${index}`, type: "item", settings: { title, text: text3, ...extra } };
}
function blocksFor(type, id2, model) {
  if (type === "navigation") return [block(id2, 1, "Boutique", "", { label: "Boutique", link: "#produit" }), block(id2, 2, "Notre histoire", "", { label: "Notre histoire", link: "#histoire" })];
  if (type === "productMain") return [{ id: `${id2}-variant-1`, type: "variant", settings: { title: "Format signature", variant_id: "" } }];
  if (type === "reviews" || type === "testimonials") return [block(id2, 1, "Camille", `\xAB ${model.brand} a d\xE9pass\xE9 mes attentes. \xBB`, { rating: 5 }), block(id2, 2, "Nicolas", "Simple, beau et vraiment bien pens\xE9.", { rating: 5 }), block(id2, 3, "In\xE8s", "Je recommande sans h\xE9siter.", { rating: 5 })];
  if (type === "faq") return [block(id2, 1, "Quand vais-je recevoir ma commande ?", "Exp\xE9dition sous 48 h avec suivi."), block(id2, 2, "Puis-je changer d\u2019avis ?", "Oui, les retours sont possibles pendant 14 jours.")];
  if (type === "gallery") return [block(id2, 1, "D\xE9tail", "Mati\xE8res et finitions", { image: model.image, image_alt: model.name }), block(id2, 2, "En situation", "Pens\xE9 pour le quotidien", { image: model.image, image_alt: model.name })];
  return [block(id2, 1, "Con\xE7u avec intention", model.description), block(id2, 2, "Livr\xE9 simplement", "Suivi clair et assistance humaine."), block(id2, 3, "Adopt\xE9 durablement", "Une exp\xE9rience faite pour durer.")];
}
function section(type, index, model, pageName) {
  const definition = getSectionDefinition(type);
  const id2 = `${type}-${index + 1}`;
  const common2 = { ...definition?.defaults ?? {}, title: definition?.name ?? type };
  if (type === "navigation") Object.assign(common2, { title: model.brand, cta_label: "Panier", cta_link: "#panier" });
  if (type === "announcement") Object.assign(common2, { text: "Livraison offerte d\xE8s 60 \u20AC \u2014 retours sous 14 jours", cta_label: "", cta_link: "#" });
  if (type === "productHero") Object.assign(common2, { title: pageName, subtitle: model.brand, text: model.description, price: model.price, image: model.image, image_alt: `${pageName} par ${model.brand}`, cta_label: model.cta, cta_link: "#produit" });
  if (type === "productMain") Object.assign(common2, { title: "Choisis ta version", text: "S\xE9lectionne ton option et ajoute-la au panier.", cta_label: "Ajouter au panier" });
  if (type === "reviews") Object.assign(common2, { title: "Des clients conquis", subtitle: "Avis v\xE9rifi\xE9s", text: "" });
  if (type === "faq") Object.assign(common2, { title: "Tout savoir avant de commander", text: "" });
  if (type === "cta") Object.assign(common2, { title: `Pr\xEAt \xE0 d\xE9couvrir ${model.brand} ?`, text: model.description, cta_label: model.cta, cta_link: "#produit" });
  if (type === "footer") Object.assign(common2, { title: model.brand, text: "Qualit\xE9, clart\xE9 et service attentionn\xE9.", cta_label: "", cta_link: "#" });
  if (type === SPECIALTIES[model.id]) Object.assign(common2, { title: `${model.brand}, jusque dans les d\xE9tails`, subtitle: model.theme, text: model.description, image: model.image, image_alt: pageName, cta_label: "En savoir plus", cta_link: "#produit" });
  return { id: id2, type, name: definition?.name ?? type, hidden: false, locked: false, settings: common2, style: {}, responsive: {}, blocks: blocksFor(type, id2, model) };
}
function buildModelDocument(modelId, pageName) {
  const model = PAGE_MODELS.find((item) => item.id === modelId) ?? PAGE_MODELS[0];
  const name = pageName.trim() || model.name;
  const types = ["navigation", "announcement", "productHero", SPECIALTIES[model.id] ?? "benefits", "productMain", "reviews", "faq", "cta", "footer"];
  return {
    version: 2,
    name,
    path: "/",
    kind: "product",
    modelId: model.id,
    theme: { ...model.themeConfig },
    pages: [{ id: `page-${model.id}`, name, slug: model.id, sections: types.map((type, index) => section(type, index, model, name)) }],
    assets: assetsForModel(model)
  };
}

// src/editor/migrate.ts
function slug(value2) {
  return value2.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}
function setting(value2) {
  if (value2 === null || typeof value2 === "string" || typeof value2 === "number" || typeof value2 === "boolean") return value2;
  if (Array.isArray(value2) && value2.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
    return value2;
  }
  return JSON.stringify(value2);
}
function settings(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value2]) => [key, setting(value2)]));
}
function legacyBlocks(section2) {
  const value2 = section2.settings.blocks;
  if (!Array.isArray(value2)) return [];
  return value2.flatMap((block2, index) => {
    if (!block2 || typeof block2 !== "object" || Array.isArray(block2)) return [];
    const raw = block2;
    return [{
      id: typeof raw.id === "string" && raw.id ? raw.id : `${section2.id}-block-${index + 1}`,
      type: typeof raw.type === "string" && raw.type ? raw.type : "item",
      settings: settings(raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings) ? raw.settings : raw)
    }];
  });
}
function migrateSection(section2, index) {
  return {
    id: section2.id || `${section2.type}-${index + 1}`,
    type: section2.type,
    name: typeof section2.settings.title === "string" && section2.settings.title.trim() ? section2.settings.title : section2.type,
    hidden: false,
    locked: false,
    settings: settings(Object.fromEntries(Object.entries(section2.settings).filter(([key]) => key !== "blocks"))),
    style: {},
    responsive: {},
    blocks: legacyBlocks(section2)
  };
}
function editorKind(type) {
  if (type === "sell") return "product";
  if (type === "write" || type === "blank") return "landing";
  return type;
}
function migrateDocument(document2, kind = "landing") {
  if (isEditorDocument(document2)) return structuredClone(document2);
  const pageSlug = slug(document2.path === "/" ? document2.name : document2.path);
  return {
    version: 2,
    name: document2.name,
    path: document2.path.startsWith("/") ? document2.path : `/${document2.path}`,
    kind: editorKind(kind),
    ...document2.modelId ? { modelId: document2.modelId } : {},
    theme: { ...document2.theme ?? DEFAULT_PAGE_THEME },
    pages: [{
      id: `page-${pageSlug}`,
      name: document2.name,
      slug: pageSlug,
      sections: document2.sections.map(migrateSection)
    }],
    assets: []
  };
}

// src/lib/render-document.ts
function escapeHtml2(value2) {
  return value2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function safeColor(value2, fallback) {
  return typeof value2 === "string" && /^#[0-9a-f]{6}$/i.test(value2) ? value2 : fallback;
}
function safeImage(value2) {
  if (typeof value2 !== "string") return "";
  try {
    const url = new URL(value2);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHtml2(url.toString()) : "";
  } catch {
    return "";
  }
}
function text2(settings2, ...keys) {
  for (const key of keys) {
    const value2 = settings2[key];
    if (typeof value2 === "string" && value2.trim()) return escapeHtml2(value2.trim());
  }
  return "";
}
function themeValues(theme) {
  const value2 = theme ?? DEFAULT_PAGE_THEME;
  const displays = {
    sans: "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif",
    serif: "Georgia,'Times New Roman',serif",
    condensed: "'Arial Narrow','Roboto Condensed',Arial,sans-serif"
  };
  const radii = { none: "0px", soft: "18px", round: "36px" };
  return {
    background: safeColor(value2.background, DEFAULT_PAGE_THEME.background),
    surface: safeColor(value2.surface, DEFAULT_PAGE_THEME.surface),
    ink: safeColor(value2.ink, DEFAULT_PAGE_THEME.ink),
    muted: safeColor(value2.muted, DEFAULT_PAGE_THEME.muted),
    accent: safeColor(value2.accent, DEFAULT_PAGE_THEME.accent),
    display: displays[value2.display] ?? displays.sans,
    radius: radii[value2.radius] ?? radii.soft
  };
}
function media2(section2, title) {
  const image2 = safeImage(section2.settings.image);
  if (!image2) return `<div class="wf-media wf-media--empty"><span>${title.slice(0, 1)}</span></div>`;
  return `<div class="wf-media"><img src="${image2}" alt="${title}" loading="lazy"></div>`;
}
function sectionHtml(section2, pageName) {
  const title = text2(section2.settings, "title", "heading") || escapeHtml2(pageName);
  const subtitle = text2(section2.settings, "subtitle", "subheading");
  const body = text2(section2.settings, "text", "body");
  const price = text2(section2.settings, "price");
  const cta2 = text2(section2.settings, "cta", "cta_label", "button") || "D\xE9couvrir";
  const picture = media2(section2, title);
  switch (section2.type) {
    case "navigation":
      return "";
    case "footer":
      return `<footer class="wf-wrap wf-footer"><strong>${title}</strong><span>Con\xE7u avec Weflo</span></footer>`;
    case "productHero":
      return `<main class="wf-wrap wf-product">${picture}<div class="wf-product__copy">${subtitle ? `<p class="wf-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p class="wf-lead">${body}</p>` : ""}${price ? `<p class="wf-price">${price}</p>` : ""}<a class="wf-button" href="#acheter">${cta2}</a></div></main>`;
    case "hero":
      return `<main class="wf-wrap wf-hero"><div>${subtitle ? `<p class="wf-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p class="wf-lead">${body}</p>` : ""}<a class="wf-button" href="#commencer">${cta2}</a></div>${picture}</main>`;
    case "benefits":
    case "guarantees":
    case "reviews":
    case "collectionGrid":
      return `<section class="wf-wrap wf-section"><p class="wf-kicker">${subtitle || section2.type}</p><h2>${title}</h2><div class="wf-grid"><article><span>01</span><h3>${title}</h3><p>${body || "Pens\xE9 dans les moindres d\xE9tails."}</p></article><article><span>02</span><h3>Simple au quotidien</h3><p>Une exp\xE9rience claire, de la d\xE9couverte \xE0 la livraison.</p></article><article><span>03</span><h3>Fait pour durer</h3><p>Des choix assum\xE9s et une qualit\xE9 qui se remarque.</p></article></div></section>`;
    case "bundle":
      return `<section class="wf-wrap wf-band"><div><p class="wf-kicker">Ensemble exclusif</p><h2>${title}</h2><p>${body}</p></div><div>${price ? `<p class="wf-price">${price}</p>` : ""}<a class="wf-button" href="#acheter">${cta2}</a></div></section>`;
    case "faq":
      return `<section class="wf-wrap wf-section wf-faq"><p class="wf-kicker">Questions fr\xE9quentes</p><h2>${title}</h2><details open><summary>${title}</summary><p>${body || "Toutes les r\xE9ponses avant de commander."}</p></details><details><summary>Livraison et retours</summary><p>Suivi inclus et retour sous quatorze jours.</p></details></section>`;
    case "cta":
      return `<section class="wf-wrap wf-cta"><p class="wf-kicker">Pr\xEAt \xE0 commencer ?</p><h2>${title}</h2><p>${body}</p><a class="wf-button" href="#acheter">${cta2}</a></section>`;
    case "atelier":
      return `<section class="wf-wrap wf-story">${picture}<div><p class="wf-kicker">Dans les coulisses</p><h2>${title}</h2><p>${body}</p></div></section>`;
    case "article":
      return `<article class="wf-wrap wf-article"><p class="wf-kicker">Journal</p><h1>${title}</h1><p class="wf-lead">${body}</p>${picture}</article>`;
    default:
      return `<section class="wf-wrap wf-section"><h2>${title}</h2><p>${body}</p></section>`;
  }
}
function renderDocument(doc, options = {}) {
  if (isEditorDocument(doc)) {
    return renderEditorDocument(doc, { mode: "preview", breakpoint: "desktop" });
  }
  const theme = themeValues(doc.theme);
  const title = escapeHtml2(doc.name);
  const content = doc.sections.map((section2) => sectionHtml(section2, doc.name)).join("");
  const compact = options.compact ? " wf-compact" : "";
  if (doc.referencePreviews && !options.compact) {
    return renderEditorDocument(migrateDocument(doc, "product"), {
      mode: "preview",
      breakpoint: "desktop"
    });
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  :root{--wf-bg:${theme.background};--wf-surface:${theme.surface};--wf-ink:${theme.ink};--wf-muted:${theme.muted};--wf-accent:${theme.accent};--wf-display:${theme.display};--wf-radius:${theme.radius}}
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wf-bg);color:var(--wf-ink);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;line-height:1.5}a{color:inherit}.wf-wrap{width:min(1180px,calc(100% - 56px));margin:auto}.wf-header{height:76px;display:flex;align-items:center;gap:28px;border-bottom:1px solid color-mix(in srgb,var(--wf-ink) 18%,transparent)}.wf-logo{margin-right:auto;font:800 23px/1 var(--wf-display);letter-spacing:-.04em}.wf-nav{display:flex;gap:22px;font-size:13px}.wf-cart{padding:10px 15px;border:1px solid var(--wf-ink);border-radius:999px;text-decoration:none}.wf-product,.wf-hero{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(34px,6vw,92px);align-items:center;min-height:690px;padding-block:54px}.wf-product__copy{padding:28px 0}.wf-media{min-height:520px;overflow:hidden;border-radius:var(--wf-radius);background:var(--wf-accent)}.wf-media img{width:100%;height:100%;min-height:520px;object-fit:cover;display:block}.wf-media--empty{display:grid;place-items:center;background:linear-gradient(145deg,var(--wf-surface),var(--wf-accent))}.wf-media--empty span{font:800 140px/1 var(--wf-display);opacity:.2}.wf-kicker{margin:0 0 18px;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800}.wf-product h1,.wf-hero h1,.wf-article h1{margin:0 0 24px;font:800 clamp(50px,7vw,92px)/.92 var(--wf-display);letter-spacing:-.055em}.wf-lead{max-width:620px;color:var(--wf-muted);font-size:19px}.wf-price{font:800 28px/1 var(--wf-display)}.wf-button{display:inline-flex;padding:15px 22px;margin-top:16px;border:1px solid var(--wf-ink);border-radius:999px;background:var(--wf-ink);color:var(--wf-surface);font-weight:800;text-decoration:none}.wf-section{padding-block:110px;border-top:1px solid color-mix(in srgb,var(--wf-ink) 18%,transparent)}.wf-section h2,.wf-band h2,.wf-cta h2,.wf-story h2{max-width:800px;margin:0 0 44px;font:800 clamp(38px,5vw,68px)/.96 var(--wf-display);letter-spacing:-.045em}.wf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.wf-grid article{min-height:240px;padding:28px;border:1px solid color-mix(in srgb,var(--wf-ink) 20%,transparent);border-radius:var(--wf-radius);background:var(--wf-surface)}.wf-grid article span{font-size:11px}.wf-grid h3{margin:56px 0 12px;font:800 22px/1.05 var(--wf-display)}.wf-grid p,.wf-band p,.wf-story p{color:var(--wf-muted)}.wf-band{width:min(1180px,calc(100% - 56px));margin:50px auto;display:grid;grid-template-columns:1fr auto;gap:60px;align-items:end;padding:46px;border-radius:var(--wf-radius);background:var(--wf-accent)}.wf-band h2{margin-bottom:16px}.wf-faq details{padding:22px 0;border-top:1px solid var(--wf-ink)}.wf-faq summary{font-weight:800;cursor:pointer}.wf-cta{margin-block:70px;padding-block:90px;text-align:center;border-radius:var(--wf-radius);background:var(--wf-ink);color:var(--wf-surface)}.wf-cta h2,.wf-cta p{margin-inline:auto}.wf-story{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center;padding-block:100px}.wf-article{padding-block:90px}.wf-article>.wf-media{margin-top:50px}.wf-footer{display:flex;justify-content:space-between;padding-block:35px;border-top:1px solid var(--wf-ink);font-size:12px}
  .wf-compact .wf-wrap{width:calc(100% - 28px)}.wf-compact .wf-header{height:44px}.wf-compact .wf-nav,.wf-compact .wf-cart{display:none}.wf-compact .wf-product,.wf-compact .wf-hero{min-height:420px;padding-block:18px;gap:20px}.wf-compact .wf-media,.wf-compact .wf-media img{min-height:360px}.wf-compact .wf-product h1,.wf-compact .wf-hero h1{font-size:46px}.wf-compact .wf-lead{font-size:13px}.wf-compact .wf-section{padding-block:50px}.wf-compact .wf-section h2,.wf-compact .wf-band h2,.wf-compact .wf-cta h2,.wf-compact .wf-story h2{font-size:34px}.wf-compact .wf-grid article{min-height:150px;padding:16px}.wf-compact .wf-grid h3{margin-top:28px;font-size:16px}.wf-compact .wf-band{width:calc(100% - 28px);padding:24px}.wf-compact .wf-story{padding-block:50px}.wf-compact .wf-cta{padding-block:48px}
  @media(max-width:700px){.wf-wrap{width:min(100% - 28px,1180px)}.wf-product,.wf-hero,.wf-story{grid-template-columns:1fr;min-height:auto}.wf-product{padding-top:20px}.wf-media,.wf-media img{min-height:390px}.wf-product h1,.wf-hero h1,.wf-article h1{font-size:50px}.wf-grid{grid-template-columns:1fr}.wf-band{width:calc(100% - 28px);grid-template-columns:1fr;padding:28px}.wf-nav{display:none}}
  </style></head><body class="weflo${compact}"><header class="wf-wrap wf-header"><strong class="wf-logo">${title}</strong><nav class="wf-nav"><a href="#produit">Produit</a><a href="#histoire">Histoire</a></nav><a class="wf-cart" href="#acheter">Panier \xB7 0</a></header>${content}</body></html>`;
}

// src/hydrate/editor-gallery.ts
var MODEL_THEMES = [
  "Tout",
  "Nutrition",
  "Caf\xE9 & \xE9picerie",
  "Beaut\xE9 & soin",
  "Maison & c\xE9ramique",
  "Mode & accessoires",
  "Sport & plein air"
];
function escapeHtml3(value2) {
  return value2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function galleryItems(theme) {
  const blank = {
    id: "blank",
    name: "Partir d\u2019une page vierge",
    brand: "Structure libre",
    theme: "Tout",
    description: "Une base propre \xE0 construire section par section, seul ou avec Canardo."
  };
  const models = PAGE_MODELS.filter((model) => theme === "Tout" || model.theme === theme).map((model) => ({
    id: model.id,
    name: model.name,
    brand: model.brand,
    theme: model.theme,
    description: model.description,
    previewDesktop: model.previewDesktop,
    previewMobile: model.previewMobile
  }));
  return [blank, ...models];
}
function renderGalleryMarkup(items) {
  return items.map((item) => {
    const preview = item.id === "blank" ? `<iframe data-model-preview="blank" title="Aper\xE7u d\u2019une page vierge" tabindex="-1"></iframe>` : `<img class="model-card__capture" src="${escapeHtml3(item.previewDesktop ?? "")}" data-preview-desktop="${escapeHtml3(item.previewDesktop ?? "")}" data-preview-mobile="${escapeHtml3(item.previewMobile ?? "")}" alt="Aper\xE7u du mod\xE8le ${escapeHtml3(item.name)}">`;
    return `
    <button class="model-card${item.id === "blank" ? " model-card--blank" : ""}" type="button" data-model-id="${escapeHtml3(item.id)}" aria-label="Choisir ${escapeHtml3(item.name)}">
      <span class="model-card__preview">
        ${preview}
        <span class="model-card__action">Utiliser ce mod\xE8le <span aria-hidden="true">\u2197</span></span>
      </span>
      <span class="model-card__meta">
        <span class="model-card__theme">${escapeHtml3(item.id === "blank" ? "Commencer de z\xE9ro" : item.theme)}</span>
        <strong>${escapeHtml3(item.name)}</strong>
        <span class="model-card__brand">${escapeHtml3(item.brand)}</span>
        <span class="model-card__description">${escapeHtml3(item.description)}</span>
      </span>
    </button>`;
  }).join("");
}
var GALLERY_CSS = `
  [data-empty-scroll="1"]{background:#FAFAF8!important;padding:0 0 170px!important;align-items:stretch!important}
  .model-gallery{width:min(1320px,calc(100% - 72px));margin:0 auto;padding:66px 0 90px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#141310}
  .model-gallery__header{display:grid;grid-template-columns:minmax(0,760px) auto;gap:24px;align-items:end;margin-bottom:42px}
  .model-gallery__eyebrow{margin:0 0 13px;font-size:11px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:#75736C}
  .model-gallery h1{margin:0;font-size:clamp(38px,4vw,62px);line-height:.96;letter-spacing:-.055em;font-weight:760}
  .model-gallery__intro{max-width:610px;margin:18px 0 0;color:#625F58;font-size:17px;line-height:1.55}
  .model-gallery__count{align-self:start;padding:10px 13px;border:1px solid #D8D5CE;border-radius:999px;background:#FFF;font-size:12px;font-weight:650;white-space:nowrap}
  .model-gallery__tools{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0 24px;border-top:1px solid #DEDCD6}
  .model-gallery__filters{display:flex;gap:7px;overflow:auto;padding:2px;scrollbar-width:none}
  .model-gallery__filters::-webkit-scrollbar{display:none}
  .model-filter{flex:none;border:1px solid transparent;border-radius:999px;background:transparent;padding:9px 13px;color:#6B6861;font:650 13px/1 inherit;cursor:pointer}
  .model-filter[aria-pressed="true"]{border-color:#141310;background:#141310;color:#FFF}
  .model-gallery__viewport{display:flex;gap:4px;padding:4px;border:1px solid #DEDCD6;border-radius:10px;background:#FFF}
  .model-viewport{width:34px;height:30px;border:0;border-radius:7px;background:transparent;color:#75736C;cursor:pointer;font-size:15px}
  .model-viewport[aria-pressed="true"]{background:#FBC531;color:#141310}
  .model-gallery__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:start}
  .model-card{min-width:0;padding:0;border:1px solid #DEDCD6;border-radius:16px;background:#FFF;color:#141310;text-align:left;overflow:hidden;cursor:pointer;transition:transform .22s cubic-bezier(.32,.72,0,1),box-shadow .22s,border-color .22s}
  .model-card:hover{transform:translateY(-5px);border-color:#141310;box-shadow:0 16px 38px rgba(20,19,16,.1)}
  .model-card:focus-visible,.model-filter:focus-visible,.model-viewport:focus-visible{outline:3px solid #315CFF;outline-offset:3px}
  .model-card[aria-busy="true"]{opacity:.62;cursor:wait}
  .model-card__preview{position:relative;display:block;height:255px;overflow:hidden;border-bottom:1px solid #DEDCD6;background:#EEECE6}
  .model-card__preview iframe{display:block;width:1024px;height:760px;border:0;pointer-events:none;transform:scale(.285);transform-origin:top left;background:#FFF}
  .model-card__capture{position:absolute;inset:0 auto auto 0;display:block;width:100%;height:auto;min-height:100%;object-fit:cover;object-position:top;transition:transform 3.8s linear;will-change:transform}
  .model-card:hover .model-card__capture,.model-card:focus-visible .model-card__capture{transform:translateY(calc(-100% + 255px))}
  .model-card__action{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:9px;background:#141310;color:#FFF;font-size:12px;font-weight:720;opacity:0;transform:translateY(8px);transition:opacity .18s,transform .18s}
  .model-card:hover .model-card__action,.model-card:focus-visible .model-card__action{opacity:1;transform:none}
  .model-card__meta{display:flex;flex-direction:column;min-height:184px;padding:17px}
  .model-card__theme{margin-bottom:11px;color:#8A867E;font-size:9px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}
  .model-card__meta strong{font-size:17px;line-height:1.15;letter-spacing:-.025em}
  .model-card__brand{margin-top:5px;color:#6F6B64;font-size:12px;font-weight:650}
  .model-card__description{margin-top:13px;color:#75736C;font-size:12px;line-height:1.45}
  .model-card--blank{border-color:#C9A118;background:#FFF9DF}
  .model-card--blank .model-card__preview{background:#FBC531}
  .model-card--blank .model-card__preview:after{content:"+";position:absolute;inset:50% auto auto 50%;display:grid;place-items:center;width:64px;height:64px;transform:translate(-50%,-50%);border:1px solid #141310;border-radius:50%;background:#FFF;font-size:34px;font-weight:300;box-shadow:8px 8px 0 #141310}
  .model-card--blank iframe{opacity:.24}
  .model-gallery[data-viewport="mobile"] .model-card__preview iframe{width:390px;height:844px;transform:scale(.302);transform-origin:top center;margin-left:50%;translate:-50% 0}
  .model-gallery[data-viewport="mobile"] .model-card:hover .model-card__capture,.model-gallery[data-viewport="mobile"] .model-card:focus-visible .model-card__capture{transform:translateY(calc(-100% + 275px))}
  .model-gallery[data-viewport="mobile"] .model-card__preview{height:275px}
  .model-gallery__error{margin:22px 0 0;padding:14px 16px;border:1px solid #D65D4A;border-radius:10px;background:#FFF0ED;color:#7A2418;font-size:14px}
  @media(max-width:1150px){.model-gallery__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:840px){.model-gallery{width:min(100% - 30px,1320px);padding-top:36px}.model-gallery__header{grid-template-columns:1fr}.model-gallery__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.model-gallery__tools{align-items:flex-start}.model-card__preview iframe{transform:scale(.32)}}
  @media(max-width:560px){
    .editor-gallery-stage{left:0!important;right:0!important;top:72px!important;padding:0 8px!important}
    .editor-gallery-frame{border-radius:14px 14px 0 0!important}
    .editor-gallery-sidebar{display:none!important}
    .editor-canardo-dock{left:12px!important;right:12px!important;bottom:14px!important}
    .editor-canardo-dock>div{width:100%!important}
    .editor-canardo-dock>div>div{width:100%!important;height:64px!important;border-radius:20px!important;padding-left:10px!important;gap:8px!important}
    .editor-canardo-dock input{font-size:15px!important}
    .model-gallery{width:min(100% - 30px,1320px);padding-top:34px}
    .model-gallery__grid{grid-template-columns:1fr}
    .model-gallery__tools{display:block}
    .model-gallery__viewport{width:max-content;margin-top:12px}
    .model-card__preview{height:330px}
    .model-card__preview iframe{transform:scale(.42)}
    .model-card__meta{min-height:auto}
    .model-gallery h1{font-size:40px}
  }
  @media(prefers-reduced-motion:reduce){.model-card,.model-card__action{transition:none!important}}
`;
function mountEditorGallery(options) {
  options.root.parentElement?.classList.add("editor-gallery-canvas");
  options.root.parentElement?.parentElement?.classList.add("editor-gallery-frame");
  options.root.parentElement?.parentElement?.parentElement?.classList.add("editor-gallery-stage");
  const pagesButton = document.querySelector('[title="Toutes les pages"]');
  pagesButton?.closest("sc-for")?.parentElement?.parentElement?.parentElement?.classList.add("editor-gallery-sidebar");
  if (!document.querySelector("style[data-editor-gallery-style]")) {
    const style = document.createElement("style");
    style.dataset.editorGalleryStyle = "1";
    style.textContent = GALLERY_CSS;
    document.head.appendChild(style);
  }
  options.root.innerHTML = `<section class="model-gallery" data-editor-gallery data-viewport="desktop" aria-labelledby="model-gallery-title">
    <header class="model-gallery__header"><div><p class="model-gallery__eyebrow">Nouvelle page \xB7 Weflo studio</p><h1 id="model-gallery-title">Choisis un point de d\xE9part.</h1><p class="model-gallery__intro">Pars d\u2019un mod\xE8le pens\xE9 pour ton univers, ouvre une page vierge ou d\xE9cris directement ton objectif \xE0 Canardo.</p></div><span class="model-gallery__count">18 mod\xE8les + page vierge</span></header>
    <div class="model-gallery__tools"><div class="model-gallery__filters" data-gallery-filters aria-label="Filtrer les mod\xE8les"></div><div class="model-gallery__viewport" aria-label="Format des aper\xE7us"><button class="model-viewport" data-gallery-viewport="desktop" aria-pressed="true" title="Bureau">\u25B0</button><button class="model-viewport" data-gallery-viewport="mobile" aria-pressed="false" title="Mobile">\u25AF</button></div></div>
    <div class="model-gallery__grid" data-gallery-grid aria-live="polite"></div><p class="model-gallery__error" data-gallery-error role="alert" hidden></p>
  </section>`;
  const gallery = options.root.querySelector("[data-editor-gallery]");
  const filters = gallery.querySelector("[data-gallery-filters]");
  const grid = gallery.querySelector("[data-gallery-grid]");
  const error = gallery.querySelector("[data-gallery-error]");
  let activeTheme = "Tout";
  const paintPreviews = () => {
    grid.querySelectorAll("iframe[data-model-preview]").forEach((frame) => {
      const id2 = frame.dataset.modelPreview ?? "blank";
      const model = PAGE_MODELS.find((candidate) => candidate.id === id2);
      const doc = id2 === "blank" ? blankDocument(options.pageName) : documentFromModel(id2, model?.name ?? options.pageName);
      frame.srcdoc = renderDocument(doc, { compact: true });
    });
  };
  const paintViewport = (viewport) => {
    grid.querySelectorAll("img[data-preview-desktop]").forEach((image2) => {
      image2.src = viewport === "mobile" ? image2.dataset.previewMobile ?? image2.src : image2.dataset.previewDesktop ?? image2.src;
    });
  };
  const bindCards = () => {
    grid.querySelectorAll("button[data-model-id]").forEach((card) => {
      card.addEventListener("click", async () => {
        if (card.getAttribute("aria-busy") === "true") return;
        error.hidden = true;
        card.setAttribute("aria-busy", "true");
        card.disabled = true;
        try {
          await options.onPick(card.dataset.modelId ?? "blank");
        } catch {
          card.disabled = false;
          card.removeAttribute("aria-busy");
          error.textContent = "La page n\u2019a pas pu \xEAtre cr\xE9\xE9e. V\xE9rifie ta connexion puis r\xE9essaie.";
          error.hidden = false;
        }
      });
    });
  };
  const renderGrid = () => {
    grid.innerHTML = renderGalleryMarkup(galleryItems(activeTheme));
    paintPreviews();
    paintViewport(gallery.dataset.viewport ?? "desktop");
    bindCards();
  };
  filters.innerHTML = MODEL_THEMES.map((theme) => `<button class="model-filter" type="button" data-gallery-theme="${escapeHtml3(theme)}" aria-pressed="${theme === activeTheme}">${escapeHtml3(theme)}</button>`).join("");
  filters.querySelectorAll("[data-gallery-theme]").forEach((button2) => {
    button2.addEventListener("click", () => {
      activeTheme = button2.dataset.galleryTheme ?? "Tout";
      filters.querySelectorAll("[data-gallery-theme]").forEach((item) => item.setAttribute("aria-pressed", String(item === button2)));
      renderGrid();
    });
  });
  gallery.querySelectorAll("[data-gallery-viewport]").forEach((button2) => {
    button2.addEventListener("click", () => {
      const viewport = button2.dataset.galleryViewport ?? "desktop";
      gallery.dataset.viewport = viewport;
      paintViewport(viewport);
      gallery.querySelectorAll("[data-gallery-viewport]").forEach((item) => item.setAttribute("aria-pressed", String(item === button2)));
    });
  });
  renderGrid();
  return {
    setOpen(open) {
      options.root.style.setProperty("display", open ? "block" : "none", "important");
    },
    showError(message) {
      error.textContent = message;
      error.hidden = false;
    },
    clearError() {
      error.hidden = true;
      error.textContent = "";
    }
  };
}

// src/editor/studio-insert.ts
function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function applyStudioImage(document2, input) {
  const next = structuredClone(document2);
  const asset = { id: id("asset"), type: "image", url: input.imageUrl, alt: "Visuel g\xE9n\xE9r\xE9 dans le Studio Weflo" };
  next.assets.push(asset);
  const selected = next.pages.flatMap((page) => page.sections).find((section2) => section2.id === input.selectedSectionId);
  if (selected) selected.settings.image = input.imageUrl;
  else {
    const section2 = { id: id("section"), type: "imageText", name: "Visuel Studio", hidden: false, locked: false, settings: { image: input.imageUrl, eyebrow: "NOTRE UNIVERS", title: "Une image pens\xE9e pour ta marque", text: "Modifie ce texte, la mise en page et le visuel directement dans l\u2019\xE9diteur.", cta: "D\xE9couvrir" }, style: {}, responsive: {}, blocks: [] };
    next.pages[0].sections.splice(Math.min(1, next.pages[0].sections.length), 0, section2);
  }
  return next;
}

// src/hydrate/editor-v2.ts
function visualEditorInitialState(page) {
  return {
    document: page.document,
    pageId: page.document.pages[0].id,
    selectedId: null,
    activePanel: "commerce",
    breakpoint: "desktop",
    mode: "edit",
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved"
  };
}
function editorSaveRequest(document2, expectedVersion) {
  return {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document: document2, name: document2.name, expectedVersion })
  };
}
function showProDialog() {
  const overlay = document.createElement("div");
  overlay.dataset.publishPaywall = "1";
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(20,19,16,.58);backdrop-filter:blur(8px)";
  overlay.innerHTML = `<style>.publish-paywall{position:relative;width:min(480px,100%);padding:34px;border-radius:18px;background:#fff;color:#141310;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}.publish-paywall__close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #e6e5e0;border-radius:50%;background:#fff}.publish-paywall__mark{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;background:#141310;color:#fbc531;font-weight:800}.publish-paywall__label{color:#75736c;font-size:12px}.publish-paywall h2{font-size:34px;line-height:1;margin:12px 0}.publish-paywall ul{display:grid;gap:8px;padding:18px 0;border-block:1px solid #e6e5e0;list-style:none}.publish-paywall li:before{content:'\u2713';margin-right:8px;color:#2fa36b}.publish-paywall>[data-pro-checkout]{display:flex;width:100%;justify-content:center;padding:14px;border:0;border-radius:8px;background:#fbc531;color:#141310;font-weight:700}.publish-paywall>[data-pro-checkout]:disabled{opacity:.62}.publish-paywall__error{margin:10px 0 0;color:#a6332a;font-size:13px}</style>${renderPublishPaywall()}`;
  const close = () => overlay.remove();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector("[data-paywall-close]")?.addEventListener("click", close);
  const checkout = overlay.querySelector("[data-pro-checkout]");
  const error = overlay.querySelector("[data-pro-checkout-error]");
  checkout?.addEventListener("click", async () => {
    checkout.disabled = true;
    checkout.textContent = "Ouverture du paiement\u2026";
    if (error) error.hidden = true;
    try {
      location.assign(await createProCheckout());
    } catch (cause) {
      checkout.disabled = false;
      checkout.textContent = "R\xE9essayer le paiement";
      if (error) {
        error.hidden = false;
        error.textContent = cause instanceof Error ? cause.message : "Impossible d\u2019ouvrir le paiement.";
      }
    }
  });
  document.body.appendChild(overlay);
}
async function hydrateVisualEditor(pageId) {
  const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}?documentVersion=2`);
  if (response.status === 401) {
    location.assign("/connexion");
    return;
  }
  if (!response.ok) {
    location.assign("/dashboard");
    return;
  }
  let page = await response.json();
  const pendingRaw = sessionStorage.getItem("weflo-studio-insert");
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending.pageId === page.id && typeof pending.imageUrl === "string" && /^https:\/\//.test(pending.imageUrl)) {
        const nextDocument = applyStudioImage(page.document, { imageUrl: pending.imageUrl, selectedSectionId: null });
        const saved = await fetch(`/api/pages/${encodeURIComponent(page.id)}`, editorSaveRequest(nextDocument, page.documentVersion));
        if (saved.ok) {
          page = await saved.json();
          sessionStorage.removeItem("weflo-studio-insert");
        }
      }
    } catch {
      sessionStorage.removeItem("weflo-studio-insert");
    }
  }
  if (!page.document.modelId) {
    document.body.style.margin = "0";
    document.body.replaceChildren();
    const galleryRoot = document.createElement("div");
    document.body.appendChild(galleryRoot);
    mountEditorGallery({
      root: galleryRoot,
      pageName: page.name,
      async onPick(modelId) {
        const nextDocument = modelId === "blank" ? migrateDocument(blankDocument(page.name), "landing") : buildModelDocument(modelId, page.name);
        const save = await fetch(`/api/pages/${encodeURIComponent(page.id)}`, editorSaveRequest(nextDocument, page.documentVersion));
        if (!save.ok) throw new Error("model save failed");
        await hydrateVisualEditor(pageId);
      }
    });
    return;
  }
  const store = createEditorStore(visualEditorInitialState(page));
  document.documentElement.style.height = "100%";
  if (!document.querySelector("link[data-weflo-editor-css]")) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/hydrate/editeur.css";
    stylesheet.dataset.wefloEditorCss = "1";
    document.head.appendChild(stylesheet);
  }
  document.body.style.margin = "0";
  document.body.replaceChildren();
  const root = document.createElement("div");
  root.id = "weflo-editor-root";
  document.body.appendChild(root);
  mountEditorShell(root, store);
  mountCanardo(root, store, page.id);
  const autosave = createEditorAutosave({
    store,
    pageId: page.id,
    initialVersion: page.documentVersion,
    async save(documentValue, expectedVersion) {
      const result = await fetch(`/api/pages/${encodeURIComponent(page.id)}`, editorSaveRequest(documentValue, expectedVersion));
      const body = await result.json().catch(() => ({}));
      if (result.status === 409) throw new AutosaveConflictError(body.serverPage);
      if (!result.ok || typeof body.documentVersion !== "number") throw new Error("save failed");
      return { documentVersion: body.documentVersion };
    }
  });
  root.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-editor-publish]");
    if (!target) return;
    if (document.querySelector("[data-publish-overlay]")) return;
    target.setAttribute("aria-busy", "true");
    try {
      await autosave.flush();
      const optionsResponse = await fetch(`/api/pages/${encodeURIComponent(page.id)}/publish-options`);
      if (!optionsResponse.ok) throw new Error("Impossible de charger les destinations de publication.");
      const options = await optionsResponse.json();
      if (!options.pro) {
        showProDialog();
        return;
      }
      openPublishDialog(options, async (choice) => {
        const publish = await fetch(`/api/pages/${encodeURIComponent(page.id)}/publish`, publishRequest(choice));
        const body = await publish.json().catch(() => ({}));
        if (publish.status === 402) {
          showProDialog();
          throw new Error(body.message ?? "Weflo Pro est requis.");
        }
        if (!publish.ok) throw new Error(body.message ?? "La publication a \xE9chou\xE9.");
        target.textContent = "Publi\xE9";
        return body;
      });
    } catch {
      target.textContent = "R\xE9essayer";
    } finally {
      target.removeAttribute("aria-busy");
    }
  });
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

// src/hydrate/editeur.ts
async function hydrateEditeur() {
  const me = await guardSession();
  if (!me) return;
  bindAppChrome();
  const pageId = new URLSearchParams(location.search).get("page");
  if (!pageId) {
    location.assign("/dashboard");
    return;
  }
  await hydrateVisualEditor(pageId);
}
void hydrateEditeur();
export {
  hydrateEditeur
};
