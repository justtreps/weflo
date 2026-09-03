import type { EditorPageKind, EditorSection } from "../editor/document";
import type { SectionCapability, SectionCategory, SectionDefinition, SectionFamily, SectionPackDefinition, SectionVariantDefinition } from "./types";

const definitions = new Map<string, SectionPackDefinition>();

const LEGACY_FAMILY: Record<SectionCategory, SectionFamily> = {
  brand: "brand-story", media: "demo-media", commerce: "product-purchase",
  conversion: "conversion-capture", content: "faq-trust", layout: "custom",
};
const ALL_PAGES: EditorPageKind[] = ["landing", "product", "collection", "home"];

function assertComplete(definition: SectionDefinition): void {
  if (!definition.type?.trim()) throw new Error("Section type is required");
  if (!definition.name?.trim()) throw new Error(`Section ${definition.type} name is required`);
  if (!definition.category) throw new Error(`Section ${definition.type} category is required`);
  if (!definition.defaults || !Array.isArray(definition.settings) || !Array.isArray(definition.blocks)) throw new Error(`Section ${definition.type} schema is incomplete`);
  if (typeof definition.renderWeb !== "function" || typeof definition.renderLiquid !== "function") throw new Error(`Section ${definition.type} renderers are required`);
}

function legacyVariant(definition: SectionDefinition, id = "default"): SectionVariantDefinition {
  return { id, name: id === "default" ? "Par défaut" : id, description: "Variante compatible avec les documents Weflo existants.", composition: id === "default" ? "composition-par-defaut" : `composition-${id}`, previewFixtureId: "", defaults: { ...definition.defaults, ...(id === "default" ? {} : { variant: id }) } };
}

function defaultSchema(pack: SectionPackDefinition): Record<string, unknown> {
  const control = (item: { key: string; label: string; type: string }) => ({ id: item.key, label: item.label, type: item.type === "textarea" ? "textarea" : "text" });
  return {
    name: pack.name,
    settings: pack.settings.map(control),
    blocks: pack.blocks.map((block) => ({ type: block.type, name: block.name, settings: block.settings.map(control) })),
    presets: pack.variants.map((variant) => ({ name: variant.name, settings: { ...variant.defaults, variant: variant.id } })),
  };
}

function defaultMigrate(section: EditorSection, _fromPackVersion: number): EditorSection {
  return { ...section, settings: { ...section.settings } };
}

/** Converts a legacy definition once at registration, never at render time. */
export function normalizeSectionPack(definition: SectionDefinition | SectionPackDefinition): SectionPackDefinition {
  assertComplete(definition);
  const candidate = definition as Partial<SectionPackDefinition>;
  const declaredVariants = candidate.variants;
  const variants = declaredVariants && declaredVariants.length
    ? declaredVariants.map((variant) => ({ ...variant, defaults: { ...variant.defaults } }))
    : (definition.previewVariants?.length ? definition.previewVariants : ["default"]).map((id) => legacyVariant(definition, id));
  const ids = new Set<string>();
  for (const variant of variants) {
    if (!variant.id?.trim()) throw new Error(`Section ${definition.type} has a variant without an id`);
    if (ids.has(variant.id)) throw new Error(`Duplicate section variant: ${definition.type}:${variant.id}`);
    ids.add(variant.id);
  }
  const families = candidate.families?.length ? candidate.families : [LEGACY_FAMILY[definition.category]];
  const pack = {
    ...definition,
    packVersion: 1 as const,
    families: [...families],
    tags: candidate.tags ? [...candidate.tags] : [],
    supportedPages: candidate.supportedPages?.length ? [...candidate.supportedPages] : [...ALL_PAGES],
    supportedMarkets: candidate.supportedMarkets?.length ? [...candidate.supportedMarkets] : ["all"],
    capabilities: candidate.capabilities ? [...candidate.capabilities] as SectionCapability[] : [],
    variants,
    assets: candidate.assets ? [...candidate.assets] : [],
    migrate: candidate.migrate ?? defaultMigrate,
  };
  return { ...pack, renderSchema: candidate.renderSchema ?? (() => defaultSchema(pack as SectionPackDefinition)) } as SectionPackDefinition;
}

export function registerSection(definition: SectionDefinition | SectionPackDefinition): SectionPackDefinition {
  const pack = normalizeSectionPack(definition);
  if (definitions.has(pack.type)) throw new Error(`Section ${pack.type} is already registered`);
  definitions.set(pack.type, pack);
  return pack;
}

export function getSectionDefinition(type: string): SectionPackDefinition | undefined { return definitions.get(type); }
export const getSectionPack = getSectionDefinition;
export function listSectionDefinitions(): SectionPackDefinition[] { return [...definitions.values()]; }
export const listSectionPacks = listSectionDefinitions;
