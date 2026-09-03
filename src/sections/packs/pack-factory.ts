import type { EditorBlock, EditorSection, SettingValue } from "../../editor/document";
import type { InspectorControl } from "../../editor/section-schema";
import { blockValue, escapeHtml, image, safeLink, safeMediaUrl, textControl, value } from "../shared";
import type { BlockDefinition, SectionCapability, SectionCategory, SectionFamily, SectionPackDefinition, SectionVariantDefinition } from "../types";
import { renderProductFormLiquid } from "../../shopify/liquid/product-form";
import { renderPurchaseOptionsLiquid } from "../../shopify/liquid/purchase-options";

const baseControls: InspectorControl[] = [
  textControl("title", "Titre"), textControl("subtitle", "Sous-titre"), textControl("text", "Texte", "textarea"),
  textControl("image", "Image", "image"), textControl("image_alt", "Texte alternatif"),
  textControl("cta_label", "Libellé du bouton"), textControl("cta_link", "Lien", "link"),
];
export const standardBlocks: BlockDefinition[] = [
  { type: "media", name: "Média", defaults: { title: "Média", image: "", image_alt: "" }, settings: [textControl("title", "Titre"), textControl("image", "Image", "image"), textControl("image_alt", "Texte alternatif")] },
  { type: "benefit", name: "Bénéfice", defaults: { title: "Bénéfice", text: "" }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea")] },
  { type: "offer", name: "Offre", defaults: { title: "Offre", text: "", price: "" }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea"), textControl("price", "Prix")] },
  { type: "review", name: "Avis", defaults: { title: "Avis", text: "", author: "" }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea"), textControl("author", "Auteur")] },
  { type: "row", name: "Ligne", defaults: { title: "Ligne", text: "" }, settings: [textControl("title", "Titre"), textControl("text", "Texte", "textarea")] },
  { type: "faq", name: "Question", defaults: { title: "Question", text: "" }, settings: [textControl("title", "Question"), textControl("text", "Réponse", "textarea")] },
];

type PackInput = {
  type: string; name: string; category: SectionCategory; family: SectionFamily; tags: string[];
  capabilities?: SectionCapability[]; variants: Array<[string, string, string]>;
  layout?: "cards" | "product" | "editorial" | "quiz";
  supportedPages?: SectionPackDefinition["supportedPages"];
  extraDefaults?: Record<string, SettingValue>;
  extraSettings?: InspectorControl[];
};

function cards(blocks: EditorBlock[]): string {
  return blocks.map((block) => { const media = safeMediaUrl(block.settings.image); return `<article class="wf-section__card" data-wf-block-id="${escapeHtml(block.id)}">${media ? `<img src="${media}" alt="${escapeHtml(blockValue(block, "image_alt", blockValue(block, "title")))}" loading="lazy">` : ""}<h3>${escapeHtml(blockValue(block, "title", "Élément"))}</h3>${blockValue(block, "text") ? `<p>${escapeHtml(blockValue(block, "text"))}</p>` : ""}${blockValue(block, "author") ? `<cite>${escapeHtml(blockValue(block, "author"))}</cite>` : ""}${blockValue(block, "price") ? `<strong>${escapeHtml(blockValue(block, "price"))}</strong>` : ""}</article>`; }).join("");
}

function liquidFor(pack: Pick<PackInput, "type" | "capabilities" | "layout">): string {
  const capabilities = pack.capabilities ?? [];
  const product = capabilities.includes("product-form") || capabilities.includes("variant-selection");
  const body = `{% for block in section.blocks %}<article class="wf-section__card" {{ block.shopify_attributes }}><h3>{{ block.settings.title | escape }}</h3><div>{{ block.settings.text }}</div>{% if block.settings.price != blank %}<strong>{{ block.settings.price | escape }}</strong>{% endif %}</article>{% endfor %}`;
  if (!product) return `<section class="wf-section wf-${pack.type}" data-wf-variant="{{ section.settings.variant | escape }}"><header><p>{{ section.settings.subtitle | escape }}</p><h2>{{ section.settings.title | escape }}</h2><div>{{ section.settings.text }}</div></header><div class="wf-section__grid">${body}</div>{% if section.settings.cta_label != blank %}<a class="wf-section__button" href="{{ section.settings.cta_link }}">{{ section.settings.cta_label | escape }}</a>{% endif %}</section>`;
  const sectionClass = `wf-section wf-${pack.type}`;
  if (pack.type === "fixed-bundle") return renderPurchaseOptionsLiquid({ sectionClass, strategy: "fixed-bundle" });
  if (pack.type === "quantity-offer") return renderPurchaseOptionsLiquid({ sectionClass, strategy: "multipack" });
  if (pack.type === "subscription-selector") return renderPurchaseOptionsLiquid({ sectionClass, strategy: "selling-plan" });
  if (pack.type === "preorder-selector") return renderPurchaseOptionsLiquid({ sectionClass, strategy: "preorder" });
  return renderProductFormLiquid({ sectionClass });
}

export function premiumPack(input: PackInput): SectionPackDefinition {
  const capabilities = input.capabilities ?? [];
  const variants: SectionVariantDefinition[] = input.variants.map(([id, name, composition]) => ({ id, name, description: composition, composition, previewFixtureId: "", defaults: { variant: id } }));
  const productControls = capabilities.some((capability) => capability === "product-form" || capability === "variant-selection") ? [textControl("product_handle", "Produit Shopify", "text")] : [];
  const defaults = { title: input.name, subtitle: "", text: "", image: "", image_alt: "", cta_label: capabilities.includes("product-form") ? "Ajouter au panier" : "Découvrir", cta_link: "#", variant: variants[0].id, ...input.extraDefaults };
  return {
    type: input.type, name: input.name, category: input.category, defaults,
    settings: [...baseControls, ...productControls, ...(input.extraSettings ?? [])], blocks: standardBlocks,
    families: [input.family], tags: input.tags, supportedPages: input.supportedPages ?? ["landing", "product", "collection", "home"], supportedMarkets: ["all"], capabilities, variants, assets: [], packVersion: 1,
    renderWeb: ({ section, pageName, editor }) => {
      const variant = variants.some((item) => item.id === value(section, "variant", variants[0].id)) ? value(section, "variant", variants[0].id) : variants[0].id;
      const heading = value(section, "title", pageName);
      const intro = `<header>${value(section, "subtitle") ? `<p class="wf-section__eyebrow">${escapeHtml(value(section, "subtitle"))}</p>` : ""}<h2 data-wf-edit-key="title">${escapeHtml(heading)}</h2>${value(section, "text") ? `<p class="wf-section__copy" data-wf-edit-key="text">${escapeHtml(value(section, "text"))}</p>` : ""}</header>`;
      const action = value(section, "cta_label") ? `<a class="wf-section__button" href="${safeLink(section.settings.cta_link)}">${escapeHtml(value(section, "cta_label"))}</a>` : "";
      const setup = editor && capabilities.some((capability) => ["fixed-bundle", "custom-bundle", "selling-plan", "preorder", "app-blocks"].includes(capability)) ? `<aside class="wf-section__setup" role="status">Configuration Shopify requise avant publication.</aside>` : "";
      if (input.layout === "product") return `<section class="wf-section wf-${input.type} wf-${input.type}--${escapeHtml(variant)}" data-wf-variant="${escapeHtml(variant)}">${intro}<div class="wf-section__media">${image(section, "image", value(section, "image_alt", heading))}</div><div class="wf-section__grid">${cards(section.blocks)}</div><form class="wf-product__form" action="/cart/add" method="post"><label>Option<select name="id"><option value="">Choisir dans Shopify</option></select></label><label>Quantité<input name="quantity" type="number" min="1" value="1"></label><button type="submit">${escapeHtml(value(section, "cta_label", "Ajouter au panier"))}</button></form>${setup}</section>`;
      if (input.layout === "quiz") return `<section class="wf-section wf-${input.type} wf-${input.type}--${escapeHtml(variant)}" data-wf-variant="${escapeHtml(variant)}">${intro}<form class="wf-quiz__form">${section.blocks.map((block, index) => `<fieldset${index ? " hidden" : ""}><legend>${escapeHtml(blockValue(block, "title", `Question ${index + 1}`))}</legend><label><input type="radio" name="${escapeHtml(block.id)}" value="option-a">${escapeHtml(blockValue(block, "text", "Option"))}</label></fieldset>`).join("")}<button type="button">Continuer</button></form>${setup}</section>`;
      const media = input.layout === "editorial" ? `<figure>${image(section, "image", value(section, "image_alt", heading))}</figure>` : "";
      return `<section class="wf-section wf-${input.type} wf-${input.type}--${escapeHtml(variant)}" data-wf-variant="${escapeHtml(variant)}">${media}${intro}<div class="wf-section__grid">${cards(section.blocks)}</div>${action}${setup}</section>`;
    },
    renderLiquid: () => liquidFor(input),
    renderSchema: () => ({ name: input.name, settings: [...baseControls, ...productControls, ...(input.extraSettings ?? [])].map((control) => ({ id: control.key, label: control.label, type: control.type === "textarea" ? "textarea" : "text" })), blocks: standardBlocks.map((block) => ({ type: block.type, name: block.name, settings: block.settings.map((control) => ({ id: control.key, label: control.label, type: control.type === "textarea" ? "textarea" : "text" })) })), presets: variants.map((variant) => ({ name: variant.name, settings: { ...variant.defaults } })) }),
    migrate: (section: EditorSection) => ({ ...section, packVersion: 1, variantId: section.variantId ?? value(section, "variant", variants[0].id) }),
  };
}
