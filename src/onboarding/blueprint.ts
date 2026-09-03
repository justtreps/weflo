import { getSectionDefinition } from "../sections";
import type { SectionCapability } from "../sections/types";
import type { BlueprintSection, StoreBlueprint } from "./types";

const CAPABILITIES = new Set<SectionCapability>([
  "product-form", "variant-selection", "quantity-breaks", "collection-binding", "recommendations", "fixed-bundle", "custom-bundle", "selling-plan", "preorder", "cart-drawer", "app-blocks", "markets", "localization",
]);

function settingValue(value: unknown): boolean {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    || (Array.isArray(value) && value.every((item) => item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean"));
}

function validSection(section: BlueprintSection, pageIds: Set<string>): string[] {
  const errors: string[] = [];
  const sectionType = section.sectionType || (section as unknown as { type?: unknown }).type;
  const type = typeof sectionType === "string" ? sectionType : "";
  const definition = getSectionDefinition(type);
  if (!definition) errors.push(`Section inconnue: ${type}`);
  if (!pageIds.has(section.pageId)) errors.push(`Page inconnue: ${section.pageId}`);
  const variants = definition?.variants.map((variant) => variant.id) ?? [];
  if (definition && section.variantId !== "default" && variants.length && !variants.includes(section.variantId)) errors.push(`Variante inconnue: ${type}/${section.variantId}`);
  if (definition && !variants.length && section.variantId !== "default") errors.push(`Variante inconnue: ${type}/${section.variantId}`);
  if (!section.purpose?.trim()) errors.push(`Objectif manquant: ${type}`);
  for (const [key, value] of Object.entries(section.content ?? {})) {
    if (!settingValue(value)) errors.push(`Réglage invalide: ${type}.${key}`);
    if (/fixture|lorem|demo/i.test(String(value))) errors.push(`Donnée de prévisualisation interdite: ${type}.${key}`);
  }
  for (const capability of section.requiredCapabilities ?? []) if (!CAPABILITIES.has(capability)) errors.push(`Capacité inconnue: ${capability}`);
  return errors;
}

export function validateStoreBlueprint(value: unknown): { ok: boolean; errors: string[] } {
  const blueprint = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<StoreBlueprint> : null;
  if (!blueprint) return { ok: false, errors: ["Blueprint invalide"] };
  const errors: string[] = [];
  if (blueprint.version !== 1) errors.push("Version de Blueprint invalide");
  if (!blueprint.name?.trim()) errors.push("Nom de Blueprint manquant");
  if (!blueprint.market?.trim() || !blueprint.language?.trim() || !blueprint.currency?.trim()) errors.push("Marché, langue ou devise manquant");
  if (!blueprint.designProfile?.id) errors.push("Profil de design manquant");
  if (!Array.isArray(blueprint.pages) || !blueprint.pages.length) errors.push("Aucune page dans le Blueprint");
  if (!Array.isArray(blueprint.sections) || !blueprint.sections.length) errors.push("Aucune section dans le Blueprint");
  const pageIds = new Set((blueprint.pages ?? []).map((page) => page.id));
  if (pageIds.size !== (blueprint.pages ?? []).length) errors.push("Identifiants de page dupliqués");
  for (const section of blueprint.sections ?? []) errors.push(...validSection(section, pageIds));
  return { ok: errors.length === 0, errors };
}
