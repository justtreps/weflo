import { describe, expect, it } from "vitest";
import { PAGE_MODELS } from "../src/lib/catalog";
import { galleryItems, renderGalleryMarkup } from "../src/hydrate/editor-gallery";

describe("editor model gallery", () => {
  it("returns the blank card followed by all catalog models", () => {
    const items = galleryItems("Tout");
    expect(items[0].id).toBe("blank");
    expect(items).toHaveLength(PAGE_MODELS.length + 1);
  });

  it("filters models without removing the blank-page choice", () => {
    const items = galleryItems("Beauté & soin");
    expect(items[0].id).toBe("blank");
    expect(items.slice(1).every((item) => item.theme === "Beauté & soin")).toBe(true);
  });

  it("renders every model as a live document preview without depending on missing capture files", () => {
    const html = renderGalleryMarkup(galleryItems("Nutrition"));
    expect(html).toContain('data-model-id="blank"');
    expect(html).toContain('data-model-id="graine"');
    expect(html).toContain('data-model-preview="blank"');
    expect(html).toContain('data-model-preview="graine"');
    expect(html).not.toContain('/assets/editor-preview-');
    expect(html).not.toContain('<img');
  });
});
