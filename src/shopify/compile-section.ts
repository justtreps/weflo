import type { EditorSection } from "../editor/document";
import type { InspectorControl } from "../editor/section-schema";
import { getSectionDefinition } from "../sections/index";
import { sectionFileName } from "./names";
import type { CustomSectionPublication } from "../custom-sections/service";

function settingSchema(control: InspectorControl) {
  const type = control.type === "textarea" || control.type === "code" ? "textarea" : control.type === "toggle" ? "checkbox" : control.type === "number" ? "number" : control.type === "select" ? "select" : control.type === "link" ? "url" : control.type === "image" ? "image_picker" : control.type === "product" ? "product" : control.type === "collection" ? "collection" : "text";
  return { type, id: control.key, label: control.label, ...(type === "select" ? { options: (control.options ?? []).map((value) => ({ value, label: control.optionLabels?.[value] ?? value })) } : {}) };
}

function customPublication(section: EditorSection, publications: readonly CustomSectionPublication[] = []): CustomSectionPublication | null {
  const id = section.settings.custom_section_id;
  const version = section.settings.custom_section_version;
  const checksum = section.settings.custom_checksum;
  const hasCustomSpec = typeof section.settings.custom_spec === "string";
  if (typeof id !== "string" || typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    if (hasCustomSpec) throw new Error("La section Canardo doit référencer une version enregistrée avant publication.");
    return null;
  }
  const publication = publications.find((entry) => entry.section.id === id && entry.section.version === version);
  if (!publication || (typeof checksum === "string" && publication.section.checksum !== checksum)) {
    throw new Error("La version enregistrée de la section Canardo est introuvable ou ne correspond plus.");
  }
  return publication;
}

/** Resolves to the exact Liquid file stored for a private Canardo section. */
export function shopifySectionType(section: EditorSection, publications: readonly CustomSectionPublication[] = []): string {
  const publication = customPublication(section, publications);
  return publication ? publication.path.replace(/^sections\//, "").replace(/\.liquid$/, "") : `weflo-${section.type}`;
}

export function compileShopifySection(section: EditorSection, publications: readonly CustomSectionPublication[] = []): { key: string; value: string } {
  const publication = customPublication(section, publications);
  if (publication) return { key: publication.path, value: publication.content };
  const definition = getSectionDefinition(section.type);
  if (!definition) throw new Error(`Unknown Shopify section type: ${section.type}`);
  const schema = structuredClone(definition.renderSchema(section));
  const settings = [...new Map(definition.settings.map((control) => [control.key, control])).values()].map(settingSchema);
  if (!settings.some((entry) => entry.id === "variant") && definition.variants.length > 1) {
    settings.push({ type: "select", id: "variant", label: "Composition", options: definition.variants.map((variant) => ({ value: variant.id, label: variant.name })) });
  }
  const blocks = definition.blocks.map((block) => ({ type: block.type, name: block.name, settings: block.settings.map(settingSchema) }));
  const completeSchema = { ...schema, name: typeof schema.name === "string" ? schema.name.slice(0, 25) : definition.name.slice(0, 25), settings, blocks, presets: Array.isArray(schema.presets) && schema.presets.length ? schema.presets : [{ name: definition.name.slice(0, 25) }] };
  return { key: sectionFileName(section.type), value: `${definition.renderLiquid(section)}\n{% schema %}${JSON.stringify(completeSchema)}{% endschema %}` };
}
