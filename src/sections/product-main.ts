import { createSectionDefinition } from "./factory";
import { textControl } from "./shared";
export const productMainSection = {
  ...createSectionDefinition("productMain", "Fiche produit", "commerce", "product", { cta_label: "Ajouter au panier", product_handle: "" }, [textControl("product_handle", "Produit Shopify", "text")]),
  renderLiquid: () => `<section class="weflo-product-main">{% assign selected_product = all_products[section.settings.product_handle] | default: product %}<h1>{{ selected_product.title | default: section.settings.title | escape }}</h1>{{ selected_product.featured_image | image_url: width: 1400 | image_tag }}<div>{{ selected_product.description }}</div>{% form 'product', selected_product %}<select name="id">{% for variant in selected_product.variants %}<option value="{{ variant.id }}">{{ variant.title }} — {{ variant.price | money }}</option>{% endfor %}</select><input name="quantity" type="number" min="1" value="1"><button type="submit">{{ section.settings.cta_label | escape }}</button>{% endform %}</section>`,
};
