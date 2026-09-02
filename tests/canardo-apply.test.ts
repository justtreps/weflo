import { describe, expect, it } from "vitest";
import { applyCanardoOperations } from "../src/canardo/apply";
import { buildModelDocument } from "../src/models/model-manifest";

describe("atomic Canardo operations", () => {
  it("applies a valid response and returns a one-step inverse", () => {
    const document = buildModelDocument("proteo", "Shop");
    const target = document.pages[0].sections[2];
    const result = applyCanardoOperations(document, { message: "Fait", summary: "Titre", commands: [{ type: "updateSetting", sectionId: target.id, key: "title", value: "Nouveau" }] });
    expect(result.document.pages[0].sections[2].settings.title).toBe("Nouveau");
    expect(result.inverseCommands).toHaveLength(1);
    expect(result.inverseCommands[0].type).toBe("restoreDocument");
  });

  it("does not mutate the source when a later operation is invalid", () => {
    const document = buildModelDocument("proteo", "Shop");
    const before = structuredClone(document);
    const target = document.pages[0].sections[2];
    expect(() => applyCanardoOperations(document, { message: "x", summary: "x", commands: [{ type: "updateSetting", sectionId: target.id, key: "title", value: "Changed" }, { type: "removeSection", sectionId: "missing" }] })).toThrow();
    expect(document).toEqual(before);
  });
});
