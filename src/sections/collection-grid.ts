import { createSectionDefinition } from "./factory";
import { textControl } from "./shared";
export const collectionGridSection = {
  ...createSectionDefinition("collectionGrid", "Grille de collections", "commerce", "product", { collection_handle: "" }, [textControl("collection_handle", "Collection Shopify", "text")]),
  renderLiquid: () => `<section class="weflo-collection-grid"><h2>{{ section.settings.title | escape }}</h2>{% assign selected_collection = collections[section.settings.collection_handle] %}<div>{% for product in selected_collection.products %}<a href="{{ product.url }}"><h3>{{ product.title | escape }}</h3>{{ product.price | money }}</a>{% endfor %}</div></section>`,
};
