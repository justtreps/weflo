import { describe, expect, it } from "vitest";
import { buildModelDocument } from "../src/models/model-manifest";
import { validateCanardoResponse } from "../src/canardo/validate";

describe("Canardo operation protocol", () => {
  const document = buildModelDocument("proteo", "Test");
  const hero = document.pages[0].sections.find((section) => section.type === "productHero")!;

  it("accepts strict serializable editor commands", () => {
    const result = validateCanardoResponse({ message: "Voilà.", summary: "Titre réécrit", commands: [{ type: "updateSetting", sectionId: hero.id, key: "title", value: "Nouveau titre" }] }, document);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown properties, missing targets and unknown section types", () => {
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: [], extra: true }, document).ok).toBe(false);
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: [{ type: "removeSection", sectionId: "missing" }] }, document).ok).toBe(false);
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: [{ type: "insertSection", pageId: document.pages[0].id, index: 0, section: { ...hero, id: "magic-1", type: "magic" } }] }, document).ok).toBe(false);
  });

  it("rejects duplicate ids, unsafe custom code and more than 30 operations", () => {
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: [{ type: "duplicateSection", sectionId: hero.id, newSectionId: hero.id }] }, document).ok).toBe(false);
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: [{ type: "insertSection", pageId: document.pages[0].id, index: 1, section: { ...hero, id: "custom-1", type: "customCode", settings: { html: '<script src="https://bad.test/x.js"></script>', css: "", js: "" } } }] }, document).ok).toBe(false);
    expect(validateCanardoResponse({ message: "x", summary: "x", commands: Array.from({ length: 31 }, () => ({ type: "updateSetting", sectionId: hero.id, key: "title", value: "x" })) }, document).ok).toBe(false);
  });
});
