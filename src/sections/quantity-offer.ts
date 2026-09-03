import type { EditorBlock, EditorSection, SettingValue } from "../editor/document";
import type { InspectorControl } from "../editor/section-schema";
import {
  hasConfiguredOfferDiscount,
  isMixedProductOffer,
  normalizeOfferTierSettings,
  normalizeQuantityBreaks,
  offerDiscountLabel,
  offerTierBlocks,
} from "./quantity-offer-domain";
import { escapeHtml, textControl, value } from "./shared";
import type { BlockDefinition, SectionPackDefinition, SectionVariantDefinition } from "./types";

const MIXED_MESSAGE = "Une application Shopify est requise pour les offres multi-produits.";
const DISCOUNT_MESSAGE = "Une règle de remise Shopify vérifiée est requise pour appliquer ces économies.";
const EMPTY_MESSAGE = "Ajoutez au moins un palier disponible pour activer cette offre.";

const controls: InspectorControl[] = [
  textControl("title", "Titre"),
  textControl("subtitle", "Sous-titre"),
  textControl("text", "Texte", "textarea"),
  textControl("product_handle", "Produit Shopify"),
  textControl("quantity_label", "Libellé des quantités"),
  textControl("cta_label", "Libellé du bouton"),
  { key: "show_savings", label: "Afficher les économies", type: "toggle", scope: "settings" },
  textControl("delivery_note", "Note de livraison"),
];
const tierControls: InspectorControl[] = [
  textControl("title", "Titre"),
  textControl("subtitle", "Sous-titre"),
  textControl("badge", "Badge"),
  { key: "quantity", label: "Quantité", type: "number", scope: "settings" },
  { key: "discount_type", label: "Type de remise", type: "select", scope: "settings", options: ["percentage", "fixed", "none"], optionLabels: { percentage: "Pourcentage", fixed: "Montant fixe", none: "Aucune remise" } },
  { key: "discount_value", label: "Valeur de la remise", type: "number", scope: "settings" },
  textControl("product_handle", "Produit Shopify"),
  textControl("variant_id", "Variante Shopify"),
  { key: "preselected", label: "Sélectionnée par défaut", type: "toggle", scope: "settings" },
  { key: "show_variant_picker", label: "Afficher le choix de variante", type: "toggle", scope: "settings" },
];
const tier: BlockDefinition = {
  type: "offer-tier",
  name: "Palier d’offre",
  defaults: { title: "Duo", subtitle: "2 unités", badge: "Le plus choisi", quantity: 2, discount_type: "percentage", discount_value: 10, product_handle: "", variant_id: "", preselected: false, show_variant_picker: false },
  settings: tierControls,
};
const variants: SectionVariantDefinition[] = [
  { id: "horizontal-cards", name: "Cartes horizontales", description: "Trois cartes comparables sur une rangée.", composition: "Grille horizontale de cartes.", previewFixtureId: "", defaults: { variant: "horizontal-cards" } },
  { id: "stacked-premium", name: "Paliers premium", description: "Une pile verticale qui amplifie le palier choisi.", composition: "Pile verticale à hiérarchie renforcée.", previewFixtureId: "", defaults: { variant: "stacked-premium" } },
  { id: "tier-table", name: "Table de paliers", description: "Lecture compacte en lignes et colonnes.", composition: "Table compacte de comparaison.", previewFixtureId: "", defaults: { variant: "tier-table" } },
];
const defaults: Record<string, SettingValue> = {
  title: "Choisissez votre quantité",
  subtitle: "Plus vous choisissez, plus vous économisez.",
  text: "",
  product_handle: "",
  quantity_label: "Choisir la quantité",
  cta_label: "Ajouter au panier",
  show_savings: true,
  delivery_note: "Expédition calculée au paiement.",
  variant: "horizontal-cards",
};

function normalizedTiers(section: EditorSection): EditorBlock[] {
  return offerTierBlocks(section).map((block) => ({
    ...block,
    type: "offer-tier",
    settings: normalizeOfferTierSettings(block.settings, { product_handle: String(section.settings.product_handle ?? "") }),
  }));
}

function selectedTierId(items: EditorBlock[]): string {
  return items.find((item) => item.settings.preselected === true)?.id ?? items[0]?.id ?? "";
}

function webTier(block: EditorBlock, active: string, locked: boolean, showSavings: boolean, sectionId: string): string {
  const quantity = Number(block.settings.quantity);
  const subtitle = String(block.settings.subtitle ?? block.settings.text ?? "").trim();
  const badge = String(block.settings.badge ?? "").trim();
  const discount = showSavings ? offerDiscountLabel(block.settings) : "";
  const inputId = `wf-tier-${sectionId}-${block.id}`;
  const picker = block.settings.show_variant_picker === true
    ? '<span class="wf-quantity-offer__variant">Choix de variante affiché dans Shopify</span>'
    : "";
  return `<div class="wf-quantity-offer__tier${block.id === active ? " is-selected" : ""}" data-wf-block-id="${escapeHtml(block.id)}"><input id="${escapeHtml(inputId)}" type="radio" name="quantity" value="${quantity}"${block.id === active ? " checked" : ""}${locked ? " disabled" : ""} data-wf-quantity="${quantity}"><label class="wf-quantity-offer__tier-choice" for="${escapeHtml(inputId)}"><span class="wf-quantity-offer__tier-copy"><span class="wf-quantity-offer__tier-title">${escapeHtml(block.settings.title || `${quantity} unités`)}</span>${subtitle ? `<small class="wf-quantity-offer__tier-subtitle">${escapeHtml(subtitle)}</small>` : ""}</span>${badge ? `<strong class="wf-quantity-offer__badge"><span>${escapeHtml(badge)}</span></strong>` : ""}${discount ? `<span class="wf-quantity-offer__discount">${escapeHtml(discount)}</span>` : ""}</label>${picker}</div>`;
}

function renderWeb(section: EditorSection, pageName: string): string {
  const items = normalizedTiers(section);
  const empty = items.length === 0;
  const mixed = isMixedProductOffer(section);
  const discounted = hasConfiguredOfferDiscount(section);
  const locked = empty || mixed || discounted;
  const requested = String(section.settings.variant ?? section.variantId ?? "horizontal-cards");
  const layout = variants.some((item) => item.id === requested) ? requested : "horizontal-cards";
  const status = empty
    ? `<aside class="wf-quantity-offer__unavailable" role="status" data-wf-native-checkout-lock>${EMPTY_MESSAGE}</aside>`
    : mixed
      ? `<aside class="wf-quantity-offer__app-required" role="status" data-wf-native-checkout-lock>${MIXED_MESSAGE}</aside>`
      : discounted
        ? `<aside class="wf-quantity-offer__app-required" role="status" data-wf-native-checkout-lock>${DISCOUNT_MESSAGE}</aside>`
        : "";
  const showSavings = section.settings.show_savings !== false;
  const delivery = String(section.settings.delivery_note ?? "").trim();
  return `<section class="wf-section wf-quantity-offer wf-quantity-offer--${escapeHtml(layout)}" data-wf-product data-wf-purchase-strategy="multipack"><header>${value(section, "subtitle") ? `<p class="wf-section__eyebrow">${escapeHtml(value(section, "subtitle"))}</p>` : ""}<h2>${escapeHtml(value(section, "title", pageName))}</h2>${value(section, "text") ? `<p class="wf-section__copy">${escapeHtml(value(section, "text"))}</p>` : ""}</header>${status}<form class="wf-product__form wf-quantity-offer__form" action="/cart/add" method="post"><fieldset class="wf-quantity-offer__tiers"><legend>${escapeHtml(value(section, "quantity_label", "Choisir la quantité"))}</legend><div class="wf-quantity-offer__tiers-layout">${items.map((item) => webTier(item, selectedTierId(items), locked, showSavings, section.id)).join("")}</div></fieldset><button type="submit" data-wf-add-to-cart${locked ? " disabled" : ""}>${escapeHtml(value(section, "cta_label", "Ajouter au panier"))}</button>${delivery ? `<p class="wf-quantity-offer__delivery-note">${escapeHtml(delivery)}</p>` : ""}</form></section>`;
}

function renderLiquid(_section?: EditorSection): string {
  return String.raw`{{ 'weflo-quantity-offer.css' | asset_url | stylesheet_tag }}
{% assign wf_section_handle = section.settings.product_handle | strip | downcase %}
{% assign wf_reference_handle = '' %}
{% assign wf_mixed_product_offer = false %}
{% assign wf_selected_tier_id = '' %}
{% assign wf_tier_count = 0 %}
{% for block in section.blocks %}
  {% if block.type == 'offer-tier' or block.type == 'offer' %}
    {% assign wf_tier_count = wf_tier_count | plus: 1 %}
    {% assign wf_tier_handle = block.settings.product_handle | default: wf_section_handle | strip | downcase %}
    {% if wf_reference_handle == blank %}{% assign wf_reference_handle = wf_tier_handle %}{% elsif wf_tier_handle != blank and wf_tier_handle != wf_reference_handle %}{% assign wf_mixed_product_offer = true %}{% endif %}
    {% if block.settings.preselected and wf_selected_tier_id == blank %}{% assign wf_selected_tier_id = block.id %}{% endif %}
  {% endif %}
{% endfor %}
{% if wf_selected_tier_id == blank %}{% for block in section.blocks %}{% if block.type == 'offer-tier' or block.type == 'offer' %}{% assign wf_selected_tier_id = block.id %}{% break %}{% endif %}{% endfor %}{% endif %}
<section class="wf-section wf-quantity-offer wf-quantity-offer--{{ section.settings.variant | default: 'horizontal-cards' | escape }}" data-wf-product data-wf-purchase-strategy="multipack" data-wf-section-id="{{ section.id | escape }}">
  <header>{% if section.settings.subtitle != blank %}<p class="wf-section__eyebrow">{{ section.settings.subtitle | escape }}</p>{% endif %}<h2>{{ section.settings.title | escape }}</h2>{% if section.settings.text != blank %}<p class="wf-section__copy">{{ section.settings.text | escape }}</p>{% endif %}</header>
  {% if wf_reference_handle == blank %}{% assign selected_product = product %}{% else %}{% assign selected_product = all_products[wf_reference_handle] %}{% endif %}
  {% if wf_mixed_product_offer %}<aside class="wf-quantity-offer__app-required" role="status" data-wf-native-checkout-lock>${MIXED_MESSAGE}</aside>{% endif %}
  {% if wf_tier_count == 0 %}<aside class="wf-quantity-offer__unavailable" role="status" data-wf-native-checkout-lock>${EMPTY_MESSAGE}</aside>{% endif %}
  {% if selected_product == blank and wf_tier_count > 0 %}<aside class="wf-quantity-offer__unavailable" role="status" data-wf-native-checkout-lock>Produit Shopify indisponible.</aside>{% endif %}
  {% if selected_product != blank %}
    {% form 'product', selected_product, class: 'wf-product__form wf-quantity-offer__form' %}
      <input type="hidden" name="id" value="{{ selected_product.selected_or_first_available_variant.id | escape }}" data-wf-variant-input>
      <fieldset class="wf-quantity-offer__tiers"><legend>{{ section.settings.quantity_label | default: 'Choisir la quantité' | escape }}</legend><div class="wf-quantity-offer__tiers-layout">
      {% assign wf_has_available_tier = false %}{% assign wf_selected_tier_available = false %}
      {% for block in section.blocks %}
        {% if block.type == 'offer-tier' or block.type == 'offer' %}
          {% assign wf_quantity = block.settings.quantity | default: 1 | round | at_least: 1 | at_most: 99 %}
          {% assign wf_tier_handle = block.settings.product_handle | default: wf_reference_handle | strip | downcase %}
          {% if wf_tier_handle == blank %}{% assign tier_product = selected_product %}{% else %}{% assign tier_product = all_products[wf_tier_handle] %}{% endif %}
          {% assign tier_variant = nil %}
          {% assign wf_requested_variant_id = block.settings.variant_id | strip %}
          {% if tier_product != blank %}
            {% if wf_requested_variant_id == blank %}{% assign tier_variant = tier_product.selected_or_first_available_variant %}{% else %}
              {% for product_variant in tier_product.variants %}{% assign wf_product_variant_id = product_variant.id | append: '' %}{% if wf_product_variant_id == wf_requested_variant_id %}{% assign tier_variant = product_variant %}{% break %}{% endif %}{% endfor %}
            {% endif %}
          {% endif %}
          {% assign wf_tier_unavailable = false %}{% if tier_variant == blank %}{% assign wf_tier_unavailable = true %}{% elsif tier_variant.available == false %}{% assign wf_tier_unavailable = true %}{% endif %}
          {% if wf_tier_unavailable == false %}{% assign wf_has_available_tier = true %}{% if block.id == wf_selected_tier_id %}{% assign wf_selected_tier_available = true %}{% endif %}{% endif %}
          {% assign wf_discount_type = block.settings.discount_type %}{% if wf_discount_type == 'amount' %}{% assign wf_discount_type = 'fixed' %}{% endif %}{% unless wf_discount_type == 'percentage' or wf_discount_type == 'fixed' %}{% assign wf_discount_type = 'none' %}{% endunless %}
          {% assign wf_discount_value = block.settings.discount_value | default: 0 | plus: 0 | at_least: 0 %}
          {% assign wf_tier_subtitle = block.settings.subtitle | default: block.settings.text %}
          <div class="wf-quantity-offer__tier{% if block.id == wf_selected_tier_id %} is-selected{% endif %}{% if wf_tier_unavailable %} is-unavailable{% endif %}" data-wf-block-id="{{ block.id | escape }}" {{ block.shopify_attributes }}>
            <input id="wf-tier-{{ section.id | escape }}-{{ block.id | escape }}" type="radio" name="quantity" value="{{ wf_quantity }}" data-wf-quantity="{{ wf_quantity }}" data-wf-tier-id="{{ block.id | escape }}"{% if tier_variant != blank %} data-wf-variant-id="{{ tier_variant.id | escape }}" data-wf-available="{% if tier_variant.available %}true{% else %}false{% endif %}"{% endif %}{% if block.id == wf_selected_tier_id %} checked{% endif %}{% if wf_mixed_product_offer or wf_tier_unavailable %} disabled{% endif %}>
            <label class="wf-quantity-offer__tier-choice" for="wf-tier-{{ section.id | escape }}-{{ block.id | escape }}"><span class="wf-quantity-offer__tier-copy"><span class="wf-quantity-offer__tier-title">{{ block.settings.title | default: wf_quantity | escape }}</span>{% if wf_tier_subtitle != blank %}<small class="wf-quantity-offer__tier-subtitle">{{ wf_tier_subtitle | escape }}</small>{% endif %}</span>
              {% if block.settings.badge != blank %}<strong class="wf-quantity-offer__badge"><span>{{ block.settings.badge | escape }}</span></strong>{% endif %}
              {% if section.settings.show_savings and wf_discount_value > 0 %}{% if wf_discount_type == 'percentage' %}<span class="wf-quantity-offer__discount">−{{ wf_discount_value | escape }} %</span>{% elsif wf_discount_type == 'fixed' %}<span class="wf-quantity-offer__discount">−{{ wf_discount_value | times: 100 | money }}</span>{% endif %}{% endif %}</label>
            {% if block.settings.show_variant_picker and tier_product != blank %}<label class="wf-quantity-offer__variant"><span>Variante</span><select data-wf-tier-variant-select data-wf-tier-id="{{ block.id | escape }}">{% for product_variant in tier_product.variants %}<option value="{{ product_variant.id | escape }}" data-wf-available="{% if product_variant.available %}true{% else %}false{% endif %}"{% if product_variant.id == tier_variant.id %} selected{% endif %}{% unless product_variant.available %} disabled{% endunless %}>{{ product_variant.title | escape }}</option>{% endfor %}</select></label>{% endif %}
          </div>
        {% endif %}
      {% endfor %}
      </div></fieldset>
      <button type="submit" data-wf-add-to-cart{% if wf_mixed_product_offer or wf_tier_count == 0 or wf_has_available_tier == false or wf_selected_tier_available == false or selected_product.selected_or_first_available_variant.available == false %} disabled{% endif %}>{{ section.settings.cta_label | default: 'Ajouter au panier' | escape }}</button>
      {% if section.settings.delivery_note != blank %}<p class="wf-quantity-offer__delivery-note">{{ section.settings.delivery_note | escape }}</p>{% endif %}
    {% endform %}
    <script src="{{ 'weflo-product-form.js' | asset_url }}" defer="defer"></script>
  {% endif %}
</section>`;
}

const LEGACY_VARIANTS: Record<string, string> = {
  "single-duo-trio": "horizontal-cards",
  "volume-ladder": "stacked-premium",
};

function canonicalVariant(section: EditorSection): string {
  const settingVariant = typeof section.settings.variant === "string" ? section.settings.variant : "";
  const source = settingVariant || section.variantId || "horizontal-cards";
  const mapped = LEGACY_VARIANTS[source] ?? source;
  return variants.some((variant) => variant.id === mapped) ? mapped : "horizontal-cards";
}

function materializedTierId(section: EditorSection, ordinal: number, used: Set<string>): string {
  const base = `${section.id}-tier-${ordinal + 1}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export function normalizeQuantityOfferSection(section: EditorSection): EditorSection {
  const rawQuantityBreaks = section.settings.quantity_breaks;
  const hasLegacyQuantityBreaks = typeof rawQuantityBreaks === "string"
    ? rawQuantityBreaks.trim().length > 0
    : Array.isArray(rawQuantityBreaks) && rawQuantityBreaks.length > 0;
  const quantities = hasLegacyQuantityBreaks ? normalizeQuantityBreaks(rawQuantityBreaks) : [];
  const variant = canonicalVariant(section);
  const sectionHandle = String(section.settings.product_handle ?? "");
  const sectionText = String(section.settings.text ?? "");
  const sectionPrice = section.settings.price;
  const used = new Set(section.blocks.map((block) => block.id));
  const existingTiers = offerTierBlocks(section);
  let tierOrdinal = 0;
  let blocks = section.blocks.map((block) => {
    if (block.type !== "offer" && block.type !== "offer-tier") return { ...block, settings: { ...block.settings } };
    const ordinal = tierOrdinal++;
    const inherited: Record<string, SettingValue> = { quantity: quantities[ordinal] ?? 1, product_handle: sectionHandle };
    if (sectionPrice !== undefined) inherited.price = sectionPrice;
    return { ...block, type: "offer-tier", settings: normalizeOfferTierSettings(block.settings, inherited) };
  });
  if (!existingTiers.length && hasLegacyQuantityBreaks) {
    blocks = quantities.map((quantity, ordinal) => {
      const title = quantity === 1 ? "Solo" : `${quantity} unités`;
      const inherited: Record<string, SettingValue> = { title, subtitle: sectionText, text: sectionText, quantity, product_handle: sectionHandle, preselected: ordinal === 0 };
      if (sectionPrice !== undefined) inherited.price = sectionPrice;
      return { id: materializedTierId(section, ordinal, used), type: "offer-tier", settings: normalizeOfferTierSettings({}, inherited) };
    });
  }
  const normalizedTiers = blocks.filter((block) => block.type === "offer-tier");
  const selected = normalizedTiers.find((block) => block.settings.preselected === true)?.id ?? normalizedTiers[0]?.id;
  blocks = blocks.map((block) => block.type === "offer-tier" ? { ...block, settings: { ...block.settings, preselected: block.id === selected } } : block);
  return {
    ...section,
    settings: {
      ...section.settings,
      variant,
      show_savings: section.settings.show_savings !== false,
      delivery_note: String(section.settings.delivery_note ?? ""),
    },
    blocks,
    packVersion: 1,
    variantId: variant,
  };
}

export const quantityOfferSection: SectionPackDefinition = {
  type: "quantity-offer",
  name: "Offre quantité",
  category: "commerce",
  defaults,
  settings: controls,
  blocks: [tier],
  families: ["quantity-offer"],
  tags: ["quantité", "volume", "économie"],
  supportedPages: ["landing", "product", "collection", "home"],
  supportedMarkets: ["all"],
  capabilities: ["product-form", "quantity-breaks"],
  variants,
  assets: ["weflo-quantity-offer.css"],
  packVersion: 1,
  renderWeb: ({ section, pageName }) => renderWeb(section, pageName),
  renderLiquid,
  renderSchema: () => ({ name: "Offre quantité", settings: controls.map((control) => ({ id: control.key, label: control.label, type: control.type })), blocks: [{ type: tier.type, name: tier.name, settings: tierControls.map((control) => ({ id: control.key, label: control.label, type: control.type })) }], presets: variants.map((variant) => ({ name: variant.name, settings: variant.defaults })) }),
  migrate: normalizeQuantityOfferSection,
};
