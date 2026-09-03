import type { BlockDefinition, SectionCapability } from "../sections/types";
import { hasSectionCapability } from "../sections/capabilities";
import type { InspectorControl, InspectorControlType, InspectorScope } from "../editor/section-schema";
import { CUSTOM_PRIMITIVES, CUSTOM_TOKENS, type CustomNode, type CustomSectionSpecV1 } from "./custom-spec";

export type CustomSpecValidation = { ok: true; value: CustomSectionSpecV1; errors: [] } | { ok: false; errors: string[] };

const SPEC_KEYS = new Set(["version", "id", "name", "purpose", "nodes", "settings", "blocks", "requiredCapabilities"]);
const CONTROL_KEYS = new Set(["key", "label", "type", "scope", "options"]);
const BLOCK_KEYS = new Set(["type", "name", "defaults", "settings"]);
const CONTROL_TYPES = new Set<InspectorControlType>(["text", "textarea", "number", "select", "toggle", "color", "image", "link", "product", "collection"]);
const CONTROL_SCOPES = new Set<InspectorScope>(["settings", "style", "responsive"]);
const TOKENS = new Set<string>(CUSTOM_TOKENS);
const ID = /^[a-z][a-z0-9-]{1,63}$/;
const KEY = /^[a-z][a-z0-9_]{0,63}$/;
const PRODUCT_BINDING = new Set(["product.title", "product.price", "product.compareAtPrice", "product.featuredImage", "product.url"]);

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function noExtra(value: Record<string, unknown>, keys: Set<string>, errors: string[], label: string): void { if (Object.keys(value).some((key) => !keys.has(key))) errors.push(`Propriété inattendue dans ${label}.`); }
function nonEmpty(value: unknown, max = 240): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
function validDefault(value: unknown): boolean { return value === null || ["string", "number", "boolean"].includes(typeof value) || (Array.isArray(value) && value.every(validDefault)); }

function validateControl(value: unknown, errors: string[], keys: Set<string>): value is InspectorControl {
  if (!record(value)) { errors.push("Réglage invalide."); return false; }
  noExtra(value, CONTROL_KEYS, errors, "un réglage");
  if (!nonEmpty(value.key, 64) || !KEY.test(value.key)) errors.push("Clé de réglage invalide.");
  else if (keys.has(value.key)) errors.push(`Clé de réglage dupliquée: ${value.key}.`); else keys.add(value.key);
  if (!nonEmpty(value.label, 100)) errors.push("Libellé de réglage invalide.");
  if (!CONTROL_TYPES.has(value.type as InspectorControlType)) errors.push("Type de réglage interdit.");
  if (!CONTROL_SCOPES.has(value.scope as InspectorScope)) errors.push("Portée de réglage invalide.");
  if (value.options !== undefined && (!Array.isArray(value.options) || value.options.length > 30 || value.options.some((option) => !nonEmpty(option, 100)))) errors.push("Options de réglage invalides.");
  if (value.type === "select" && (!Array.isArray(value.options) || value.options.length === 0)) errors.push("Un réglage de liste doit définir des options.");
  return true;
}

function validateBlock(value: unknown, errors: string[], types: Set<string>): value is BlockDefinition {
  if (!record(value)) { errors.push("Bloc invalide."); return false; }
  noExtra(value, BLOCK_KEYS, errors, "un bloc");
  if (!nonEmpty(value.type, 64) || !KEY.test(value.type)) errors.push("Type de bloc invalide.");
  else if (types.has(value.type)) errors.push(`Type de bloc dupliqué: ${value.type}.`); else types.add(value.type);
  if (!nonEmpty(value.name, 100)) errors.push("Nom de bloc invalide.");
  if (!record(value.defaults) || Object.keys(value.defaults).length > 30 || Object.values(value.defaults).some((setting) => !validDefault(setting))) errors.push("Valeurs par défaut du bloc invalides.");
  const keys = new Set<string>();
  if (!Array.isArray(value.settings) || value.settings.length > 30) errors.push("Réglages de bloc invalides.");
  else value.settings.forEach((setting) => validateControl(setting, errors, keys));
  if (record(value.defaults) && Object.keys(value.defaults).some((key) => !keys.has(key))) errors.push("Valeur par défaut de bloc non configurée.");
  return true;
}

function bindingIsKnown(binding: string, settings: Set<string>, blockTypes: Set<string>): boolean {
  if (PRODUCT_BINDING.has(binding)) return true;
  if (binding.startsWith("settings.")) return settings.has(binding.slice("settings.".length));
  const match = /^blocks\.([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/.exec(binding);
  return Boolean(match && blockTypes.has(match[1]));
}

function validateNode(value: unknown, errors: string[], settings: Set<string>, blockTypes: Set<string>, depth: number, state: { count: number }): value is CustomNode {
  state.count += 1;
  if (state.count > 120) { errors.push("La section dépasse 120 nœuds."); return false; }
  if (depth > 6) { errors.push("La section dépasse 6 niveaux."); return false; }
  if (!record(value) || typeof value.kind !== "string") { errors.push("Nœud invalide."); return false; }
  if (!(CUSTOM_PRIMITIVES as readonly string[]).includes(value.kind)) { errors.push(`Primitive interdite: ${value.kind}`); return false; }
  const kind = value.kind;
  const keys = kind === "stack" || kind === "grid" ? new Set(["kind", "token", "children"])
    : ["heading", "text", "button", "image", "icon"].includes(kind) ? new Set(["kind", "binding", "token"])
      : kind === "repeater" ? new Set(["kind", "blockType", "min", "max", "template"])
        : new Set(["kind", "capability"]);
  noExtra(value, keys, errors, "un nœud");
  if (kind === "stack" || kind === "grid") {
    if (!TOKENS.has(value.token as string)) errors.push("Token de disposition invalide.");
    if (!Array.isArray(value.children) || value.children.length === 0 || value.children.length > 24) errors.push("Enfants de disposition invalides.");
    else value.children.forEach((child) => validateNode(child, errors, settings, blockTypes, depth + 1, state));
  } else if (["heading", "text", "button", "image", "icon"].includes(kind)) {
    if (!TOKENS.has(value.token as string)) errors.push("Token de contenu invalide.");
    if (typeof value.binding !== "string" || !bindingIsKnown(value.binding, settings, blockTypes)) errors.push("Liaison non configurée.");
  } else if (kind === "repeater") {
    if (typeof value.blockType !== "string" || !blockTypes.has(value.blockType)) errors.push("Type de bloc de répétition inconnu.");
    if (!Number.isInteger(value.min) || !Number.isInteger(value.max) || (value.min as number) < 0 || (value.max as number) < (value.min as number) || (value.max as number) > 12) errors.push("Bornes de répétition invalides.");
    if (!Array.isArray(value.template) || value.template.length === 0 || value.template.length > 12) errors.push("Modèle de répétition invalide.");
    else value.template.forEach((child) => validateNode(child, errors, settings, blockTypes, depth + 1, state));
  } else if (!hasSectionCapability(value.capability)) errors.push("Capacité Shopify inconnue.");
  return true;
}

function declaredNodeCapabilities(nodes: CustomNode[]): SectionCapability[] {
  return nodes.flatMap((node) => "children" in node ? declaredNodeCapabilities(node.children) : "template" in node ? declaredNodeCapabilities(node.template) : "capability" in node ? [node.capability] : []);
}

export function validateCustomSectionSpec(value: unknown): CustomSpecValidation {
  const errors: string[] = [];
  if (!record(value)) return { ok: false, errors: ["La spécification doit être un objet."] };
  noExtra(value, SPEC_KEYS, errors, "la spécification");
  if (value.version !== 1) errors.push("Version de spécification non prise en charge.");
  if (!nonEmpty(value.id, 64) || !ID.test(value.id)) errors.push("Identifiant de section invalide.");
  if (!nonEmpty(value.name, 100) || !nonEmpty(value.purpose, 500)) errors.push("Nom ou objectif invalide.");
  const settingKeys = new Set<string>();
  if (!Array.isArray(value.settings) || value.settings.length > 30) errors.push("La section dépasse 30 réglages.");
  else value.settings.forEach((setting) => validateControl(setting, errors, settingKeys));
  const blockTypes = new Set<string>();
  if (!Array.isArray(value.blocks) || value.blocks.length > 12) errors.push("La section dépasse 12 blocs.");
  else value.blocks.forEach((block) => validateBlock(block, errors, blockTypes));
  if (!Array.isArray(value.requiredCapabilities) || value.requiredCapabilities.length > 12 || value.requiredCapabilities.some((capability) => !hasSectionCapability(capability))) errors.push("Capacités requises invalides.");
  else if (new Set(value.requiredCapabilities).size !== value.requiredCapabilities.length) errors.push("Capacités requises dupliquées.");
  const state = { count: 0 };
  if (!Array.isArray(value.nodes) || value.nodes.length === 0 || value.nodes.length > 24) errors.push("Nœuds de section invalides.");
  else value.nodes.forEach((node) => validateNode(node, errors, settingKeys, blockTypes, 1, state));
  if (Array.isArray(value.nodes) && Array.isArray(value.requiredCapabilities)) {
    const declared = new Set(value.requiredCapabilities.filter(hasSectionCapability));
    for (const capability of declaredNodeCapabilities(value.nodes as CustomNode[])) if (!declared.has(capability)) errors.push(`Capacité non déclarée: ${capability}.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: value as CustomSectionSpecV1, errors: [] };
}
