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
function template(id, format) {
  const details = templateDetails[id];
  if (!details) throw new Error(`Missing creation template details for ${id}`);
  return {
    id,
    format,
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
function templateById(id) {
  const template2 = FORMAT_FLOWS.flatMap((flow) => flow.templates).find((candidate) => candidate.id === id);
  if (!template2) throw new Error(`Unknown creation template: ${id}`);
  return template2;
}

// src/create/format-intake.ts
var sourceLabels = {
  link: { icon: "\u2197", title: "Importer un lien", description: "Amazon, AliExpress, Shopify ou autre site" },
  image: { icon: "\u25A7", title: "Ajouter une image", description: "PNG, JPG ou WebP" },
  description: { icon: "Aa", title: "D\xE9crire mon id\xE9e", description: "Partir d\u2019une intention claire" },
  shopify: { icon: "S", title: "Depuis Shopify", description: "Choisir dans le catalogue connect\xE9" }
};
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderField(field2, answers, missingFields) {
  const value = esc(answers[field2.id] ?? "");
  const required = field2.required ? " required" : "";
  const missing = missingFields.has(field2.id);
  const error2 = missing ? `<small class="intake-error" id="error-${esc(field2.id)}">Ce champ est obligatoire.</small>` : "";
  const accessibility = missing ? ` aria-invalid="true" aria-describedby="error-${esc(field2.id)}"` : "";
  const name = `answers[${esc(field2.id)}]`;
  const label = `<span>${esc(field2.label)}${field2.required ? "" : " (facultatif)"}</span>`;
  if (field2.kind === "textarea" || field2.kind === "list") {
    return `<label class="intake-field ${field2.kind === "list" ? "intake-list" : ""}">${label}<textarea name="${name}" placeholder="${esc(field2.placeholder)}"${required}${accessibility}>${value}</textarea>${error2}</label>`;
  }
  return `<label class="intake-field">${label}<input name="${name}" value="${value}" placeholder="${esc(field2.placeholder)}"${required}${accessibility}>${error2}</label>`;
}
function renderSource(source) {
  const item = sourceLabels[source];
  if (source === "image") {
    return `<label data-create-source="image"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label>`;
  }
  return `<button type="button" data-create-source="${source}"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small></button>`;
}
function validateFormatIntake(flow, answers) {
  return flow.intake.filter((field2) => field2.required && !(answers[field2.id] ?? "").trim()).map((field2) => field2.id);
}
function answersFromFormData(form) {
  return Object.fromEntries([...form.entries()].flatMap(([key, value]) => {
    const fieldId = /^answers\[(.+)\]$/.exec(key)?.[1];
    return fieldId ? [[fieldId, String(value)]] : [];
  }));
}
function renderFormatIntake(flow, answers, source, state2 = {}) {
  const missingFields = new Set(state2.missingFieldIds ?? []);
  const promptPlaceholder = source === "link" ? "Colle le lien de ton produit\u2026" : "Ajoute une pr\xE9cision utile pour cette page\u2026";
  const submit = state2.busy ? "<button disabled>Analyse en cours\u2026</button>" : "<button>Analyser et continuer</button>";
  return `<div class="source-grid source-grid-${flow.allowedSources.length}">${flow.allowedSources.map(renderSource).join("")}</div><form class="source-form format-intake" data-source-form novalidate><div class="intake-fields">${flow.intake.map((field2) => renderField(field2, answers, missingFields)).join("")}</div><label class="intake-field intake-prompt"><span>Contexte \xE0 ajouter</span><textarea name="prompt" placeholder="${promptPlaceholder}">${esc(state2.prompt ?? "")}</textarea></label>${submit}</form>`;
}

// src/create/template-gallery.ts
function esc2(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderPreview(template2) {
  const title = `Aper\xE7u ${template2.name}`;
  return `<div class="template-preview" data-template-preview="${esc2(template2.id)}" data-preview-device="desktop">
    <div class="template-preview-frame">
      <img src="${esc2(template2.previewDesktop)}" alt="${esc2(title)} sur ordinateur" data-preview-image="desktop" data-preview-key="previewDesktop" onerror="this.classList.add('is-missing')">
      <img src="${esc2(template2.previewMobile)}" alt="${esc2(title)} sur mobile" data-preview-image="mobile" data-preview-key="previewMobile" onerror="this.classList.add('is-missing')">
      <div class="template-preview-fallback" aria-hidden="true"><span>${esc2(template2.name)}</span><i></i><i></i><i></i></div>
    </div>
    <div class="template-device-switch" role="group" aria-label="Format de l\u2019aper\xE7u ${esc2(template2.name)}">
      <button type="button" data-template-device="desktop" aria-pressed="true">Ordinateur</button>
      <button type="button" data-template-device="mobile" aria-pressed="false">Mobile</button>
    </div>
  </div>`;
}
function renderTemplateGallery(flow, selectedTemplateId, templateUrl = (template2) => `/creer?format=${flow.id}&template=${template2.id}`) {
  const selected = flow.templates.some((template2) => template2.id === selectedTemplateId) ? selectedTemplateId : null;
  const cards = flow.templates.map((template2) => `<article class="template-card" data-template-card="${esc2(template2.id)}" ${template2.id === selected ? 'data-selected="true"' : ""}>
    ${renderPreview(template2)}
    <div class="template-card-copy"><div><h2>${esc2(template2.name)}</h2><p>${esc2(template2.description)}</p></div>
      <div class="template-card-actions"><button type="button" class="template-preview-button" data-template-open="${esc2(template2.id)}">Aper\xE7u</button><a href="${esc2(templateUrl(template2))}" data-template-select="${esc2(template2.id)}">Choisir ce mod\xE8le</a></div>
    </div>
  </article>`).join("");
  return `<section class="template-gallery" aria-labelledby="template-gallery-title">
    <header class="template-gallery-heading"><p>${esc2(flow.title)}</p><h1 id="template-gallery-title">Choisis une direction pour ta page.</h1><span>Chaque mod\xE8le pose la hi\xE9rarchie, le rythme et les sections de d\xE9part. Tu pourras tout ajuster dans l\u2019\xE9diteur.</span></header>
    <div class="template-gallery-list">${cards}</div>
  </section>
  <dialog class="template-preview-dialog" data-template-dialog aria-labelledby="template-dialog-title">
    <form method="dialog"><button class="template-dialog-close" aria-label="Fermer l\u2019aper\xE7u">\xD7</button></form>
    <div class="template-dialog-content"><div class="template-dialog-copy"><p>${esc2(flow.title)}</p><h2 id="template-dialog-title" data-template-dialog-title>Aper\xE7u du mod\xE8le</h2><span data-template-dialog-description>Choisis ce mod\xE8le si cette composition te ressemble.</span><a data-template-dialog-select href="${esc2(templateUrl(flow.templates[0]))}">Choisir ce mod\xE8le</a></div>
      <div class="template-dialog-stage" data-preview-device="desktop"><img data-template-dialog-image alt="" onerror="this.classList.add('is-missing')"><div class="template-preview-fallback" aria-hidden="true"><span data-template-dialog-fallback>Mod\xE8le Weflo</span><i></i><i></i><i></i></div></div>
    </div>
  </dialog>`;
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
function renderStrategyBackControl() {
  return '<button type="button" class="back-template" data-back-strategy>\u2190 Retour aux informations</button>';
}
var creationSources = /* @__PURE__ */ new Set(["link", "image", "description", "shopify"]);
function sourceForFormat(format, source) {
  const selectedSource = source && creationSources.has(source) ? source : null;
  if (!format || !selectedSource) return selectedSource;
  const allowedSources = flowForFormat(format).allowedSources;
  if (allowedSources.includes(selectedSource)) return selectedSource;
  return allowedSources.includes("description") ? "description" : allowedSources[0] ?? null;
}
function creationWorkspaceUrl(format, templateId, state2) {
  const params = new URLSearchParams();
  const source = sourceForFormat(format, state2.source);
  if (format) params.set("format", format);
  if (templateId) params.set("template", templateId);
  if (source) params.set("source", source);
  const prompt = persistentCreationText(state2.prompt);
  if (prompt) params.set("prompt", prompt);
  const query = params.toString();
  return query ? `/creer?${query}` : "/creer";
}
function esc3(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderIntake(format, source, prompt, answers, missingFieldIds2 = [], busy2 = false) {
  const flow = flowForFormat(format);
  return `<button class="back-template" data-back-template>\u2190 Changer de mod\xE8le</button><div class="create-heading"><p>${esc3(flow.title)}</p><h1>Donne-nous la mati\xE8re de d\xE9part.</h1><span>Weflo utilisera ces informations pour construire une premi\xE8re version fid\xE8le \xE0 ton objectif.</span></div>${renderFormatIntake(flow, answers, source, { prompt, missingFieldIds: missingFieldIds2, busy: busy2 })}`;
}
function renderCreateWorkspace(input) {
  const state2 = "state" in input ? input.state : {
    format: input.selectedFormat,
    templateId: input.selectedTemplateId,
    source: sourceForFormat(input.selectedFormat, input.source),
    prompt: input.prompt,
    answers: input.answers,
    step: input.selectedFormat === "blank" ? "create-blank" : !input.selectedFormat ? "format" : input.selectedTemplateId ? "intake" : "template"
  };
  const cards = creationFormats.map((format) => `<button class="format-card" data-create-format="${format.id}"><span>${format.icon}</span><strong>${format.title}</strong><small>${format.description}</small></button>`).join("");
  const selected = creationFormats.find((format) => format.id === state2.format);
  const flow = state2.format ? flowForFormat(state2.format) : null;
  const source = sourceForFormat(state2.format, state2.source);
  const content = state2.step === "format" || !selected ? `<div class="create-heading"><p>Nouvelle cr\xE9ation</p><h1>Qu\u2019est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : state2.step === "create-blank" ? "" : state2.step === "template" ? `<button class="back-format" data-back-format>\u2190 Changer de format</button>${renderTemplateGallery(flow, null, (template2) => creationWorkspaceUrl(flow.id, template2.id, { source, prompt: state2.prompt }))}` : renderIntake(selected.id, source, state2.prompt, state2.answers, input.missingFieldIds, input.busy);
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc3(input.workspaceName)}</small></aside><main>${content}</main></div>`;
}

// src/onboarding/template-recipe.ts
var TEMPLATE_RECIPES = [
  {
    id: "store-editorial-commerce",
    format: "store",
    sections: ["announcement", "navigation", "hero", "imageText", "collectionGrid", "productMain", "benefits", "reviews", "newsletter", "footer"],
    variants: { hero: "editorial", imageText: "story", collectionGrid: "curated", productMain: "calm-buy-box", reviews: "editorial-stories" }
  },
  {
    id: "store-conversion-modern",
    format: "store",
    sections: ["announcement", "navigation", "productHero", "productMain", "benefits", "bundle", "reviews", "shipping", "faq", "cta", "footer"],
    variants: { productHero: "problem-solution", productMain: "conversion-split", benefits: "icon-grid", bundle: "quantity-break", reviews: "results-wall" }
  },
  {
    id: "store-maison-premium",
    format: "store",
    sections: ["announcement", "navigation", "hero", "collectionGrid", "imageText", "press", "benefits", "productMain", "newsletter", "footer"],
    variants: { hero: "split", collectionGrid: "premium", imageText: "brand-story", press: "press-quotes", productMain: "luxury-buy-box" }
  },
  {
    id: "product-buybox-premium",
    format: "product",
    sections: ["announcement", "navigation", "productHero", "gallery", "productMain", "benefits", "reviews", "shipping", "faq", "cta", "footer"],
    variants: { productHero: "ambient-editorial", productMain: "premium", reviews: "featured" }
  },
  {
    id: "product-demonstration",
    format: "product",
    sections: ["navigation", "productHero", "gallery", "imageText", "benefits", "comparison", "productMain", "reviews", "faq", "cta", "footer"],
    variants: { productHero: "problem-solution", gallery: "demonstration", benefits: "visual", comparison: "feature-led", productMain: "technical-buy-box" }
  },
  {
    id: "product-bundle-first",
    format: "product",
    sections: ["announcement", "navigation", "productHero", "productMain", "bundle", "benefits", "shipping", "reviews", "faq", "cta", "footer"],
    variants: { productHero: "conversion-split", productMain: "bundle-led", bundle: "quantity-break", benefits: "icon-grid" }
  },
  {
    id: "landing-direct-response",
    format: "landing",
    sections: ["announcement", "navigation", "hero", "benefits", "comparison", "faq", "form", "cta", "footer"],
    variants: { hero: "direct-response", benefits: "icon-grid", comparison: "feature-led", form: "lead-capture", cta: "repeated" }
  },
  {
    id: "landing-editorial-premium",
    format: "landing",
    sections: ["navigation", "hero", "imageText", "richText", "benefits", "faq", "cta", "footer"],
    variants: { hero: "editorial", imageText: "story", richText: "longform", benefits: "editorial" }
  },
  {
    id: "landing-visual-demo",
    format: "landing",
    sections: ["navigation", "hero", "gallery", "benefits", "steps", "comparison", "form", "cta", "footer"],
    variants: { hero: "visual", gallery: "demonstration", benefits: "diagram", steps: "process", comparison: "feature-led" }
  },
  {
    id: "advertorial-journal",
    format: "advertorial",
    sections: ["navigation", "hero", "press", "richText", "imageText", "comparison", "faq", "cta", "footer"],
    variants: { hero: "editorial", press: "inline", richText: "journal", imageText: "story" }
  },
  {
    id: "advertorial-founder-story",
    format: "advertorial",
    sections: ["navigation", "hero", "richText", "imageText", "benefits", "form", "cta", "footer"],
    variants: { hero: "founder", richText: "narrative", imageText: "founder", benefits: "editorial" }
  },
  {
    id: "advertorial-comparison",
    format: "advertorial",
    sections: ["navigation", "hero", "comparison", "richText", "benefits", "faq", "cta", "footer"],
    variants: { hero: "comparison", comparison: "feature-led", richText: "evidence", benefits: "icon-grid" }
  },
  {
    id: "quiz-diagnostic",
    format: "quiz",
    sections: ["navigation", "hero", "benefits", "quiz", "form", "faq", "cta", "footer"],
    variants: { hero: "diagnostic", quiz: "diagnostic", form: "stepper", benefits: "icon-grid" }
  },
  {
    id: "quiz-routine",
    format: "quiz",
    sections: ["navigation", "hero", "richText", "quiz", "benefits", "form", "newsletter", "footer"],
    variants: { hero: "editorial", richText: "routine", quiz: "routine", benefits: "editorial" }
  },
  {
    id: "quiz-recommendation",
    format: "quiz",
    sections: ["announcement", "navigation", "hero", "quiz", "comparison", "form", "cta", "footer"],
    variants: { hero: "recommendation", quiz: "recommendation", comparison: "result", form: "stepper", cta: "result" }
  },
  {
    id: "home-brand-editorial",
    format: "home",
    sections: ["announcement", "navigation", "hero", "imageText", "collectionGrid", "testimonials", "newsletter", "footer"],
    variants: { hero: "editorial", imageText: "brand-story", collectionGrid: "curated", testimonials: "editorial-stories" }
  },
  {
    id: "home-catalogue-premium",
    format: "home",
    sections: ["announcement", "navigation", "hero", "collectionGrid", "benefits", "imageText", "newsletter", "footer"],
    variants: { hero: "catalogue", collectionGrid: "premium", benefits: "icon-grid", imageText: "editorial" }
  },
  {
    id: "home-story-first",
    format: "home",
    sections: ["navigation", "hero", "richText", "imageText", "press", "collectionGrid", "newsletter", "footer"],
    variants: { hero: "story", richText: "manifesto", imageText: "brand-story", press: "press-quotes", collectionGrid: "curated" }
  },
  {
    id: "blog-magazine",
    format: "blog",
    sections: ["navigation", "hero", "richText", "imageText", "press", "newsletter", "footer"],
    variants: { hero: "magazine", richText: "longform", imageText: "editorial", press: "inline" }
  },
  {
    id: "blog-guide",
    format: "blog",
    sections: ["navigation", "hero", "richText", "benefits", "faq", "newsletter", "footer"],
    variants: { hero: "guide", richText: "guide", benefits: "steps", faq: "inline" }
  },
  {
    id: "blog-study",
    format: "blog",
    sections: ["navigation", "hero", "richText", "comparison", "press", "newsletter", "footer"],
    variants: { hero: "study", richText: "analysis", comparison: "evidence", press: "sources" }
  }
];
var recipesById = new Map(TEMPLATE_RECIPES.map((recipe) => [recipe.id, recipe]));

// src/onboarding/creation-recipe.ts
var CREATION_FORMATS = /* @__PURE__ */ new Set(["store", "product", "landing", "advertorial", "quiz", "home", "blog", "blank"]);
function isCreationFormat(value) {
  return typeof value === "string" && CREATION_FORMATS.has(value);
}

// src/create/flow-state.ts
var steps = /* @__PURE__ */ new Set(["format", "template", "intake", "strategy", "build", "create-blank"]);
var sources2 = /* @__PURE__ */ new Set(["link", "image", "description", "shopify"]);
function assertCompatibleTemplate(format, templateId) {
  const template2 = templateById(templateId);
  if (template2.format !== format) throw new Error(`Template ${templateId} is not compatible with ${format}`);
}
function safeAnswers(format, value) {
  if (!format || format === "blank" || !value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value;
  return Object.fromEntries(flowForFormat(format).intake.flatMap((field2) => {
    const answer = raw[field2.id];
    return typeof answer === "string" && persistentCreationText(answer) === answer ? [[field2.id, answer]] : [];
  }));
}
function missingRequiredFields(state2) {
  if (!state2.format || state2.format === "blank") return [];
  return flowForFormat(state2.format).intake.filter((field2) => field2.required && !(state2.answers[field2.id] ?? "").trim()).map((field2) => field2.id);
}
function assertState(state2) {
  if (!state2.format) {
    if (state2.templateId) throw new Error("A template requires a creation format");
    if (state2.step !== "format") throw new Error("A creation format must be selected before continuing");
    return;
  }
  if (state2.format === "blank") {
    if (state2.templateId) throw new Error("A blank page cannot use a template");
    if (state2.source) throw new Error("A blank page cannot use an import source");
    if (state2.step !== "create-blank") throw new Error("A blank page must open directly in creation");
    return;
  }
  if (state2.templateId) assertCompatibleTemplate(state2.format, state2.templateId);
  if (state2.step === "create-blank") throw new Error("Only a blank page can use the create-blank step");
  if (state2.step === "format" && state2.templateId) throw new Error("The format choice cannot have a selected template");
  if (state2.step === "template" && state2.templateId) throw new Error("The template gallery cannot have a selected template");
  if ((state2.step === "intake" || state2.step === "strategy" || state2.step === "build") && !state2.templateId) {
    throw new Error("A template must be selected before intake");
  }
  if (state2.source && !flowForFormat(state2.format).allowedSources.includes(state2.source)) {
    throw new Error(`Source ${state2.source} is not compatible with ${state2.format}`);
  }
  if ((state2.step === "strategy" || state2.step === "build") && missingRequiredFields(state2).length) {
    throw new Error(`Missing required intake fields: ${missingRequiredFields(state2).join(", ")}`);
  }
}
function initialCreationState(url) {
  const requestedFormat = url.searchParams.get("format");
  const format = isCreationFormat(requestedFormat) ? requestedFormat : null;
  const requestedTemplate = url.searchParams.get("template");
  const templateId = format && format !== "blank" && requestedTemplate ? requestedTemplate : null;
  if (format && templateId) assertCompatibleTemplate(format, templateId);
  const state2 = {
    format,
    templateId,
    source: format === "blank" ? null : sourceForFormat(format, url.searchParams.get("source")),
    prompt: url.searchParams.get("prompt") ?? "",
    answers: {},
    step: format === "blank" ? "create-blank" : !format ? "format" : templateId ? "intake" : "template"
  };
  assertState(state2);
  return state2;
}
function transitionCreationFlow(state2, event) {
  assertState(state2);
  let next;
  switch (event.type) {
    case "SELECT_FORMAT": {
      const format = event.format;
      next = {
        ...state2,
        format,
        templateId: null,
        source: format === "blank" ? null : sourceForFormat(format, state2.source),
        answers: safeAnswers(format, state2.answers),
        step: format === "blank" ? "create-blank" : "template"
      };
      break;
    }
    case "SELECT_TEMPLATE":
      if (!state2.format || state2.format === "blank") throw new Error("Select a creation format before a template");
      assertCompatibleTemplate(state2.format, event.templateId);
      next = { ...state2, templateId: event.templateId, step: "intake" };
      break;
    case "SELECT_SOURCE":
      if (!state2.format || state2.format === "blank") throw new Error("Select a compatible creation format before a source");
      next = { ...state2, source: sourceForFormat(state2.format, event.source) };
      break;
    case "UPDATE_INTAKE":
      next = {
        ...state2,
        prompt: event.prompt,
        answers: safeAnswers(state2.format, event.answers)
      };
      break;
    case "CONTINUE": {
      if (state2.format === "blank") return state2;
      if (state2.step !== "intake") throw new Error("The creation flow cannot continue from this step");
      const missing = missingRequiredFields(state2);
      if (missing.length) throw new Error(`Missing required intake fields: ${missing.join(", ")}`);
      next = { ...state2, step: "strategy" };
      break;
    }
    case "START_BUILD":
      if (state2.step !== "strategy") throw new Error("Strategy must be ready before construction");
      next = { ...state2, step: "build" };
      break;
    case "BACK":
      if (state2.step === "build") next = { ...state2, step: "strategy" };
      else if (state2.step === "strategy") next = { ...state2, step: "intake" };
      else if (state2.step === "intake") next = { ...state2, templateId: null, step: "template" };
      else if (state2.step === "template") next = { ...state2, templateId: null, step: "format" };
      else next = state2;
      break;
  }
  assertState(next);
  return next;
}
function serializeCreationDraft(state2) {
  const format = isCreationFormat(state2.format) ? state2.format : null;
  const templateId = format && format !== "blank" && state2.templateId ? state2.templateId : null;
  if (format && templateId) assertCompatibleTemplate(format, templateId);
  const source = format === "blank" ? null : sourceForFormat(format, state2.source);
  return JSON.stringify({
    version: 2,
    format,
    templateId,
    source,
    prompt: persistentCreationText(state2.prompt),
    answers: safeAnswers(format, state2.answers),
    step: state2.step
  });
}
function restoreCreationDraft(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.version !== void 0 && value.version !== 2) return null;
    const format = value.format === null ? null : isCreationFormat(value.format) ? value.format : null;
    if (value.format !== null && !format) return null;
    const templateId = value.templateId === null ? null : typeof value.templateId === "string" ? value.templateId : null;
    if (value.templateId !== null && !templateId) return null;
    const source = value.source === null ? null : sources2.has(value.source) ? value.source : null;
    if (value.source !== null && !source) return null;
    const step = value.step === void 0 ? format === "blank" ? "create-blank" : !format ? "format" : templateId ? "intake" : "template" : steps.has(value.step) ? value.step : null;
    if (!step) return null;
    const state2 = {
      format,
      templateId,
      source,
      prompt: persistentCreationText(value.prompt),
      answers: safeAnswers(format, value.answers),
      step
    };
    assertState(state2);
    return state2;
  } catch {
    return null;
  }
}
function mergeCompatibleCreationDraft(urlState, saved, url) {
  if (!saved) return urlState;
  const explicitFormat = url.searchParams.has("format");
  if (explicitFormat && saved.format !== urlState.format) return urlState;
  const format = explicitFormat ? urlState.format : saved.format;
  if (!format) return urlState;
  if (url.searchParams.has("source") && urlState.source && sourceForFormat(format, urlState.source) !== urlState.source) return urlState;
  if (format === "blank") return { ...urlState, format, templateId: null, source: null, answers: {}, step: "create-blank" };
  const explicitTemplate = url.searchParams.has("template");
  const templateId = explicitTemplate ? urlState.templateId : saved.templateId;
  if (templateId) {
    try {
      assertCompatibleTemplate(format, templateId);
    } catch {
      return urlState;
    }
  }
  const source = url.searchParams.has("source") ? sourceForFormat(format, urlState.source) : sourceForFormat(format, saved.source);
  const prompt = url.searchParams.has("prompt") ? urlState.prompt : saved.prompt;
  const answers = safeAnswers(format, saved.answers);
  const step = !templateId && saved.step === "format" ? "format" : templateId ? "intake" : "template";
  const merged = { format, templateId, source, prompt, answers, step };
  assertState(merged);
  return merged;
}
function submissionActionForState(state2) {
  assertState(state2);
  if (state2.source === "link") return "link";
  if (state2.source === "image") return "image";
  return "simple";
}
function creationStartupAction(state2) {
  assertState(state2);
  return state2.step === "create-blank" ? "create-blank" : "render";
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
function esc4(value) {
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
    <header class="build-topbar"><div><span>${esc4(input.formatTitle)}</span><strong>${esc4(input.brandName)} prend forme</strong></div><div class="build-percent"><b>${progress}%</b><span>Construction</span></div></header>
    <div class="build-progress" data-build-progress="${progress}" role="progressbar" aria-label="Construction de la page : ${progress} %" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
    <div class="build-layout">
      <section class="build-status">
        <div class="canardo-status"><span class="canardo-orbit">\u25CF</span><div><small>Canardo travaille maintenant</small><h1>${esc4(current)}</h1><p>La structure, les textes et la direction visuelle sont assembl\xE9s dans une m\xEAme identit\xE9.</p></div></div>
        <div class="stage-stream">${visible.map((stage) => {
    const index = input.stages.indexOf(stage);
    const state2 = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";
    return `<div class="stage-row" data-stage-state="${state2}"><i>${state2 === "done" ? "\u2713" : state2 === "active" ? "\u25CF" : ""}</i><span>${esc4(stage.label)}</span>${state2 === "active" ? "<em>en cours</em>" : ""}</div>`;
  }).join("")}</div>
        <div class="build-note"><span>\u2726</span><p><strong>Une seule direction de marque.</strong> Chaque nouvelle section reprend les m\xEAmes couleurs, espacements et r\xE8gles typographiques.</p></div>
      </section>
      <section class="storefront-window" data-build-preview>
        <div class="browser-chrome"><i></i><i></i><i></i><span>${esc4(input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")) || "boutique"}.com</span><b>aper\xE7u en direct</b></div>
        <div class="storefront-canvas">
          <div class="preview-nav preview-part ${activeIndex >= 0 ? "is-built" : ""}" data-preview-section="navigation"><strong>${esc4(input.brandName)}</strong><span>Boutique&nbsp;&nbsp; \xC0 propos&nbsp;&nbsp; Journal</span><button>Panier (0)</button></div>
          <div class="preview-hero preview-part ${activeIndex >= 1 ? "is-built" : ""}" data-preview-section="hero"><div><small>La s\xE9lection ${esc4(input.brandName)}</small><h2>Le produit pens\xE9 pour ton quotidien.</h2><p>Une promesse claire, une preuve cr\xE9dible et un parcours sans friction.</p><button>D\xE9couvrir le produit</button></div><div class="preview-media">${image ? `<img src="${esc4(image)}" alt="Produit import\xE9">` : "<span></span>"}</div></div>
          <div class="preview-trust preview-part ${activeIndex >= 2 ? "is-built" : ""}" data-preview-section="offre"><span>Livraison suivie</span><span>Paiement s\xE9curis\xE9</span><span>30 jours pour essayer</span></div>
          <div class="preview-benefits preview-part ${activeIndex >= 3 ? "is-built" : ""}" data-preview-section="b\xE9n\xE9fices"><article><i>01</i><strong>Con\xE7u avec intention</strong><p>Le b\xE9n\xE9fice principal expliqu\xE9 sans d\xE9tour.</p></article><article><i>02</i><strong>Simple \xE0 adopter</strong><p>Une d\xE9monstration visuelle qui rassure.</p></article><article><i>03</i><strong>Fait pour durer</strong><p>Des preuves concr\xE8tes avant la promesse.</p></article></div>
          <div class="preview-proof preview-part ${activeIndex >= 4 ? "is-built" : ""}" data-preview-section="preuves"><div><span>\u2605\u2605\u2605\u2605\u2605</span><strong>\u201CC\u2019est exactement ce que je cherchais.\u201D</strong><small>Acheteur v\xE9rifi\xE9</small></div><div class="proof-image"></div></div>
          <div class="preview-building"><span></span><span></span><span></span></div>
        </div>
      </section>
    </div>
  </main>`;
}

// src/create/submission-lock.ts
function createSubmissionLock() {
  let locked = false;
  return {
    get locked() {
      return locked;
    },
    tryAcquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    }
  };
}

// src/hydrate/creer.ts
var CREATION_DRAFT_KEY = "weflo-create-draft-v2";
var root = document.querySelector("#create-app");
var state = initialCreationState(new URL(location.href));
var missingFieldIds = [];
var draft = null;
var token = "";
var error = "";
var busy = false;
var workspaceName = "Ton espace";
var buildStageIndex = 0;
var submissionLock = createSubmissionLock();
function esc5(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
async function request(url, init) {
  const response = await fetch(url, init);
  const body = await readApiJson(response);
  if (!response.ok) throw new Error(body.message || "Cette \xE9tape n\u2019a pas abouti.");
  return body;
}
function readSavedState() {
  try {
    return restoreCreationDraft(sessionStorage.getItem(CREATION_DRAFT_KEY));
  } catch {
    return null;
  }
}
function persistState() {
  try {
    sessionStorage.setItem(CREATION_DRAFT_KEY, serializeCreationDraft(state));
  } catch {
  }
}
function replaceWorkspaceUrl() {
  history.replaceState({}, "", creationWorkspaceUrl(state.format, state.templateId, { source: state.source, prompt: state.prompt }));
}
function commitState(next, shouldRender = true) {
  state = next;
  persistState();
  replaceWorkspaceUrl();
  if (shouldRender) render();
}
function render() {
  if (!root) return;
  if (state.step === "strategy" && draft) root.innerHTML = renderStrategy();
  else if (state.step === "build" && draft) renderBuild();
  else root.innerHTML = renderCreateWorkspace({ workspaceName, state, missingFieldIds, busy: submissionLock.locked });
  bind();
}
function renderStrategy() {
  const choices = [...draft.personas.map((item) => ({ ...item, kind: "persona" })), ...draft.angles.map((item) => ({ ...item, kind: "angle", insight: item.description }))];
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">\u2190 Retour \xE0 l\u2019espace</a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li class="active">3 <span>Strat\xE9gie</span></li><li>4 <span>Construction</span></li></ol><small>${esc5(workspaceName)}</small></aside><main>${renderStrategyBackControl()}<div class="create-heading"><p>${esc5(creationFormats.find((item) => item.id === state.format)?.title ?? "Cr\xE9ation")}</p><h1>\xC0 qui doit parler cette page ?</h1><span>Canardo a extrait ces pistes du produit. Active celles qui doivent guider les titres, les preuves et l\u2019offre.</span></div><div class="strategy-grid">${choices.map((item) => `<button class="strategy-card" data-strategy="${item.kind}:${esc5(item.id)}" aria-pressed="${item.selected}"><strong>${esc5(item.icon)} ${esc5(item.title)}</strong><small>${esc5(item.insight)}</small></button>`).join("")}</div>${error ? `<p class="create-error">${esc5(error)}</p>` : ""}<div class="strategy-actions"><button data-build ${busy ? "disabled" : ""}>${busy ? "Construction\u2026" : "Construire la page"}</button></div></main></div>`;
}
function renderBuild() {
  if (!root || !draft) return;
  const formatTitle = creationFormats.find((item) => item.id === state.format)?.title ?? "Boutique";
  root.innerHTML = `<div class="create-shell build-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><ol><li>\u2713 <span>Format</span></li><li>\u2713 <span>Produit</span></li><li>\u2713 <span>Strat\xE9gie</span></li><li class="active">4 <span>Construction</span></li></ol><small>${esc5(workspaceName)}</small></aside>${renderBuildExperience({ brandName: draft.brandName || "Ta marque", formatTitle, stages: draft.stages, activeIndex: buildStageIndex, productImage: draft.product?.images[0] })}</div>`;
}
async function importLink(value) {
  const body = await request("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: value, language: "fr" }) });
  draft = body.draft;
  token = body.claimToken;
  await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: state.format ?? "store", templateId: state.templateId, answers: state.answers, language: "fr" }) });
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
  await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: state.format ?? "store", templateId: state.templateId, answers: state.answers, language: "fr" }) });
}
async function createSimple() {
  const type = state.format === "blog" ? "write" : state.format === "blank" ? "blank" : "sell";
  const name = state.prompt.trim() || Object.values(state.answers).find((value) => value.trim()) || creationFormats.find((item) => item.id === state.format)?.title || "Nouvelle page";
  const page = await request("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, name, creationFormat: state.format, templateId: state.templateId, answers: state.answers }) });
  location.assign(`/editeur?page=${page.id}`);
}
async function build() {
  if (!draft) return;
  state = transitionCreationFlow(state, { type: "START_BUILD" });
  persistState();
  replaceWorkspaceUrl();
  busy = true;
  error = "";
  buildStageIndex = 0;
  renderBuild();
  let timer;
  try {
    await request(`/api/onboarding/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json", "x-weflo-claim-token": token }, body: JSON.stringify({ creationFormat: state.format ?? "store", personas: draft.personas, angles: draft.angles, language: "fr" }) });
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
    missingFieldIds = [];
    draft = null;
    commitState(transitionCreationFlow(state, { type: "SELECT_FORMAT", format: button.dataset.createFormat }));
    if (state.step === "create-blank") void createSimple().catch((reason) => {
      error = reason instanceof Error ? reason.message : "Cr\xE9ation impossible";
      render();
    });
  }));
  root?.querySelector("[data-back-format]")?.addEventListener("click", () => {
    missingFieldIds = [];
    draft = null;
    commitState(transitionCreationFlow(state, { type: "BACK" }));
  });
  root?.querySelector("[data-back-template]")?.addEventListener("click", () => {
    missingFieldIds = [];
    commitState(transitionCreationFlow(state, { type: "BACK" }));
  });
  root?.querySelectorAll("button[data-create-source]").forEach((button) => button.addEventListener("click", () => {
    commitState(transitionCreationFlow(state, { type: "SELECT_SOURCE", source: button.dataset.createSource }));
    root?.querySelector('[name="prompt"]')?.focus();
  }));
  root?.querySelector("[data-create-image]")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const form = root?.querySelector("[data-source-form]");
    if (form) {
      const data = new FormData(form);
      state = transitionCreationFlow(state, { type: "UPDATE_INTAKE", answers: answersFromFormData(data), prompt: String(data.get("prompt") ?? "").trim() });
    }
    state = transitionCreationFlow(state, { type: "SELECT_SOURCE", source: "image" });
    persistState();
    replaceWorkspaceUrl();
    missingFieldIds = state.format ? validateFormatIntake(flowForFormat(state.format), state.answers) : [];
    try {
      busy = true;
      await importImage(file);
      if (!missingFieldIds.length) commitState(transitionCreationFlow(state, { type: "CONTINUE" }));
      else render();
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Import impossible";
      render();
    } finally {
      busy = false;
    }
  });
  const intakeForm = root?.querySelector("[data-source-form]");
  intakeForm?.addEventListener("input", () => {
    const data = new FormData(intakeForm);
    state = transitionCreationFlow(state, { type: "UPDATE_INTAKE", answers: answersFromFormData(data), prompt: String(data.get("prompt") ?? "") });
    persistState();
    replaceWorkspaceUrl();
  });
  intakeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!submissionLock.tryAcquire()) return;
    const data = new FormData(event.currentTarget);
    let updated = transitionCreationFlow(state, { type: "UPDATE_INTAKE", answers: answersFromFormData(data), prompt: String(data.get("prompt") ?? "").trim() });
    missingFieldIds = updated.format ? validateFormatIntake(flowForFormat(updated.format), updated.answers) : [];
    commitState(updated, false);
    if (missingFieldIds.length) {
      submissionLock.release();
      render();
      return;
    }
    const firstAnswer = Object.values(updated.answers).find((value) => value.trim()) ?? "";
    if (!updated.prompt && !firstAnswer) {
      submissionLock.release();
      render();
      return;
    }
    if (!updated.prompt) {
      updated = transitionCreationFlow(updated, { type: "UPDATE_INTAKE", answers: updated.answers, prompt: firstAnswer });
      commitState(updated, false);
    }
    const action = submissionActionForState(updated);
    if (action === "image" && !draft) {
      submissionLock.release();
      error = "Ajoute une image avant de continuer.";
      render();
      return;
    }
    render();
    try {
      error = "";
      if (action === "link") await importLink(updated.prompt);
      if (action === "simple") {
        state = transitionCreationFlow(updated, { type: "CONTINUE" });
        persistState();
        replaceWorkspaceUrl();
        await createSimple();
        return;
      }
      submissionLock.release();
      commitState(transitionCreationFlow(updated, { type: "CONTINUE" }));
    } catch (reason) {
      submissionLock.release();
      if (state.step === "strategy" && !draft) state = transitionCreationFlow(state, { type: "BACK" });
      persistState();
      replaceWorkspaceUrl();
      error = reason instanceof Error ? reason.message : "Import impossible";
      render();
    }
  });
  root?.querySelectorAll("[data-template-select]").forEach((link) => link.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const id = link.dataset.templateSelect;
    if (id) {
      missingFieldIds = [];
      commitState(transitionCreationFlow(state, { type: "SELECT_TEMPLATE", templateId: id }));
    }
  }));
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
    if (select) {
      select.href = creationWorkspaceUrl(state.format, id, { source: state.source, prompt: state.prompt });
      select.dataset.templateId = id;
    }
    dialog.showModal();
  }));
  dialog?.querySelector("[data-template-dialog-select]")?.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = event.currentTarget.dataset.templateId;
    if (!id) return;
    event.preventDefault();
    dialog.close();
    missingFieldIds = [];
    commitState(transitionCreationFlow(state, { type: "SELECT_TEMPLATE", templateId: id }));
  });
  root?.querySelector("[data-back-strategy]")?.addEventListener("click", () => {
    submissionLock.release();
    missingFieldIds = [];
    commitState(transitionCreationFlow(state, { type: "BACK" }));
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
    if (state.step === "build") state = transitionCreationFlow(state, { type: "BACK" });
    persistState();
    replaceWorkspaceUrl();
    error = reason instanceof Error ? reason.message : "Construction impossible";
    render();
  }));
}
window.addEventListener("popstate", () => {
  const url = new URL(location.href);
  state = mergeCompatibleCreationDraft(initialCreationState(url), readSavedState(), url);
  persistState();
  replaceWorkspaceUrl();
  if (creationStartupAction(state) === "create-blank") void createSimple().catch((reason) => {
    error = reason instanceof Error ? reason.message : "Cr\xE9ation impossible";
    render();
  });
  else render();
});
void (async () => {
  const me = await guardSession();
  if (!me) return;
  workspaceName = me.workspace.name;
  const url = new URL(location.href);
  state = mergeCompatibleCreationDraft(initialCreationState(url), readSavedState(), url);
  persistState();
  replaceWorkspaceUrl();
  if (creationStartupAction(state) === "create-blank") await createSimple();
  else render();
})();
