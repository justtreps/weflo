import type { EditorSection } from "../../editor/document";

export type ProductFormLiquidOptions = {
  section?: EditorSection;
  sectionClass?: string;
  strategy?: "one-time" | "fixed-bundle" | "multipack" | "selling-plan" | "preorder";
  includeQuantityOffers?: boolean;
};

/**
 * Liquid only contains Shopify source-of-truth values. Prices and variants are
 * deliberately never copied from editor preview fixtures.
 */
export function renderProductFormLiquid(options: ProductFormLiquidOptions = {}): string {
  const sectionClass = options.sectionClass ?? "wf-product";
  const strategy = options.strategy ?? "one-time";
  const offers = options.includeQuantityOffers
    ? `<fieldset class="wf-product__quantity-offers"><legend>{{ section.settings.quantity_label | default: 'Choisir la quantité' | escape }}</legend>{% assign wf_breaks = section.settings.quantity_breaks | default: '1,2,3' | split: ',' %}{% for break in wf_breaks %}{% assign wf_quantity = break | plus: 0 %}<button type="button" data-wf-quantity="{{ wf_quantity }}">{{ wf_quantity }}{% if section.settings.quantity_suffix != blank %} {{ section.settings.quantity_suffix | escape }}{% endif %}</button>{% endfor %}</fieldset>`
    : "";
  const sellingPlans = strategy === "selling-plan"
    ? `<div class="wf-product__selling-plans">{% if selected_product.selling_plan_groups.size > 0 %}<label for="weflo-selling-plan-{{ section.id }}">{{ section.settings.selling_plan_label | default: 'Fréquence' | escape }}</label><select id="weflo-selling-plan-{{ section.id }}" name="selling_plan">{% for group in selected_product.selling_plan_groups %}{% for plan in group.selling_plans %}<option value="{{ plan.id }}">{{ plan.name | escape }}</option>{% endfor %}{% endfor %}</select>{% else %}<p class="wf-product__setup" role="status">Configure un abonnement Shopify compatible avant de publier cette offre.</p>{% endif %}</div>`
    : "";
  const preorder = strategy === "preorder"
    ? `{% if section.settings.preorder_provider != blank %}<input type="hidden" name="properties[_weflo_preorder_provider]" value="{{ section.settings.preorder_provider | escape }}"><p class="wf-product__preorder-note">{{ section.settings.preorder_note | default: 'Précommande — expédition selon les conditions indiquées.' | escape }}</p>{% else %}<p class="wf-product__setup" role="status">Configure un fournisseur de précommandes compatible avant de publier.</p>{% endif %}`
    : "";
  const bundle = strategy === "fixed-bundle"
    ? `<p class="wf-product__bundle-note">{{ section.settings.bundle_note | default: 'Ce produit correspond à un bundle fixe Shopify.' | escape }}</p>`
    : strategy === "multipack"
      ? `<input type="hidden" name="properties[_weflo_multipack]" value="true">`
      : "";
  return `<section class="${sectionClass}" data-wf-product data-wf-purchase-strategy="${strategy}" data-wf-section-id="{{ section.id }}">{% assign selected_product = all_products[section.settings.product_handle] | default: product %}{% assign form_id = 'weflo-product-form-' | append: section.id %}{% if selected_product != blank %}{% form 'product', selected_product, id: form_id, class: 'wf-product__form' %}<input type="hidden" name="id" value="{{ selected_product.selected_or_first_available_variant.id }}" data-wf-variant-input>{% for option in selected_product.options_with_values %}<label class="wf-product__option" for="weflo-option-{{ section.id }}-{{ forloop.index0 }}"><span>{{ option.name | escape }}</span><select id="weflo-option-{{ section.id }}-{{ forloop.index0 }}" data-wf-option-index="{{ forloop.index0 }}">{% for value in option.values %}<option value="{{ value | escape }}"{% if option.selected_value == value %} selected{% endif %}>{{ value | escape }}</option>{% endfor %}</select></label>{% endfor %}<div class="wf-product__prices" aria-live="polite"><strong data-wf-price>{{ selected_product.selected_or_first_available_variant.price | money }}</strong><s data-wf-compare-price{% unless selected_product.selected_or_first_available_variant.compare_at_price > selected_product.selected_or_first_available_variant.price %} hidden{% endunless %}>{{ selected_product.selected_or_first_available_variant.compare_at_price | money }}</s></div><p data-wf-availability>{% if selected_product.selected_or_first_available_variant.available %}En stock{% else %}Indisponible{% endif %}</p>${bundle}${offers}<label class="wf-product__quantity" for="weflo-quantity-{{ section.id }}">Quantité<input id="weflo-quantity-{{ section.id }}" name="quantity" type="number" min="1" value="1" inputmode="numeric" data-wf-quantity-input></label>${sellingPlans}${preorder}<button type="submit" data-wf-add-to-cart{% unless selected_product.selected_or_first_available_variant.available %} disabled{% endunless %}>{{ section.settings.cta_label | default: 'Ajouter au panier' | escape }}</button>{% endform %}<script type="application/json" data-wf-variants>{{ selected_product.variants | json }}</script><script src="{{ 'weflo-product-form.js' | asset_url }}" defer="defer"></script>{% else %}<p class="wf-product__setup" role="status">Associe un produit Shopify à cette section avant publication.</p>{% endif %}</section>`;
}
