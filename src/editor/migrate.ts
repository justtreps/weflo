import { DEFAULT_PAGE_THEME, documentFromModel } from "../lib/catalog";
import type { PageDocument, PageType, Section } from "../types";
import type {
  EditorBlock,
  EditorDocument,
  EditorPageKind,
  EditorSection,
  SettingValue,
} from "./document";
import { isEditorDocument } from "./document";
import { buildModelDocument } from "../models/model-manifest";

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}

function setting(value: unknown): SettingValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
    return value as SettingValue;
  }
  return JSON.stringify(value);
}

function settings(values: Record<string, unknown>): Record<string, SettingValue> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, setting(value)]));
}

function legacyBlocks(section: Section): EditorBlock[] {
  const value = section.settings.blocks;
  if (!Array.isArray(value)) return [];
  return value.flatMap((block, index) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return [];
    const raw = block as Record<string, unknown>;
    return [{
      id: typeof raw.id === "string" && raw.id ? raw.id : `${section.id}-block-${index + 1}`,
      type: typeof raw.type === "string" && raw.type ? raw.type : "item",
      settings: settings(raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings)
        ? raw.settings as Record<string, unknown>
        : raw),
    }];
  });
}

function migrateSection(section: Section, index: number): EditorSection {
  return {
    id: section.id || `${section.type}-${index + 1}`,
    type: section.type,
    name: typeof section.settings.title === "string" && section.settings.title.trim()
      ? section.settings.title
      : section.type,
    hidden: false,
    locked: false,
    settings: settings(Object.fromEntries(Object.entries(section.settings).filter(([key]) => key !== "blocks"))),
    style: {},
    responsive: {},
    blocks: legacyBlocks(section),
  };
}

export function editorKind(type: PageType | EditorPageKind): EditorPageKind {
  if (type === "sell") return "product";
  if (type === "write" || type === "blank") return "landing";
  return type;
}

export function migrateDocument(document: PageDocument | EditorDocument, kind: PageType | EditorPageKind = "landing"): EditorDocument {
  if (isEditorDocument(document)) return structuredClone(document);
  const pageSlug = slug(document.path === "/" ? document.name : document.path);
  return {
    version: 2,
    name: document.name,
    path: document.path.startsWith("/") ? document.path : `/${document.path}`,
    kind: editorKind(kind),
    ...(document.modelId ? { modelId: document.modelId } : {}),
    theme: { ...(document.theme ?? DEFAULT_PAGE_THEME) },
    pages: [{
      id: `page-${pageSlug}`,
      name: document.name,
      slug: pageSlug,
      sections: document.sections.map(migrateSection),
    }],
    assets: [],
  };
}

export function documentForModel(modelId: string, pageName: string): EditorDocument {
  return buildModelDocument(modelId, pageName);
}
