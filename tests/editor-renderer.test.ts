import { describe, expect, it } from "vitest";
import { migrateDocument } from "../src/editor/migrate";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { blankDocument, documentFromModel } from "../src/lib/catalog";
import { renderDocument } from "../src/lib/render-document";

describe("v2 editor renderer", () => {
  it("adds selection metadata only in edit mode", () => {
    const document = migrateDocument(blankDocument("Test"));
    const sectionId = document.pages[0].sections[1].id;
    const edit = renderEditorDocument(document, { mode: "edit", breakpoint: "desktop", selectedId: sectionId });
    const preview = renderEditorDocument(document, { mode: "preview", breakpoint: "desktop", selectedId: sectionId });

    expect(edit).toContain(`data-wf-section-id="${sectionId}"`);
    expect(edit).toContain("data-wf-selected=\"true\"");
    expect(preview).not.toMatch(/<section[^>]*data-wf-selected/);
  });

  it("keeps hidden sections editable but removes them from preview", () => {
    const document = migrateDocument(blankDocument("Test"));
    document.pages[0].sections[1].hidden = true;
    document.pages[0].sections[1].settings.title = "Hidden hero";

    expect(renderEditorDocument(document, { mode: "edit", breakpoint: "desktop" })).toContain("Hidden hero");
    expect(renderEditorDocument(document, { mode: "preview", breakpoint: "desktop" })).not.toContain("Hidden hero");
  });

  it("renders scoped responsive style overrides", () => {
    const document = migrateDocument(blankDocument("Test"));
    const section = document.pages[0].sections[1];
    section.style.paddingTop = 80;
    section.responsive.mobile = { paddingTop: 24, textAlign: "center" };

    const html = renderEditorDocument(document, { mode: "preview", breakpoint: "mobile" });
    expect(html).toContain(`[data-wf-section-id="${section.id}"]{padding-top:80px}`);
    expect(html).toContain(`@media(max-width:700px){[data-wf-section-id="${section.id}"]{padding-top:24px;text-align:center}}`);
  });

  it("renders selected models as real sections instead of a screenshot", () => {
    const html = renderDocument(documentFromModel("peau", "Soin"));
    expect(html).toContain("data-wf-section-id");
    expect(html).toContain("Soin");
    expect(html).not.toContain("wf-reference");
    expect(html).not.toContain("editor-preview-peau-nue-desktop.webp");
  });
});
