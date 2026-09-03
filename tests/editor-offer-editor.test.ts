import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { migrateDocument } from "../src/editor/migrate";
import { bindOfferEditor, offerEditorMarkup, runOfferEditorAction } from "../src/editor/ui/offer-editor";
import { createEditorStore } from "../src/editor/ui/store";
import { blankDocument } from "../src/lib/catalog";

const offerSection = (overrides: Partial<EditorSection> = {}): EditorSection => ({
  id: "quantity-offer-1",
  type: "quantity-offer",
  name: "Offre quantité",
  hidden: false,
  locked: false,
  settings: { title: "Choisissez votre quantité", variant: "horizontal-cards", product_handle: "serum" },
  style: {},
  responsive: {},
  blocks: [
    { id: "solo", type: "offer-tier", settings: { title: "Solo", quantity: 1, discount_type: "none", discount_value: 0, product_handle: "serum", variant_id: "101", badge: "", preselected: true, show_variant_picker: false } },
    { id: "duo", type: "offer-tier", settings: { title: "Duo", quantity: 2, discount_type: "percentage", discount_value: 10, product_handle: "serum", variant_id: "102", badge: "Le plus choisi", preselected: false, show_variant_picker: true } },
    { id: "trio", type: "offer-tier", settings: { title: "Trio", quantity: 3, discount_type: "amount", discount_value: 8, product_handle: "serum", variant_id: "103", badge: "", preselected: false, show_variant_picker: false } },
  ],
  packVersion: 1,
  variantId: "horizontal-cards",
  ...overrides,
});

function editor(section = offerSection()) {
  const document = migrateDocument(blankDocument("Boutique"));
  document.pages[0].sections.push(section);
  return createEditorStore({
    document,
    pageId: document.pages[0].id,
    selectedId: section.id,
    selectedBlockId: "duo",
    activePanel: "commerce",
    breakpoint: "desktop",
    mode: "edit",
    leftCollapsed: false,
    rightCollapsed: false,
    saveStatus: "saved",
  });
}

class FakeRoot {
  listeners = new Map<string, Set<(event: Record<string, unknown>) => void>>();

  addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, target: Record<string, unknown>, details: Record<string, unknown> = {}) {
    const event = { target, preventDefault() {}, ...details };
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

function offerTarget(dataset: Record<string, string>, values: Record<string, unknown> = {}) {
  const target = {
    dataset,
    value: "",
    checked: false,
    type: "button",
    closest(selector: string) {
      if (selector.includes("data-offer-action") && dataset.offerAction) return target;
      if (selector.includes("data-offer-setting") && dataset.offerSetting) return target;
      if (selector.includes("data-offer-composition") && dataset.offerComposition !== undefined) return target;
      if (selector.includes("data-offer-tier") && dataset.offerTier) return target;
      return null;
    },
    ...values,
  };
  return target;
}

describe("offer editor", () => {
  it("renders contextual tier controls and native Shopify capability", () => {
    const state = editor().getState();
    const markup = offerEditorMarkup(state);

    expect(markup).toContain("Offres et bundles");
    expect(markup).toContain('data-offer-tier="duo"');
    expect(markup).toContain('data-offer-action="add"');
    expect(markup).toContain('data-offer-setting="discount_value"');
    expect(markup).toContain('data-offer-composition="horizontal-cards"');
    expect(markup).toContain('data-offer-capability="native"');
    expect(markup).toContain("Compatible avec le panier Shopify natif");
    expect(markup).toContain('aria-label="Diminuer la quantité du palier Duo"');
    expect(markup).toContain('aria-label="Déplacer le palier Duo"');
  });

  it("warns when tiers bind to more than one Shopify product", () => {
    const mixed = offerSection({
      blocks: offerSection().blocks.map((block) => block.id === "trio"
        ? { ...block, settings: { ...block.settings, product_handle: "creme" } }
        : block),
    });

    const markup = offerEditorMarkup(editor(mixed).getState());

    expect(markup).toContain('data-offer-capability="app-required"');
    expect(markup).toContain("Une application Shopify est requise");
  });

  it("updates block settings through commands and keeps one preselected tier", () => {
    const store = editor();
    const original = store.getState().document;

    runOfferEditorAction(store, { action: "setting", sectionId: "quantity-offer-1", blockId: "duo", key: "discount_value", value: 15 });
    runOfferEditorAction(store, { action: "preselect", sectionId: "quantity-offer-1", blockId: "duo" });

    const section = store.getState().document.pages[0].sections.at(-1)!;
    expect(section.blocks.find((block) => block.id === "duo")?.settings.discount_value).toBe(15);
    expect(section.blocks.filter((block) => block.settings.preselected === true).map((block) => block.id)).toEqual(["duo"]);
    expect(original.pages[0].sections.at(-1)?.blocks.find((block) => block.id === "solo")?.settings.preselected).toBe(true);
  });

  it("adds, duplicates and removes tiers without breaking preselection", () => {
    const store = editor();

    runOfferEditorAction(store, { action: "add", sectionId: "quantity-offer-1" });
    const added = store.getState().selectedBlockId!;
    runOfferEditorAction(store, { action: "duplicate", sectionId: "quantity-offer-1", blockId: "solo" });
    const duplicate = store.getState().selectedBlockId!;
    runOfferEditorAction(store, { action: "remove", sectionId: "quantity-offer-1", blockId: "solo" });

    const section = store.getState().document.pages[0].sections.at(-1)!;
    expect(section.blocks.some((block) => block.id === added)).toBe(true);
    expect(section.blocks.some((block) => block.id === duplicate)).toBe(true);
    expect(section.blocks.some((block) => block.id === "solo")).toBe(false);
    expect(section.blocks.filter((block) => block.settings.preselected === true)).toHaveLength(1);
  });

  it("moves tiers with keyboard and pointer destinations", () => {
    const store = editor();

    runOfferEditorAction(store, { action: "move", sectionId: "quantity-offer-1", blockId: "duo", toIndex: 0 });
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.map((block) => block.id)).toEqual(["duo", "solo", "trio"]);

    runOfferEditorAction(store, { action: "move", sectionId: "quantity-offer-1", blockId: "duo", toIndex: 3 });
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.map((block) => block.id)).toEqual(["solo", "trio", "duo"]);
  });

  it("updates composition through the section command", () => {
    const store = editor();
    runOfferEditorAction(store, { action: "composition", sectionId: "quantity-offer-1", value: "tier-table" });
    expect(store.getState().document.pages[0].sections.at(-1)?.settings.variant).toBe("tier-table");
  });

  it("binds selection, inputs, keyboard movement and pointer reordering", () => {
    const store = editor();
    const root = new FakeRoot();
    const unbind = bindOfferEditor(root as unknown as HTMLElement, store);
    const common = { sectionId: "quantity-offer-1", blockId: "duo" };

    root.emit("click", offerTarget({ ...common, offerAction: "quantity-up" }));
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.find((block) => block.id === "duo")?.settings.quantity).toBe(3);

    root.emit("change", offerTarget({ ...common, offerSetting: "preselected" }, { type: "radio", checked: true }));
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.filter((block) => block.settings.preselected).map((block) => block.id)).toEqual(["duo"]);

    root.emit("keydown", offerTarget({ ...common, offerTier: "duo" }), { key: "ArrowUp" });
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.map((block) => block.id)).toEqual(["duo", "solo", "trio"]);

    const transfer = { value: "", effectAllowed: "", dropEffect: "", setData(_type: string, value: string) { this.value = value; }, getData() { return this.value; } };
    root.emit("dragstart", offerTarget({ sectionId: "quantity-offer-1", blockId: "duo", offerTier: "duo" }), { dataTransfer: transfer });
    root.emit("drop", offerTarget({ sectionId: "quantity-offer-1", blockId: "trio", offerTier: "trio" }), { dataTransfer: transfer });
    expect(store.getState().document.pages[0].sections.at(-1)?.blocks.map((block) => block.id)).toEqual(["solo", "trio", "duo"]);

    unbind();
    expect([...root.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
  });
});
