import { describe, expect, it } from "vitest";
import { blankDocument } from "../src/lib/catalog";
import { migrateDocument } from "../src/editor/migrate";
import { canvasSrcdoc, parseCanvasMessage, viewportLayout } from "../src/editor/ui/canvas";

describe("editor canvas", () => {
  it("uses intentional desktop tablet and mobile viewport widths", () => {
    expect(viewportLayout("desktop", 1280)).toEqual({ width: 1280, zoom: 1 });
    expect(viewportLayout("tablet", 1280)).toEqual({ width: 834, zoom: 1 });
    expect(viewportLayout("mobile", 1280)).toEqual({ width: 390, zoom: 1 });
    expect(viewportLayout("desktop", 360)).toEqual({ width: 1440, zoom: 0.25 });
    expect(viewportLayout("desktop", 1280).width).toBeGreaterThan(390);
  });

  it("renders the active document and selection in edit mode", () => {
    const document = migrateDocument(blankDocument("Boutique"));
    const selectedId = document.pages[0].sections[1].id;
    const html = canvasSrcdoc(document, { mode: "edit", breakpoint: "desktop", selectedId });
    expect(html).toContain(`data-wf-section-id="${selectedId}"`);
    expect(html).toContain('data-wf-selected="true"');
    expect(html).toContain("canvas:select");
  });

  it("accepts only known same-canvas bridge messages", () => {
    expect(parseCanvasMessage({ source: "weflo-canvas", type: "canvas:select", sectionId: "hero-1" })).toEqual({ type: "select", sectionId: "hero-1" });
    expect(parseCanvasMessage({ source: "foreign", type: "canvas:select", sectionId: "hero-1" })).toBeNull();
    expect(parseCanvasMessage({ source: "weflo-canvas", type: "canvas:select", sectionId: "<bad>" })).toBeNull();
  });
});
