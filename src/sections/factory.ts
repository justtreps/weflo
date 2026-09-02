import type { EditorBlock, EditorSection, InspectorControl, SettingValue } from "../editor/document";
import { blockValue, edit, escapeHtml, image, safeLink, safeMediaUrl, textControl, value } from "./shared";
import type { BlockDefinition, SectionCategory, SectionDefinition } from "./types";

export type SectionLayout = "navigation" | "announcement" | "hero" | "productHero" | "videoHero" | "gallery" | "imageText" | "beforeAfter" | "cards" | "product" | "bundle" | "comparison" | "faq" | "form" | "quiz" | "cta" | "richText" | "footer" | "spacer" | "divider";

const common: InspectorControl[] = [
  textControl("title", "Titre"), textControl("subtitle", "Sous-titre"), textControl("text", "Texte", "textarea"),
];
const cta: InspectorControl[] = [textControl("cta_label", "Libellé du bouton"), textControl("cta_link", "Lien", "link")];
const media: InspectorControl[] = [textControl("image", "Image", "image"), textControl("image_alt", "Texte alternatif")];
const itemBlock: BlockDefinition = { type: "item", name: "Élément", defaults: { title: "Nouvel élément", text: "Décris cet élément." }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea"), textControl("image", "Image", "image"), textControl("link", "Lien", "link")] };

function renderBlocks(blocks: EditorBlock[], tag = "article"): string {
  return blocks.map((block) => `<${tag} class="wf-section__card" data-wf-block-id="${escapeHtml(block.id)}">${block.settings.image ? `<img src="${safeMediaUrl(block.settings.image)}" alt="${escapeHtml(blockValue(block, "image_alt", blockValue(block, "title")))}">` : ""}<h3>${escapeHtml(blockValue(block, "title", blockValue(block, "label", "Élément")))}</h3><p>${escapeHtml(blockValue(block, "text"))}</p>${block.settings.link ? `<a href="${safeLink(block.settings.link)}">${escapeHtml(blockValue(block, "label", "Découvrir"))}</a>` : ""}</${tag}>`).join("");
}

function button(section: EditorSection): string {
  const label = value(section, "cta_label");
  return label ? `<a class="wf-section__button" href="${safeLink(section.settings.cta_link)}">${escapeHtml(label)}</a>` : "";
}

function web(layout: SectionLayout, section: EditorSection, pageName: string): string {
  const title = value(section, "title", pageName);
  const subtitle = value(section, "subtitle");
  const copy = value(section, "text");
  const heading = edit(layout === "hero" || layout === "productHero" || layout === "videoHero" ? "h1" : "h2", "title", title);
  const intro = `${subtitle ? edit("p", "subtitle", subtitle, "wf-section__eyebrow") : ""}${heading}${copy ? edit("p", "text", copy, "wf-section__copy") : ""}`;
  if (layout === "navigation") return `<nav class="wf-section wf-navigation" aria-label="Navigation principale"><a class="wf-navigation__brand" href="/">${escapeHtml(title)}</a><div>${section.blocks.map((block) => `<a href="${safeLink(block.settings.link)}">${escapeHtml(blockValue(block, "label", "Lien"))}</a>`).join("")}</div>${button(section)}</nav>`;
  if (layout === "announcement") return `<aside class="wf-section wf-announcement">${edit("p", "text", copy || title)}${button(section)}</aside>`;
  if (layout === "hero" || layout === "productHero") return `<div class="wf-section wf-hero wf-hero--${layout}"><div class="wf-hero__content">${intro}${layout === "productHero" ? `<strong class="wf-section__price">${escapeHtml(value(section, "price", "49,00 €"))}</strong>` : ""}${button(section)}</div><figure>${image(section, "image", value(section, "image_alt", title))}</figure></div>`;
  if (layout === "videoHero") { const source = safeMediaUrl(section.settings.video); return `<div class="wf-section wf-video-hero">${source ? `<video autoplay muted loop playsinline poster="${safeMediaUrl(section.settings.image)}"><source src="${source}"></video>` : image(section, "image", value(section, "image_alt", title))}<div>${intro}${button(section)}</div></div>`; }
  if (layout === "gallery") return `<div class="wf-section wf-gallery">${intro}<div class="wf-section__grid">${renderBlocks(section.blocks)}</div></div>`;
  if (layout === "imageText") return `<div class="wf-section wf-image-text">${image(section, "image", value(section, "image_alt", title))}<div>${intro}${button(section)}</div></div>`;
  if (layout === "beforeAfter") return `<div class="wf-section wf-before-after">${intro}<div class="wf-before-after__media">${image(section, "before_image", value(section, "before_alt", "Avant"))}${image(section, "after_image", value(section, "after_alt", "Après"))}</div></div>`;
  if (layout === "product") {
    const variants = section.blocks.filter((block) => block.type === "variant");
    return `<div class="wf-section wf-product">${intro}<div class="wf-section__grid">${renderBlocks(section.blocks.filter((block) => block.type !== "variant"))}</div><form class="wf-product__form" action="/cart/add" method="post"><label>Variante<select name="id">${variants.length ? variants.map((block) => `<option value="${escapeHtml(blockValue(block, "variant_id", block.id))}">${escapeHtml(blockValue(block, "title", "Option"))}</option>`).join("") : '<option value="">Choisir dans Shopify</option>'}</select></label><label>Quantité<input type="number" name="quantity" value="1" min="1"></label><button type="submit">${escapeHtml(value(section, "cta_label", "Ajouter au panier"))}</button></form></div>`;
  }
  if (layout === "bundle") return `<div class="wf-section wf-bundle">${intro}<fieldset><legend>Compose ton bundle</legend>${section.blocks.map((block) => `<label><input type="checkbox" name="bundle" value="${escapeHtml(block.id)}"><span>${escapeHtml(blockValue(block, "title"))}</span><strong>${escapeHtml(blockValue(block, "price"))}</strong></label>`).join("")}</fieldset><output class="wf-bundle__total" aria-live="polite">${escapeHtml(value(section, "price", "Total calculé dans le panier"))}</output>${button(section)}</div>`;
  if (layout === "comparison") return `<div class="wf-section wf-comparison">${intro}<div role="table">${renderBlocks(section.blocks, "div")}</div></div>`;
  if (layout === "faq") return `<div class="wf-section wf-faq">${intro}${section.blocks.map((block) => `<details><summary>${escapeHtml(blockValue(block, "title", "Question"))}</summary><p>${escapeHtml(blockValue(block, "text"))}</p></details>`).join("")}</div>`;
  if (layout === "form") return `<div class="wf-section wf-form">${intro}<form><label>Email<input type="email" name="email" autocomplete="email" required></label><button type="submit">${escapeHtml(value(section, "cta_label", "Envoyer"))}</button></form></div>`;
  if (layout === "quiz") return `<div class="wf-section wf-quiz">${intro}<form>${section.blocks.map((block, index) => `<fieldset${index ? " hidden" : ""}><legend>${escapeHtml(blockValue(block, "title", `Étape ${index + 1}`))}</legend><label><input type="radio" name="step-${index}" value="yes"> ${escapeHtml(blockValue(block, "text", "Oui"))}</label></fieldset>`).join("")}<button type="button">Continuer</button></form></div>`;
  if (layout === "cta") return `<div class="wf-section wf-cta">${intro}${button(section)}</div>`;
  if (layout === "richText") return `<article class="wf-section wf-rich-text">${intro}${renderBlocks(section.blocks)}</article>`;
  if (layout === "footer") return `<footer class="wf-section wf-footer"><div>${heading}${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div><nav aria-label="Pied de page">${renderBlocks(section.blocks, "div")}</nav></footer>`;
  if (layout === "spacer") return `<div class="wf-spacer" aria-hidden="true" style="height:${Number(section.settings.height) || 48}px"></div>`;
  if (layout === "divider") return `<hr class="wf-divider">`;
  return `<div class="wf-section wf-cards">${intro}<div class="wf-section__grid">${renderBlocks(section.blocks)}</div>${button(section)}</div>`;
}

export function createSectionDefinition(type: string, name: string, category: SectionCategory, layout: SectionLayout, extraDefaults: Record<string, SettingValue> = {}, extraSettings: InspectorControl[] = [], blocks: BlockDefinition[] = [itemBlock]): SectionDefinition {
  const defaults: Record<string, SettingValue> = { title: name, subtitle: "", text: "", cta_label: "Découvrir", cta_link: "#", ...extraDefaults };
  return {
    type, name, category, defaults,
    settings: [...common, ...cta, ...(layout === "hero" || layout === "productHero" || layout === "imageText" || layout === "videoHero" ? media : []), ...extraSettings],
    blocks,
    renderWeb: ({ section, pageName }) => web(layout, section, pageName),
    renderLiquid: () => `<section class="wf-section wf-${escapeHtml(type)}"><h2>{{ section.settings.title | escape }}</h2><div>{{ section.settings.text }}</div>{% for block in section.blocks %}<article {{ block.shopify_attributes }}><h3>{{ block.settings.title | escape }}</h3><p>{{ block.settings.text }}</p></article>{% endfor %}</section>`,
  };
}
