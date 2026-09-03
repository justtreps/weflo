import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { creationWorkspaceUrl } from "../src/create/workspace";

describe("creation hydration URL state", () => {
  it("keeps only supported creation-state values through format and template selection", () => {
    expect(creationWorkspaceUrl("landing", "landing-direct-response", { source: "description", prompt: "une lampe murale" })).toBe("/creer?format=landing&template=landing-direct-response&source=description&prompt=une+lampe+murale");
    expect(creationWorkspaceUrl("landing", null, { source: "credential", prompt: "une lampe murale" })).toBe("/creer?format=landing&prompt=une+lampe+murale");
  });

  it("uses the safe URL builder for hydrated format, back, and dialog transitions", () => {
    const source = readFileSync("src/hydrate/creer.ts", "utf8");

    expect(source).toContain("creationWorkspaceUrl(format, null, { source, prompt })");
    expect(source).toContain("creationWorkspaceUrl(format, id, { source, prompt })");
  });

  it("ships the gallery and URL transitions in the browser bundle", () => {
    const bundle = readFileSync("public/hydrate/creer.js", "utf8");

    expect(bundle).toContain("data-template-open");
    expect(bundle).toContain("creationWorkspaceUrl");
  });
});
