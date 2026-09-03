import { describe, expect, it } from "vitest";
import { creationActionUrl, creationFormats, creationWorkspaceUrl, renderCreateWorkspace, sourceForFormat } from "../src/create/workspace";
import { readFileSync } from "node:fs";

describe("connected creation workspace", () => {
  it("routes dashboard imports to the connected workspace instead of public onboarding", () => {
    expect(creationActionUrl("link")).toBe("/creer?source=link");
    expect(creationActionUrl("image")).toBe("/creer?source=image");
    expect(creationActionUrl("generate", "une lampe murale")).toBe("/creer?source=description&prompt=une%20lampe%20murale");
    expect(creationActionUrl("blank")).toBe("/creer?format=blank");
  });

  it("restores every professional page format in French", () => {
    expect(creationFormats.map((format) => format.id)).toEqual([
      "store", "product", "landing", "advertorial", "quiz", "home", "blog", "blank",
    ]);
    const html = renderCreateWorkspace({ workspaceName: "Studio", selectedFormat: null, selectedTemplateId: null, source: null, prompt: "", answers: {} });
    for (const label of ["Boutique complète", "Page produit", "Landing page", "Advertorial", "Quiz et funnel", "Page d’accueil", "Article de blog", "Page vierge"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('data-create-format="advertorial"');
    expect(html).toContain('data-create-format="quiz"');
  });

  it("loads the connected workspace stylesheet", () => {
    expect(readFileSync("public/creer.html", "utf8")).toContain('href="/hydrate/creer.css"');
  });

  it("shows the template gallery before the format intake and resumes intake after selection", () => {
    const gallery = renderCreateWorkspace({ workspaceName: "Studio", selectedFormat: "landing", selectedTemplateId: null, source: "description", prompt: "une lampe", answers: {} });
    const intake = renderCreateWorkspace({ workspaceName: "Studio", selectedFormat: "landing", selectedTemplateId: "landing-direct-response", source: null, prompt: "", answers: {} });

    expect(gallery).toContain('data-template-preview="landing-direct-response"');
    expect(gallery).not.toContain('data-create-source="description"');
    expect(gallery).toContain('/creer?format=landing&amp;template=landing-direct-response&amp;source=description&amp;prompt=une+lampe');
    expect(intake).toContain('data-create-source="description"');
    expect(intake).toContain('name="answers[campaign]"');
  });

  it("rejects a product-link source for home while retaining valid product sources", () => {
    expect(sourceForFormat("home", "link")).toBe("description");
    expect(sourceForFormat("product", "link")).toBe("link");
    expect(creationWorkspaceUrl("home", "home-brand-editorial", { source: "link", prompt: "" })).toBe("/creer?format=home&template=home-brand-editorial&source=description");
  });
});
