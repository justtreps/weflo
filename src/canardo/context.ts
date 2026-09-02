import type { EditorDocument } from "../editor/document";
import { listSectionDefinitions } from "../sections/index";

export type ShopifyContextSummary = { connected: boolean; productCount?: number; collectionCount?: number };

export function buildCanardoContext(document: EditorDocument, selectedId: string | null, shopify?: ShopifyContextSummary) {
  const page = document.pages.find((item) => item.sections.some((section) => section.id === selectedId)) ?? document.pages[0];
  const selected = page.sections.find((section) => section.id === selectedId) ?? null;
  return {
    page: { id: page.id, name: page.name, kind: document.kind, sectionOrder: page.sections.map((section) => ({ id: section.id, type: section.type, name: section.name, locked: section.locked })) },
    selection: selected ? { id: selected.id, type: selected.type, settings: selected.settings, style: selected.style, responsive: selected.responsive, blocks: selected.blocks.slice(0, 20) } : null,
    theme: document.theme,
    availableSections: listSectionDefinitions().map((definition) => ({ type: definition.type, name: definition.name, category: definition.category, defaults: definition.defaults, settings: definition.settings.map(({ key, type, scope }) => ({ key, type, scope })), blockTypes: definition.blocks.map((block) => block.type) })),
    shopify: shopify ? { connected: Boolean(shopify.connected), productCount: shopify.productCount, collectionCount: shopify.collectionCount } : undefined,
  };
}
