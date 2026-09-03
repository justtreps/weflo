import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { parseCanvasBridgeMessage } from "../src/editor/ui/canvas-bridge";
import { CANVAS_RUNTIME, keyboardMoveDirection } from "../src/editor/ui/canvas-runtime";
import { blockDropTarget, pointerDropPosition, sectionDropTarget } from "../src/editor/ui/drag-sections";
import { selectionToolbarMarkup } from "../src/editor/ui/selection-overlay";

type RuntimeListener = (event: Record<string, unknown>) => void;

class FakeCanvasElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeCanvasElement[] = [];
  parentElement: FakeCanvasElement | null = null;
  draggable = false;
  tabIndex = -1;
  textContent = "";

  constructor(
    readonly tagName: string,
    readonly dataset: Record<string, string> = {},
    readonly bounds = { top: 0, height: 100 },
  ) {}

  append(...children: FakeCanvasElement[]) {
    children.forEach((child) => { child.parentElement = this; this.children.push(child); });
  }

  prepend(child: FakeCanvasElement) {
    child.parentElement = this;
    this.children.unshift(child);
  }

  private matches(selector: string): boolean {
    if (selector.includes(",")) return selector.split(",").some((part) => this.matches(part.trim()));
    if (/^[a-z]+$/i.test(selector)) return this.tagName.toLowerCase() === selector.toLowerCase();
    if (selector === "[contenteditable=true]") return this.attributes.get("contenteditable") === "true";
    const data = selector.match(/^\[data-([a-z0-9-]+)\]$/i)?.[1];
    if (data) {
      const key = data.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      return this.dataset[key] !== undefined;
    }
    return false;
  }

  closest(selector: string): FakeCanvasElement | null {
    for (let current: FakeCanvasElement | null = this; current; current = current.parentElement) {
      if (current.matches(selector)) return current;
    }
    return null;
  }

  querySelectorAll(selector: string): FakeCanvasElement[] {
    if (selector === ":scope > [data-wf-section-id]") return this.children.filter((child) => child.matches("[data-wf-section-id]"));
    const matches: FakeCanvasElement[] = [];
    const visit = (element: FakeCanvasElement) => {
      element.children.forEach((child) => {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      delete this.dataset[key];
    }
  }

  getBoundingClientRect() {
    return this.bounds;
  }
}

class FakeCanvasDocument {
  readonly body = new FakeCanvasElement("body", { wfMode: "edit" });
  readonly listeners = new Map<string, Array<{ listener: RuntimeListener; capture: boolean }>>();

  querySelectorAll(selector: string) {
    return this.body.querySelectorAll(selector);
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  createElement(tagName: string) {
    return new FakeCanvasElement(tagName);
  }

  addEventListener(type: string, listener: RuntimeListener, capture = false) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ listener, capture });
    this.listeners.set(type, listeners);
  }

  hasCaptureListener(type: string) {
    return this.listeners.get(type)?.some(({ capture }) => capture) ?? false;
  }

  emit(type: string, target: FakeCanvasElement, details: Record<string, unknown> = {}) {
    const event: Record<string, unknown> = {
      target,
      clientY: 0,
      altKey: false,
      key: "",
      defaultPrevented: false,
      preventDefault() { event.defaultPrevented = true; },
      stopPropagation() {},
      ...details,
    };
    this.listeners.get(type)?.forEach(({ listener }) => listener(event));
    return event;
  }
}

function runtimeFixture(...sections: FakeCanvasElement[]) {
  const document = new FakeCanvasDocument();
  document.body.append(...sections);
  const messages: Array<Record<string, unknown>> = [];
  const parent = { postMessage(message: Record<string, unknown>) { messages.push(message); } };
  const script = CANVAS_RUNTIME.slice(CANVAS_RUNTIME.indexOf("<script>") + 8, CANVAS_RUNTIME.lastIndexOf("</script>"));
  new Function("document", "parent", "location", script)(document, parent, { origin: "https://weflo.test" });
  return { document, messages };
}

function dragTransfer() {
  return { writes: 0, effectAllowed: "", dropEffect: "", setData() { this.writes += 1; } };
}

describe("direct canvas manipulation", () => {
  it("marks editable copy and renders contextual section actions", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    const html = renderEditorDocument(document, { mode: "edit", breakpoint: "desktop" });
    expect(html).toContain('data-wf-edit-key="title"');
    expect(selectionToolbarMarkup("hero-1")).toContain('data-canvas-action="duplicate"');
    expect(selectionToolbarMarkup("hero-1")).toContain('data-canvas-action="remove"');
  });

  it("parses inline edit, reorder and toolbar messages", () => {
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:select", sectionId: "hero-1", blockId: "duo" })).toEqual({ type: "select", sectionId: "hero-1", blockId: "duo" });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:inline-edit", sectionId: "hero-1", key: "title", value: "Nouveau titre" })).toEqual({ type: "inlineEdit", sectionId: "hero-1", key: "title", value: "Nouveau titre" });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:move", sectionId: "hero-1", toIndex: 3 })).toEqual({ type: "move", sectionId: "hero-1", toIndex: 3 });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "duo", targetBlockId: "trio", after: true })).toEqual({ type: "blockMove", sectionId: "quantity-offer-1", blockId: "duo", targetBlockId: "trio", after: true });
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:action", sectionId: "hero-1", action: "hide" })).toEqual({ type: "action", sectionId: "hero-1", action: "hide" });
  });

  it("resolves section drops before or after the pointer midpoint", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    document.pages[0].id = "home";
    document.pages[0].sections = document.pages[0].sections.slice(1);
    document.pages[0].sections[1].id = "proof-1";

    expect(pointerDropPosition(149, { top: 100, height: 100 })).toBe("before");
    expect(pointerDropPosition(150, { top: 100, height: 100 })).toBe("after");
    expect(sectionDropTarget(document, "hero-1", "proof-1", false)).toEqual({ pageId: "home", toIndex: 1 });
    expect(sectionDropTarget(document, "hero-1", "proof-1", true)).toEqual({ pageId: "home", toIndex: 2 });
  });

  it("keeps offer-tier drop targets scoped to their parent section", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    document.pages[0].sections.push({
      id: "quantity-offer-1",
      type: "quantity-offer",
      name: "Offre quantité",
      hidden: false,
      locked: false,
      settings: {},
      style: {},
      responsive: {},
      blocks: [
        { id: "solo", type: "offer-tier", settings: {} },
        { id: "duo", type: "offer-tier", settings: {} },
        { id: "trio", type: "offer-tier", settings: {} },
      ],
    });
    document.pages[0].sections.push({
      id: "quantity-offer-2",
      type: "quantity-offer",
      name: "Autre offre",
      hidden: false,
      locked: false,
      settings: {},
      style: {},
      responsive: {},
      blocks: [{ id: "family", type: "offer-tier", settings: {} }],
    });

    expect(blockDropTarget(document, "quantity-offer-1", "solo", "duo", false)).toEqual({ sectionId: "quantity-offer-1", toIndex: 1 });
    expect(blockDropTarget(document, "quantity-offer-1", "solo", "duo", true)).toEqual({ sectionId: "quantity-offer-1", toIndex: 2 });
    expect(blockDropTarget(document, "quantity-offer-1", "solo", "family", false)).toBeNull();
  });

  it("moves only the section or tier that owns keyboard focus", () => {
    expect(keyboardMoveDirection("ArrowUp", true, true)).toBe(-1);
    expect(keyboardMoveDirection("ArrowDown", true, true)).toBe(1);
    expect(keyboardMoveDirection("ArrowUp", false, true)).toBeNull();
    expect(keyboardMoveDirection("ArrowUp", true, false)).toBeNull();
  });

  it("posts pointer and keyboard tier moves by target identity", () => {
    const section = new FakeCanvasElement("section", { wfSectionId: "quantity-offer-1", wfSectionType: "quantity-offer" });
    const solo = new FakeCanvasElement("label", { wfBlockId: "solo" });
    const duo = new FakeCanvasElement("label", { wfBlockId: "duo" });
    section.append(solo, duo);
    const { document, messages } = runtimeFixture(section);
    const transfer = dragTransfer();

    document.emit("pointerdown", solo);
    document.emit("dragstart", solo, { dataTransfer: transfer });
    document.emit("dragover", duo, { clientY: 75, dataTransfer: transfer });
    document.emit("drop", duo, { clientY: 75, dataTransfer: transfer });
    document.emit("keydown", duo, { key: "ArrowUp", altKey: true });

    expect(messages.slice(-2).map(({ type, sectionId, blockId, targetBlockId, after }) => ({ type, sectionId, blockId, targetBlockId, after }))).toEqual([
      { type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "solo", targetBlockId: "duo", after: true },
      { type: "canvas:block-move", sectionId: "quantity-offer-1", blockId: "duo", targetBlockId: "solo", after: false },
    ]);
  });

  it.each([
    ["pointerdown", "input", {}],
    ["mousedown", "button", {}],
    ["pointerdown", "a", {}],
    ["mousedown", "div", { contenteditable: "true" }],
  ])("does not start a tier drag whose %s origin is interactive (%s)", (originEvent, tagName, attributes) => {
    const section = new FakeCanvasElement("section", { wfSectionId: "quantity-offer-1", wfSectionType: "quantity-offer" });
    const tier = new FakeCanvasElement("label", { wfBlockId: "solo" });
    const origin = new FakeCanvasElement(tagName);
    Object.entries(attributes).forEach(([name, value]) => origin.setAttribute(name, value));
    tier.append(origin);
    section.append(tier);
    const { document } = runtimeFixture(section);
    const transfer = dragTransfer();

    document.emit(originEvent, origin);
    const dragstart = document.emit("dragstart", tier, { dataTransfer: transfer });

    expect(document.hasCaptureListener(originEvent)).toBe(true);
    expect(dragstart.defaultPrevented).toBe(true);
    expect(transfer.writes).toBe(0);
    expect(tier.dataset.wfDragging).toBeUndefined();
  });

  it("clears the previous section rail when dragover leaves every section", () => {
    const source = new FakeCanvasElement("section", { wfSectionId: "hero-1", wfSectionType: "hero" });
    const target = new FakeCanvasElement("section", { wfSectionId: "proof-1", wfSectionType: "proof" });
    const outside = new FakeCanvasElement("div");
    const { document } = runtimeFixture(source, target);
    const transfer = dragTransfer();

    document.emit("pointerdown", source);
    document.emit("dragstart", source, { dataTransfer: transfer });
    document.emit("dragover", target, { clientY: 75, dataTransfer: transfer });
    expect(target.dataset.wfDropPosition).toBe("after");

    document.emit("dragover", outside, { clientY: 75, dataTransfer: transfer });
    expect(target.dataset.wfDropPosition).toBeUndefined();
  });

  it("installs edit, drag and selection behavior in the iframe runtime", () => {
    const script = CANVAS_RUNTIME.slice(CANVAS_RUNTIME.indexOf("<script>") + 8, CANVAS_RUNTIME.lastIndexOf("</script>"));
    expect(() => new Function(script)).not.toThrow();
    expect(CANVAS_RUNTIME).toContain("contenteditable");
    expect(CANVAS_RUNTIME).toContain("dragstart");
    expect(CANVAS_RUNTIME).toContain("canvas:inline-edit");
    expect(CANVAS_RUNTIME).toContain("canvas:move");
    expect(CANVAS_RUNTIME).toContain("canvas:block-move");
    expect(CANVAS_RUNTIME).toContain("data-wf-drop-position");
    expect(CANVAS_RUNTIME).toContain("dragend");
    expect(CANVAS_RUNTIME).toContain("canvas:image-edit");
  });

  it("parses a direct image editing request", () => {
    expect(parseCanvasBridgeMessage({ source: "weflo-canvas", type: "canvas:image-edit", sectionId: "hero-1", key: "image" })).toEqual({ type: "imageEdit", sectionId: "hero-1", key: "image" });
  });
});
