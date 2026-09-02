import type { EditorSection, InspectorControl } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import { sectionFileName } from "./names";

function settingSchema(control: InspectorControl) {
  const type = control.type === "textarea" || control.type === "code" ? "textarea" : control.type === "toggle" ? "checkbox" : control.type === "number" ? "number" : control.type === "select" ? "select" : control.type === "link" ? "url" : "text";
  return { type, id: control.key, label: control.label, ...(type === "select" ? { options: (control.options ?? []).map((value) => ({ value, label: value })) } : {}) };
}

export function compileShopifySection(section: EditorSection): { key: string; value: string } {
  const definition = getSectionDefinition(section.type);
  if (!definition) throw new Error(`Unknown Shopify section type: ${section.type}`);
  const settings = [...new Map(definition.settings.map((control) => [control.key, control])).values()].map(settingSchema);
  const blocks = definition.blocks.map((block) => ({ type: block.type, name: block.name, settings: block.settings.map(settingSchema) }));
  const schema = JSON.stringify({ name: definition.name.slice(0, 25), settings, blocks, presets: [{ name: definition.name.slice(0, 25) }] });
  return { key: sectionFileName(section.type), value: `${definition.renderLiquid(section)}\n{% schema %}${schema}{% endschema %}` };
}
