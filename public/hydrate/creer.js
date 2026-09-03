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
function template(id, format2) {
  const details = templateDetails[id];
  if (!details) throw new Error(`Missing creation template details for ${id}`);
  return {
    id,
    format: format2,
    ...details,
    previewDesktop: `/template-previews/${id}-desktop.webp`,
    previewMobile: `/template-previews/${id}-mobile.webp`
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
function flowForFormat(id) {
  const flow = FORMAT_FLOWS.find((candidate) => candidate.id === id);
  if (!flow) throw new Error(`Unknown creation format: ${id}`);
  return flow;
}

// src/create/template-gallery.ts
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderPreview(template2) {
  const title = `Aper\xE7u ${template2.name}`;
  return `<div class="template-preview" data-template-preview="${esc(template2.id)}" data-preview-device="desktop">
    <div class="template-preview-frame">
      <img src="${esc(template2.previewDesktop)}" alt="${esc(title)} sur ordinateur" data-preview-image="desktop" data-preview-key="previewDesktop" onerror="this.classList.add('is-missing')">
      <img src="${esc(template2.previewMobile)}" alt="${esc(title)} sur mobile" data-preview-image="mobile" data-preview-key="previewMobile" onerror="this.classList.add('is-missing')">
      <div class="template-preview-fallback" aria-hidden="true"><span>${esc(template2.name)}</span><i></i><i></i><i></i></div>
    </div>
    <div class="template-device-switch" role="group" aria-label="Format de l\u2019aper\xE7u ${esc(template2.name)}">
      <button type="button" data-template-device="desktop" aria-pressed="true">Ordinateur</button>
      <button type="button" data-template-device="mobile" aria-pressed="false">Mobile</button>
    </div>
  </div>`;
}
function renderTemplateGallery(flow, selectedTemplateId, templateUrl = (template2) => `/creer?format=${flow.id}&template=${template2.id}`) {
  const selected = flow.templates.some((template2) => template2.id === selectedTemplateId) ? selectedTemplateId : null;
  const cards = flow.templates.map((template2) => `<article class="template-card" data-template-card="${esc(template2.id)}" ${template2.id === selected ? 'data-selected="true"' : ""}>
    ${renderPreview(template2)}
    <div class="template-card-copy"><div><h2>${esc(template2.name)}</h2><p>${esc(template2.description)}</p></div>
      <div class="template-card-actions"><button type="button" class="template-preview-button" data-template-open="${esc(template2.id)}">Aper\xE7u</button><a href="${esc(templateUrl(template2))}" data-template-select="${esc(template2.id)}">Choisir ce mod\xE8le</a></div>
    </div>
  </article>`).join("");
  return `<section class="template-gallery" aria-labelledby="template-gallery-title">
    <header class="template-gallery-heading"><p>${esc(flow.title)}</p><h1 id="template-gallery-title">Choisis une direction pour ta page.</h1><span>Chaque mod\xE8le pose la hi\xE9rarchie, le rythme et les sections de d\xE9part. Tu pourras tout ajuster dans l\u2019\xE9diteur.</span></header>
    <div class="template-gallery-list">${cards}</div>
  </section>
  <dialog class="template-preview-dialog" data-template-dialog aria-labelledby="template-dialog-title">
    <form method="dialog"><button class="template-dialog-close" aria-label="Fermer l\u2019aper\xE7u">\xD7</button></form>
    <div class="template-dialog-content"><div class="template-dialog-copy"><p>${esc(flow.title)}</p><h2 id="template-dialog-title" data-template-dialog-title>Aper\xE7u du mod\xE8le</h2><span data-template-dialog-description>Choisis ce mod\xE8le si cette composition te ressemble.</span><a data-template-dialog-select href="${esc(templateUrl(flow.templates[0]))}">Choisir ce mod\xE8le</a></div>
      <div class="template-dialog-stage" data-preview-device="desktop"><img data-template-dialog-image alt="" onerror="this.classList.add('is-missing')"><div class="template-preview-fallback" aria-hidden="true"><span data-template-dialog-fallback>Mod\xE8le Weflo</span><i></i><i></i><i></i></div></div>
    </div>
  </dialog>`;
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
var creationSources = /* @__PURE__ */ new Set(["link", "image", "description", "shopify"]);
function creationWorkspaceUrl(format2, templateId2, state) {
  const params2 = new URLSearchParams();
  if (format2) params2.set("format", format2);
  if (templateId2) params2.set("template", templateId2);
  if (state.source && creationSources.has(state.source)) params2.set("source", state.source);
  if (state.prompt) params2.set("prompt", state.prompt);
  const query = params2.toString();
  return query ? `/creer?${query}` : "/creer";
}
function esc2(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
var sourceLabels = {
  link: { icon: "\u2197", title: "Importer un lien", description: "Amazon, AliExpress, Shopify ou autre site" },
  image: { icon: "\u25A7", title: "Ajouter une image", description: "PNG, JPG ou WebP" },
  description: { icon: "Aa", title: "D\xE9crire mon id\xE9e", description: "Partir d\u2019une intention claire" },
  shopify: { icon: "S", title: "Depuis Shopify", description: "Choisir dans le catalogue connect\xE9" }
};
function renderField(field2, answers2) {
  const value = esc2(answers2[field2.id] ?? "");
  const required = field2.required ? " required" : "";
  if (field2.kind === "textarea" || field2.kind === "list") return `<label class="intake-field ${field2.kind === "list" ? "intake-list" : ""}"><span>${esc2(field2.label)}${field2.required ? "" : " (facultatif)"}</span><textarea name="${esc2(field2.id)}" placeholder="${esc2(field2.placeholder)}"${required}>${value}</textarea></label>`;
  return `<label class="intake-field"><span>${esc2(field2.label)}${field2.required ? "" : " (facultatif)"}</span><input name="${esc2(field2.id)}" value="${value}" placeholder="${esc2(field2.placeholder)}"${required}></label>`;
}
function renderSource(source2) {
  const item = sourceLabels[source2];
  if (source2 === "image") return `<label data-create-source="image"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label>`;
  return `<button type="button" data-create-source="${source2}"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small></button>`;
}
function renderIntake(format2, source2, prompt2, answers2) {
  const flow = flowForFormat(format2);
  return `<button class="back-template" data-back-template>\u2190 Changer de mod\xE8le</button><div class="create-heading"><p>${esc2(flow.title)}</p><h1>Donne-nous la mati\xE8re de d\xE9part.</h1><span>Weflo utilisera ces informations pour construire une premi\xE8re version fid\xE8le \xE0 ton objectif.</span></div><div class="source-grid source-grid-${flow.allowedSources.length}">${flow.allowedSources.map(renderSource).join("")}</div><form class="source-form format-intake" data-source-form><div class="intake-fields">${flow.intake.map((field2) => renderField(field2, answers2)).join("")}</div><label class="intake-field intake-prompt"><span>Contexte \xE0 ajouter</span><textarea name="prompt" placeholder="${source2 === "link" ? "Colle le lien de ton produit\u2026" : "Ajoute une pr\xE9cision utile pour cette page\u2026"}">${esc2(prompt2)}</textarea></label><button>Analyser et continuer</button></form>`;
}
function renderCreateWorkspace(input) {
  const cards = creationFormats.map((format2) => `<button class="format-card" data-create-format="${format2.id}"><span>${format2.icon}</span><strong>${format2.title}</strong><small>${format2.description}</small></button>`).join("");
  const selected = creationFormats.find((format2) => format2.id === input.selectedFormat);
  const flow = input.selectedFormat ? flowForFormat(input.selectedFormat) : null;
  const hasTemplate = Boolean(flow?.templates.some((template2) => template2.id === input.selectedTemplateId));
  const content = !selected ? `<div class="create-heading"><p>Nouvelle cr\xE9ation</p><h1>Qu\u2019est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : selected.id === "blank" ? "" : !hasTemplate ? `<button class="back-format" data-back-format>\u2190 Changer de format</button>${renderTemplateGallery(flow, null, (template2) => creationWorkspaceUrl(flow.id, template2.id, { source: input.source, prompt: input.prompt }))}` : renderIntake(selected.id, input.source, input.prompt, input.answers);
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc2(input.workspaceName)}</small></aside><main>${content}</main></div>`;
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
function esc3(value) {
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
    <header class="build-topbar"><div><span>${esc3(input.formatTitle)}</span><strong>${esc3(input.brandName)} prend forme</strong></div><div class="build-percent"><b>${progress}%</b><span>Construction</span></div></header>
    <div class="build-progress" data-build-progress="${progress}" role="progressbar" aria-label="Construction de la page : ${progress} %" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
    <div class="build-layout">
      <section class="build-status">
        <div class="canardo-status"><span class="canardo-orbit">\u25CF</span><div><small>Canardo travaille maintenant</small><h1>${esc3(current)}</h1><p>La structure, les textes et la direction visuelle sont assembl\xE9s dans une m\xEAme identit\xE9.</p></div></div>
        <div class="stage-stream">${visible.map((stage) => {
    const index = input.stages.indexOf(stage);
    const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";
    return `<div class="stage-row" data-stage-state="${state}"><i>${state === "done" ? "\u2713" : state === "active" ? "\u25CF" : ""}</i><span>${esc3(stage.label)}</span>${state === "active" ? "<em>en cours</em>" : ""}</div>`;
  }).join("")}</div>
        <div class="build-note"><span>\u2726</span><p><strong>Une seule direction de marque.</strong> Chaque nouvelle section reprend les m\xEAmes couleurs, espacements et r\xE8gles typographiques.</p></div>
      </section>
      <section class="storefront-window" data-build-preview>
        <div class="browser-chrome"><i></i><i></i><i></i><span>${esc3(input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")) || "boutique"}.com</span><b>aper\xE7u en direct</b></div>
        <div class="storefront-canvas">
          <div class="preview-nav preview-part ${activeIndex >= 0 ? "is-built" : ""}" data-preview-section="navigation"><strong>${esc3(input.brandName)}</strong><span>Boutique&nbsp;&nbsp; \xC0 propos&nbsp;&nbsp; Journal</span><button>Panier (0)</button></div>
          <div class="preview-hero preview-part ${activeIndex >= 1 ? "is-built" : ""}" data-preview-section="hero"><div><small>La s\xE9lection ${esc3(input.brandName)}</small><h2>Le produit pens\xE9 pour ton quotidien.</h2><p>Une promesse claire, une preuve cr\xE9dible et un parcours sans friction.</p><button>D\xE9couvrir le produit</button></div><div class="preview-media">${image ? `<img src="${esc3(image)}" alt="Produit import\xE9">` : "<span></span>"}</div></div>
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
var templateId = params.get("template");
var source = params.get("source");
var prompt = params.get("prompt") ?? "";
var answers = {};
var draft = null;
var token = "";
var error = "";
var busy = false;
var workspaceName = "Ton espace";
var buildStageIndex = 0;
function esc4(value) {
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
  root.innerHTML = draft ? renderStrategy() : renderCreateWorkspace({ workspaceName, selectedFormat: format, selectedTemplateId: templateId, source, prompt, answers });
  bind();
}
function renderStrategy() {
  const choices = [...draft.personas.map((item) => ({ ...item, kind: "persona" })), ...draft.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li class="active">3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc4(workspaceName)}</small></aside><main><div class="create-heading"><p>${esc4(creationFormats.find((item) => item.id === format)?.title ?? "Cr\xE9ation")}</p><h1>\xC0 qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l\u2019offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc4(item.id)}" aria-pressed="${item.selected}"><strong>${esc4(item.icon)} ${esc4(item.title)}</strong><small>${esc4(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc4(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction\u2026" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() {
  if (!root || !draft) return;
  const formatTitle = creationFormats.find((item) => item.id === format)?.title ?? "Boutique";
  root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li>\u2713 <span>Strat\xE9gie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc4(workspaceName)}</small></aside>${renderBuildExperience({ brandName: draft.brandName || "Ta marque", formatTitle, stages: draft.stages, activeIndex: buildStageIndex, productImage: draft.product?.images[0] })}</div>`;
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
    templateId = null;
    answers = {};
    history.replaceState({}, "", creationWorkspaceUrl(format, null, { source, prompt }));
    render();
  }));
  root?.querySelector("[data-back-format]")?.addEventListener("click", () => {
    format = null;
    templateId = null;
    answers = {};
    draft = null;
    history.replaceState({}, "", creationWorkspaceUrl(null, null, { source, prompt }));
    render();
  });
  root?.querySelector("[data-back-template]")?.addEventListener("click", () => {
    templateId = null;
    history.replaceState({}, "", creationWorkspaceUrl(format, null, { source, prompt }));
    render();
  });
  root?.querySelectorAll("[data-create-source]").forEach((button) => button.addEventListener("click", () => {
    source = button.dataset.createSource ?? null;
    root.querySelector('[name="prompt"]')?.focus();
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
    const form = new FormData(event.currentTarget);
    answers = Object.fromEntries([...form.entries()].filter(([key]) => key !== "prompt").map(([key, value]) => [key, String(value)]));
    prompt = String(form.get("prompt") ?? "").trim();
    const firstAnswer = Object.values(answers).find(Boolean) ?? "";
    if (!prompt && !firstAnswer) return;
    try {
      busy = true;
      if (source === "link" || /^https?:\/\//.test(prompt)) await importLink(prompt);
      else {
        if (!prompt) prompt = firstAnswer;
        await createSimple();
      }
      render();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Import impossible";
      render();
    } finally {
      busy = false;
    }
  });
  const dialog = root?.querySelector("[data-template-dialog]");
  root?.querySelectorAll("[data-template-device]").forEach((button) => button.addEventListener("click", () => {
    const preview = button.closest("[data-template-preview]");
    if (!preview) return;
    const device = button.dataset.templateDevice;
    if (device !== "desktop" && device !== "mobile") return;
    preview.dataset.previewDevice = device;
    preview.querySelectorAll("[data-template-device]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  }));
  root?.querySelectorAll("[data-template-open]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.templateOpen;
    const card = id ? root.querySelector(`[data-template-card="${id}"]`) : null;
    if (!id || !card || !dialog) return;
    const image = dialog.querySelector("[data-template-dialog-image]");
    const desktop = card.querySelector('[data-preview-image="desktop"]');
    const name = card.querySelector("h2")?.textContent ?? "Mod\xE8le";
    const description = card.querySelector("p")?.textContent ?? "";
    if (image && desktop) {
      image.src = desktop.src;
      image.alt = desktop.alt;
    }
    dialog.querySelector("[data-template-dialog-title]").textContent = name;
    dialog.querySelector("[data-template-dialog-description]").textContent = description;
    const select = dialog.querySelector("[data-template-dialog-select]");
    if (select) select.href = creationWorkspaceUrl(format, id, { source, prompt });
    dialog.showModal();
  }));
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
