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

  it("renders cards with stable model ids and the original model captures", () => {
    const html = renderGalleryMarkup(galleryItems("Nutrition"));
    expect(html).toContain('data-model-id="blank"');
    expect(html).toContain('data-model-id="graine"');
    expect(html).toContain('src="/assets/editor-preview-graine-cie-desktop.webp"');
    expect(html).toContain('data-preview-mobile="/assets/editor-preview-graine-cie-mobile.webp"');
    expect(html).not.toContain("Aperçu indisponible");
  });
});
