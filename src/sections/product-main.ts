import type { EditorSection } from "../editor/document";
import { createSectionDefinition } from "./factory";
import { blockValue, edit, escapeHtml, image, textControl, value } from "./shared";

const base = createSectionDefinition("productMain", "Fiche produit", "commerce", "product", { cta_label: "Ajouter au panier", product_handle: "", variant: "calm-buy-box" }, [textControl("product_handle", "Produit Shopify", "text")]);

export const productMainSection = {
  ...base,
  previewVariants: ["conversion-split", "bundle-led"],
  renderWeb: ({ section, pageName }: Parameters<typeof base.renderWeb>[0]) => {
    const title = value(section, "title", pageName);
    const body = value(section, "text");
    const price = value(section, "price");
    const compare = value(section, "compare_at_price");
    const cta = value(section, "cta_label", "Ajouter au panier");
    const requested = value(section, "variant", "calm-buy-box");
    const variant = new Set(["calm-buy-box","beauty-buy-box","technical-buy-box","luxury-buy-box","tasting-buy-box","conversion-split","bundle-led"]).has(requested) ? requested : "calm-buy-box";
    const variants = section.blocks.filter((block) => block.type === "variant");
    const options = variants.length ? variants.map((block) => `<option value="${escapeHtml(blockValue(block, "variant_id", block.id))}">${escapeHtml(blockValue(block, "title", "Option"))}</option>`).join("") : '<option value="">Choisir dans Shopify</option>';
    return `<section class="wf-section wf-product wf-product--${escapeHtml(variant)}" id="product" data-wf-variant="${escapeHtml(variant)}"><div class="wf-product__gallery">${image(section, "image", title, "wf-product__image")}<div class="wf-product__thumbs"><button type="button" aria-label="Voir l’image principale"></button><button type="button" aria-label="Voir une autre image"></button></div></div><div class="wf-product__buy-box"><div class="wf-product__rating">★★★★★ <span>Les avis importés apparaissent ici</span></div>${edit("h1", "title", title)}${edit("p", "text", body)}<div class="wf-product__prices">${edit("strong", "price", price, "wf-section__price")}${compare ? `<s data-wf-edit-key="compare_at_price">${escapeHtml(compare)}</s>` : ""}</div><form action="/cart/add" method="post"><label>Option<select name="id">${options}</select></label><label>Quantité<input name="quantity" type="number" value="1" min="1"></label><fieldset class="wf-product__bundle"><legend>Bundle & économies</legend><label><input type="radio" name="properties[Offre]" value="Solo" checked> Solo</label><label><input type="radio" name="properties[Offre]" value="Duo"> Duo — meilleur choix</label></fieldset><button type="submit">${escapeHtml(cta)}</button></form><p class="wf-product__trust">Paiement sécurisé · Commande suivie · Assistance disponible</p></div><div class="wf-product__sticky"><span>${escapeHtml(title)}</span><strong>${escapeHtml(price)}</strong><button type="button">${escapeHtml(cta)}</button></div></section>`;
  },
  renderLiquid: (section?: EditorSection) => {
    const variant = section ? value(section, "variant", "calm-buy-box") : "calm-buy-box";
    return `<section class="weflo-product-main wf-product--${escapeHtml(variant)}">{% assign selected_product = all_products[section.settings.product_handle] | default: product %}<div class="wf-product__gallery">{{ selected_product.featured_image | image_url: width: 1600 | image_tag }}{% for image in selected_product.images limit: 4 %}{{ image | image_url: width: 500 | image_tag }}{% endfor %}</div><div class="wf-product__buy-box"><h1>{{ selected_product.title | default: section.settings.title | escape }}</h1><div>{{ selected_product.description | default: section.settings.text }}</div><div class="wf-product__prices"><strong>{{ selected_product.price | money }}</strong>{% if selected_product.compare_at_price > selected_product.price %}<s>{{ selected_product.compare_at_price | money }}</s>{% endif %}</div>{% form 'product', selected_product %}<label>Option<select name="id">{% for variant in selected_product.variants %}<option value="{{ variant.id }}">{{ variant.title }} — {{ variant.price | money }}</option>{% endfor %}</select></label><label>Quantité<input name="quantity" type="number" min="1" value="1"></label><fieldset class="wf-product__bundle"><legend>Bundle & économies</legend><label><input type="radio" name="properties[Offre]" value="Solo" checked>Solo</label><label><input type="radio" name="properties[Offre]" value="Duo">Duo</label></fieldset><button type="submit">{{ section.settings.cta_label | escape }}</button>{% endform %}<p class="wf-product__trust">Paiement sécurisé · Commande suivie · Assistance disponible</p></div><div class="wf-product__sticky"><span>{{ selected_product.title }}</span><strong>{{ selected_product.price | money }}</strong><button type="submit" form="product-form-{{ section.id }}">{{ section.settings.cta_label | escape }}</button></div></section>`;
  },
};
