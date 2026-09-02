import { describe, expect, it } from "vitest";
import { blankDocument, documentFromModel, initialDocument, needsModelPicker, PAGE_MODELS } from "../src/lib/catalog";

describe("page models", () => {
  it("lists the editor HTML models", () => {
    const names = PAGE_MODELS.map((m) => m.name);
    expect(names).toContain("Compléments du sport");
    expect(names).toContain("Torréfaction de quartier");
    expect(PAGE_MODELS.length).toBeGreaterThanOrEqual(12);
  });

  it("builds a sell document with filled sections from a model", () => {
    const model = PAGE_MODELS.find((m) => m.name === "Compléments du sport");
    expect(model).toBeTruthy();
    const doc = documentFromModel(model!.id, "Ma page");
    expect(needsModelPicker(doc)).toBe(false);
    expect(doc.modelId).toBe(model!.id);
    const hero = doc.sections.find((s) => s.type === "productHero");
    expect(hero?.settings.subtitle).toBeTruthy();
    expect(hero?.settings.price).toBeTruthy();
    expect(hero?.settings.cta_label).toBeTruthy();
    expect(doc.sections.length).toBeGreaterThanOrEqual(8);
  });

  it("asks for a model on a fresh blank or unfilled page", () => {
    expect(needsModelPicker(initialDocument("Page produit", "sell"))).toBe(true);
    expect(needsModelPicker(initialDocument("Accueil", "blank"))).toBe(true);
  });

  it("builds every model with its own visual theme and content", () => {
    const docs = PAGE_MODELS.map((model) => documentFromModel(model.id, model.name));
    expect(new Set(docs.map((doc) => doc.theme?.accent)).size).toBeGreaterThanOrEqual(6);
    expect(
      new Set(
        docs.map(
          (doc) => doc.sections.find((section) => section.type === "productHero")?.settings.text,
        ),
      ).size,
    ).toBe(PAGE_MODELS.length);
    const images = docs.map((doc) => doc.sections.find((section) => section.type === "productHero")?.settings.image);
    expect(new Set(images).size).toBe(PAGE_MODELS.length);
    expect(images.every((image) => String(image).includes("images.unsplash.com"))).toBe(true);
  });

  it("connects every model to its original desktop and mobile captures", () => {
    expect(PAGE_MODELS.every((model) => model.previewDesktop.startsWith("/assets/editor-preview-"))).toBe(true);
    expect(PAGE_MODELS.every((model) => model.previewDesktop.endsWith("-desktop.webp"))).toBe(true);
    expect(PAGE_MODELS.every((model) => model.previewMobile.endsWith("-mobile.webp"))).toBe(true);
    expect(new Set(PAGE_MODELS.map((model) => model.previewDesktop)).size).toBe(PAGE_MODELS.length);
  });

  it("creates a blank document that does not reopen the picker", () => {
    const doc = blankDocument("Nouvelle page");
    expect(doc.modelId).toBe("blank");
    expect(doc.sections.map((section) => section.type)).toEqual(["navigation", "hero", "footer"]);
    expect(needsModelPicker(doc)).toBe(false);
  });
});
