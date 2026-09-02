import { describe, expect, it } from "vitest";
import { creationActionUrl, creationFormats, renderCreateWorkspace } from "../src/create/workspace";
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
    const html = renderCreateWorkspace({ workspaceName: "Studio", selectedFormat: null, source: null, prompt: "" });
    for (const label of ["Boutique complète", "Page produit", "Landing page", "Advertorial", "Quiz et funnel", "Page d’accueil", "Article de blog", "Page vierge"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('data-create-format="advertorial"');
    expect(html).toContain('data-create-format="quiz"');
  });

  it("loads the connected workspace stylesheet", () => {
    expect(readFileSync("public/creer.html", "utf8")).toContain('href="/hydrate/creer.css"');
  });
});
