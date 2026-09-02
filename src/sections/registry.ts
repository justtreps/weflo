import type { SectionDefinition } from "./types";
import { previewManifest } from "../section-preview/manifests";

const definitions = new Map<string, SectionDefinition>();

function assertComplete(definition: SectionDefinition): void {
  if (!definition.type?.trim()) throw new Error("Section type is required");
  if (!definition.name?.trim()) throw new Error(`Section ${definition.type} name is required`);
  if (!definition.category) throw new Error(`Section ${definition.type} category is required`);
  if (!definition.defaults || !Array.isArray(definition.settings) || !Array.isArray(definition.blocks)) throw new Error(`Section ${definition.type} schema is incomplete`);
  if (typeof definition.renderWeb !== "function" || typeof definition.renderLiquid !== "function") throw new Error(`Section ${definition.type} renderers are required`);
  for (const variant of definition.previewVariants ?? []) previewManifest(definition.type, variant);
}

export function registerSection(definition: SectionDefinition): SectionDefinition {
  assertComplete(definition);
  if (definitions.has(definition.type)) throw new Error(`Section ${definition.type} is already registered`);
  definitions.set(definition.type, definition);
  return definition;
}

export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return definitions.get(type);
}

export function listSectionDefinitions(): SectionDefinition[] {
  return [...definitions.values()];
}
