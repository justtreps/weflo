import { describe, expect, it } from "vitest";
import { flowForFormat } from "../src/create/format-flow";
import { renderTemplateGallery } from "../src/create/template-gallery";

describe("creation template gallery", () => {
  it("shows only homepage templates for the homepage flow", () => {
    const html = renderTemplateGallery(flowForFormat("home"), null);

    expect(html).toContain("home-brand-editorial");
    expect(html).toContain("home-catalogue-premium");
    expect(html).toContain("home-story-first");
    expect(html).not.toContain("product-buybox-premium");
  });

  it("renders desktop and mobile previews for each template", () => {
    const html = renderTemplateGallery(flowForFormat("landing"), null);

    expect(html).toContain("previewDesktop");
    expect(html).toContain("previewMobile");
    expect(html).toContain("data-template-preview");
  });

  it("keeps source controls out of the selection gallery", () => {
    const html = renderTemplateGallery(flowForFormat("product"), null);

    expect(html).not.toContain("data-create-source");
  });

  it("links each template to its own format and template id", () => {
    const html = renderTemplateGallery(flowForFormat("landing"), null);

    expect(html).toContain('/creer?format=landing&amp;template=landing-direct-response');
  });
});
