import type {
  AssetReference,
  EditorBlock,
  EditorDocument,
  EditorPage,
  EditorSection,
  ResponsiveSettings,
  SettingValue,
  StyleSettings,
} from "./document";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const BREAKPOINTS = new Set(["desktop", "tablet", "mobile"]);
const PAGE_KINDS = new Set(["landing", "product", "collection", "home"]);
const ASSET_TYPES = new Set(["image", "video"]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function settingValue(value: unknown): value is SettingValue {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  return Array.isArray(value) && value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

function styleSettings(value: unknown): value is StyleSettings {
  return object(value) && Object.values(value).every(settingValue);
}

function responsiveSettings(value: unknown): value is ResponsiveSettings {
  if (!object(value)) return false;
  return Object.entries(value).every(([breakpoint, styles]) => BREAKPOINTS.has(breakpoint) && styleSettings(styles));
}

function unsafeCustomCode(section: Record<string, unknown>): boolean {
  if (section.type !== "customCode" || !object(section.settings)) return false;
  const html = typeof section.settings.html === "string" ? section.settings.html : "";
  const js = typeof section.settings.js === "string" ? section.settings.js : "";
  return /<script\b[^>]*\bsrc\s*=|\bimport\s*\(|\bdocument\.cookie\b|\bwindow\.top\b|\bparent\.location\b/i.test(`${html}\n${js}`);
}

function validateBlock(value: unknown, errors: string[], blockIds: Set<string>): value is EditorBlock {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.type) || !object(value.settings)) {
    errors.push("Invalid editor block");
    return false;
  }
  if (blockIds.has(value.id)) errors.push(`Duplicate block id: ${value.id}`);
  blockIds.add(value.id);
  for (const [key, setting] of Object.entries(value.settings)) {
    if (!settingValue(setting)) errors.push(`Invalid setting value at ${value.id}.${key}`);
  }
  return true;
}

function validateSection(value: unknown, errors: string[], sectionIds: Set<string>, blockIds: Set<string>): value is EditorSection {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.type)) {
    errors.push("Invalid editor section");
    return false;
  }
  const id = value.id;
  if (sectionIds.has(id)) errors.push(`Duplicate section id: ${id}`);
  sectionIds.add(id);
  if (!nonEmptyString(value.name) || typeof value.hidden !== "boolean" || typeof value.locked !== "boolean") {
    errors.push(`Invalid section metadata: ${id}`);
  }
  if (!object(value.settings)) errors.push(`Invalid section settings: ${id}`);
  else for (const [key, setting] of Object.entries(value.settings)) {
    if (!settingValue(setting)) errors.push(`Invalid setting value at ${id}.${key}`);
  }
  if (!styleSettings(value.style)) errors.push(`Invalid style settings in section: ${id}`);
  if (!responsiveSettings(value.responsive)) errors.push(`Invalid responsive settings in section: ${id}`);
  if (!Array.isArray(value.blocks)) errors.push(`Invalid blocks in section: ${id}`);
  else value.blocks.forEach((block) => validateBlock(block, errors, blockIds));
  if (unsafeCustomCode(value)) errors.push(`Unsafe custom code in section: ${id}`);
  return true;
}

function validatePage(value: unknown, errors: string[], pageIds: Set<string>, sectionIds: Set<string>, blockIds: Set<string>): value is EditorPage {
  if (!object(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.slug) || !Array.isArray(value.sections)) {
    errors.push("Invalid editor page");
    return false;
  }
  if (pageIds.has(value.id)) errors.push(`Duplicate page id: ${value.id}`);
  pageIds.add(value.id);
  value.sections.forEach((section) => validateSection(section, errors, sectionIds, blockIds));
  return true;
}

function validateAsset(value: unknown, errors: string[], assetIds: Set<string>): value is AssetReference {
  if (!object(value) || !nonEmptyString(value.id) || !ASSET_TYPES.has(String(value.type)) || !nonEmptyString(value.url)) {
    errors.push("Invalid asset reference");
    return false;
  }
  if (assetIds.has(value.id)) errors.push(`Duplicate asset id: ${value.id}`);
  assetIds.add(value.id);
  if (value.alt !== undefined && typeof value.alt !== "string") errors.push(`Invalid asset alt: ${value.id}`);
  return true;
}

function validTheme(value: unknown): boolean {
  if (!object(value)) return false;
  return ["background", "surface", "ink", "muted", "accent"].every((key) => typeof value[key] === "string")
    && ["sans", "serif", "condensed"].includes(String(value.display))
    && ["none", "soft", "round"].includes(String(value.radius));
}

export function validateEditorDocument(value: unknown): ValidationResult<EditorDocument> {
  const errors: string[] = [];
  if (!object(value)) return { ok: false, errors: ["Editor document must be an object"] };
  if (value.version !== 2) errors.push("Unsupported editor document version");
  if (!nonEmptyString(value.name)) errors.push("Editor document name is required");
  if (typeof value.path !== "string" || !value.path.startsWith("/")) errors.push("Editor document path must start with /");
  if (!PAGE_KINDS.has(String(value.kind))) errors.push("Invalid editor document kind");
  if (!validTheme(value.theme)) errors.push("Invalid editor document theme");

  const pageIds = new Set<string>();
  const sectionIds = new Set<string>();
  const blockIds = new Set<string>();
  const assetIds = new Set<string>();
  if (!Array.isArray(value.pages) || value.pages.length === 0) errors.push("Editor document needs at least one page");
  else value.pages.forEach((page) => validatePage(page, errors, pageIds, sectionIds, blockIds));
  if (!Array.isArray(value.assets)) errors.push("Editor document assets must be an array");
  else value.assets.forEach((asset) => validateAsset(asset, errors, assetIds));

  return errors.length ? { ok: false, errors } : { ok: true, value: value as EditorDocument };
}

