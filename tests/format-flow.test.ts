import { describe, expect, it } from "vitest";
import { FORMAT_FLOWS, flowForFormat, templateById } from "../src/create/format-flow";

describe("format flow registry", () => {
  it("gives every non-blank format three compatible templates", () => {
    for (const flow of FORMAT_FLOWS) {
      expect(flow.templates.length).toBe(flow.id === "blank" ? 0 : 3);
      expect(flow.templates.every((template) => template.format === flow.id)).toBe(true);
    }
  });

  it("uses brand inputs instead of product import for a homepage", () => {
    const home = flowForFormat("home");
    expect(home.allowedSources).toEqual(["description", "shopify"]);
    expect(home.intake.map((field) => field.id)).toEqual(["brand", "activity", "promise", "collections", "story"]);
  });

  it("requires a product-backed source for store and product templates", () => {
    expect(flowForFormat("store").allowedSources).toEqual(["link", "image", "shopify"]);
    expect(flowForFormat("product").allowedSources).toEqual(["link", "image", "shopify"]);
  });

  it("resolves templates globally and rejects unknown ids", () => {
    expect(templateById("home-brand-editorial").format).toBe("home");
    expect(() => templateById("missing")).toThrow("Unknown creation template");
  });

  it("keeps template ids stable while localizing their selection names", () => {
    expect([
      ["product-buybox-premium", templateById("product-buybox-premium").name],
      ["product-bundle-first", templateById("product-bundle-first").name],
      ["landing-direct-response", templateById("landing-direct-response").name],
      ["home-brand-editorial", templateById("home-brand-editorial").name],
      ["home-story-first", templateById("home-story-first").name],
    ]).toEqual([
      ["product-buybox-premium", "Fiche produit premium"],
      ["product-bundle-first", "Offre groupée"],
      ["landing-direct-response", "Réponse directe"],
      ["home-brand-editorial", "Éditorial de marque"],
      ["home-story-first", "L’histoire d’abord"],
    ]);
  });
});
