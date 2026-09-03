import { renderProductFormLiquid } from "../shopify/liquid/product-form";
import type { DesignProfile } from "../design/profile";
import type { CustomNode, CustomSectionSpecV1 } from "./custom-spec";
import { compileCustomStyle } from "./custom-style";
import { validateCustomSectionSpec } from "./custom-validate";

export type CustomLiquidCompileInput = { spec: CustomSectionSpecV1; designProfile?: DesignProfile };
const liquidBinding = (binding: string) => {
  if (binding.startsWith("settings.")) return `{{ section.settings.${binding.slice(9)} | escape }}`;
  if (binding.startsWith("blocks.")) return `{{ block.settings.${binding.split(".")[2]} | escape }}`;
  const field = binding.slice("product.".length);
  return field === "featuredImage" ? `{{ product.featured_image | image_url: width: 1200 }}` : `{{ product.${field} | escape }}`;
};

function nodeLiquid(node: CustomNode): string {
  switch (node.kind) {
    case "stack": return `<div class="wf-custom-stack">${node.children.map(nodeLiquid).join("")}</div>`;
    case "grid": return `<div class="wf-custom-grid">${node.children.map(nodeLiquid).join("")}</div>`;
    case "heading": return `<h2 class="wf-custom-heading">${liquidBinding(node.binding)}</h2>`;
    case "text": return `<p class="wf-custom-text">${liquidBinding(node.binding)}</p>`;
    case "button": return `<button class="wf-custom-button" type="button">${liquidBinding(node.binding)}</button>`;
    case "image": return `<img class="wf-custom-image" src="${liquidBinding(node.binding)}" alt="">`;
    case "icon": return `<span class="wf-custom-icon" aria-hidden="true">${liquidBinding(node.binding)}</span>`;
    case "repeater": return `{% for block in section.blocks limit: ${node.max} %}<div class="wf-custom-card" {{ block.shopify_attributes }}>${node.template.map(nodeLiquid).join("")}</div>{% endfor %}`;
    case "product-form": return renderProductFormLiquid({ sectionClass: "wf-custom-commerce" });
    case "variant-selector": return `<div class="wf-custom-commerce" data-wf-variant-selector>Choisissez une variante</div>`;
    case "quantity-selector": return `<label class="wf-custom-commerce">Quantité <input type="number" name="quantity" min="1" value="1"></label>`;
  }
}

function shopifySetting(setting: CustomSectionSpecV1["settings"][number]) {
  const type = setting.type === "textarea" ? "textarea" : setting.type === "number" ? "number" : setting.type === "select" ? "select" : setting.type === "image" ? "image_picker" : setting.type === "link" ? "url" : setting.type === "toggle" ? "checkbox" : setting.type === "color" ? "color" : setting.type;
  return { type, id: setting.key, label: setting.label, ...(setting.options ? { options: setting.options.map((value) => ({ value, label: value })) } : {}) };
}

function schema(spec: CustomSectionSpecV1): string {
  const settings = spec.settings.filter((setting) => setting.scope === "settings").map(shopifySetting);
  const blocks = spec.blocks.map((block) => ({ type: block.type, name: block.name, settings: block.settings.filter((setting) => setting.scope === "settings").map(shopifySetting) }));
  return JSON.stringify({ name: spec.name, class: "weflo-custom-section", settings, blocks, presets: [{ name: spec.name }] });
}

/** Liquid is generated from the DSL only; no model Liquid is ever accepted. */
export function compileCustomLiquid(input: CustomLiquidCompileInput): string {
  const validation = validateCustomSectionSpec(input.spec);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  const spec = validation.value;
  const id = spec.id.replace(/[^a-z0-9-]/g, "");
  return `<section data-wf-custom="${id}" class="wf-custom-section"><style>${compileCustomStyle(spec, input.designProfile)}</style>${spec.nodes.map(nodeLiquid).join("")}</section>{% schema %}${schema(spec)}{% endschema %}`;
}
