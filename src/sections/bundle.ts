import { createSectionDefinition } from "./factory";
import { escapeHtml, value } from "./shared";
const base = createSectionDefinition("bundle", "Offre bundle", "commerce", "bundle", { title: "Crée ton bundle", price: "" });
export const bundleSection = {
  ...base,
  previewVariants:["routine-set","quantity-break"],
  renderWeb:(context:Parameters<typeof base.renderWeb>[0])=>{
    const requested=value(context.section,"variant","routine-set");
    const variant=new Set(["routine-set","quantity-break"]).has(requested)?requested:"routine-set";
    return base.renderWeb(context).replace('class="wf-section wf-bundle"',`class="wf-section wf-bundle wf-bundle--${escapeHtml(variant)}"`);
  },
  renderLiquid: () => `<section class="weflo-bundle"><h2>{{ section.settings.title | escape }}</h2><fieldset><legend>{{ section.settings.text }}</legend>{% for block in section.blocks %}<label {{ block.shopify_attributes }}><input type="checkbox" name="items[]" value="{{ block.settings.variant.id }}">{{ block.settings.title | escape }}</label>{% endfor %}</fieldset><button type="button">{{ section.settings.cta_label | escape }}</button></section>`,
};
