import type { EditorDocument } from "../editor/document";
import { listSectionDefinitions } from "../sections/index";
import { querySectionCatalog } from "../section-preview/manifests";

export type ShopifyContextSummary = { connected: boolean; productCount?: number; collectionCount?: number };

export function buildCanardoContext(document: EditorDocument, selectedId: string | null, shopify?: ShopifyContextSummary) {
  const page = document.pages.find((item) => item.sections.some((section) => section.id === selectedId)) ?? document.pages[0];
  const selected = page.sections.find((section) => section.id === selectedId) ?? null;
  const context = {
    page: { id: page.id, name: page.name, kind: document.kind, sectionOrder: page.sections.map((section) => ({ id: section.id, type: section.type, name: section.name, locked: section.locked })) },
    selection: selected ? { id: selected.id, type: selected.type, settings: selected.settings, style: selected.style, responsive: selected.responsive, blocks: selected.blocks.slice(0, 20) } : null,
    theme: document.theme,
    designProfile: document.designProfile,
    /** Imported facts only; previews and arbitrary customer content never enter the model context. */
    productTruth: document.commerce?.productTruth,
    availableSections: listSectionDefinitions().map((definition) => ({ type: definition.type, name: definition.name, category: definition.category, defaults: definition.defaults, settings: definition.settings.map(({ key, type, scope }) => ({ key, type, scope })), blockTypes: definition.blocks.map((block) => block.type) })),
    /** Compact, customer-safe composition palette: never include preview fixtures. */
    catalog: querySectionCatalog().map((item) => ({ type:item.sectionType, variantId:item.variantId, title:item.title, family:item.family, purpose:item.conversionGoal, capabilities:item.capabilityBadges.map((badge)=>({id:badge.capability,state:badge.state})) })),
    shopify: shopify ? { connected: Boolean(shopify.connected), productCount: shopify.productCount, collectionCount: shopify.collectionCount } : undefined,
  };
  // Local composition can materialize safely from the current document, while
  // JSON serialization for the model keeps that customer document out of the prompt.
  Object.defineProperty(context, "document", { value: document, enumerable: false });
  Object.defineProperty(context, "selectedId", { value: selectedId, enumerable: false });
  return context as typeof context & { document: EditorDocument; selectedId: string | null };
}
