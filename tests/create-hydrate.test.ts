import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { creationWorkspaceUrl } from "../src/create/workspace";

describe("creation hydration URL state", () => {
  it("keeps only supported creation-state values through format and template selection", () => {
    expect(creationWorkspaceUrl("landing", "landing-direct-response", { source: "description", prompt: "une lampe murale" })).toBe("/creer?format=landing&template=landing-direct-response&source=description&prompt=une+lampe+murale");
    expect(creationWorkspaceUrl("landing", null, { source: "credential", prompt: "une lampe murale" })).toBe("/creer?format=landing&prompt=une+lampe+murale");
  });

  it("routes hydrated transitions through the persistent state and safe URL builder", () => {
    const source = readFileSync("src/hydrate/creer.ts", "utf8");

    expect(source).toContain('const CREATION_DRAFT_KEY = "weflo-create-draft-v2"');
    expect(source).toContain("transitionCreationFlow(state");
    expect(source).toContain("creationWorkspaceUrl(state.format, state.templateId");
    expect(source).toContain("mergeCompatibleCreationDraft(initialCreationState(url),readSavedState(),url)");
  });

  it("ships the gallery and URL transitions in the browser bundle", () => {
    const bundle = readFileSync("public/hydrate/creer.js", "utf8");

    expect(bundle).toContain("data-template-open");
    expect(bundle).toContain("creationWorkspaceUrl");
  });
});
