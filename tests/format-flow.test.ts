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

  it("resolves templates globally and rejects unknown ids", () => {
    expect(templateById("home-brand-editorial").format).toBe("home");
    expect(() => templateById("missing")).toThrow("Unknown creation template");
  });
});
