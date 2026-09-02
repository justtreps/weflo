import { createSectionDefinition } from "./factory";
export const productGridSection = {
  ...createSectionDefinition("productGrid", "Grille de produits", "commerce", "product"),
  renderLiquid: () => `<section class="weflo-product-grid"><h2>{{ section.settings.title | escape }}</h2><div>{% for product in section.settings.collection.products %}<a href="{{ product.url }}">{{ product.featured_image | image_url: width: 700 | image_tag }}<h3>{{ product.title | escape }}</h3><span>{{ product.price | money }}</span></a>{% endfor %}</div></section>`,
};
