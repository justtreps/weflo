import { createSectionDefinition } from "./factory";
export const bundleSection = {
  ...createSectionDefinition("bundle", "Offre bundle", "commerce", "bundle", { title: "Crée ton bundle", price: "" }),
  renderLiquid: () => `<section class="weflo-bundle"><h2>{{ section.settings.title | escape }}</h2><fieldset><legend>{{ section.settings.text }}</legend>{% for block in section.blocks %}<label {{ block.shopify_attributes }}><input type="checkbox" name="items[]" value="{{ block.settings.variant.id }}">{{ block.settings.title | escape }}</label>{% endfor %}</fieldset><button type="button">{{ section.settings.cta_label | escape }}</button></section>`,
};
