import { describe, expect, it } from "vitest";
import { flowForFormat } from "../src/create/format-flow";
import { renderFormatIntake, validateFormatIntake } from "../src/create/format-intake";

describe("format-specific intake", () => {
  it("does not ask a homepage to import a product", () => {
    const html = renderFormatIntake(flowForFormat("home"), {}, null);
    expect(html).toContain("Nom de la marque");
    expect(html).toContain("Collections principales");
    expect(html).not.toContain("Amazon");
    expect(html).not.toContain("Ajouter une image");
  });

  it("uses answer names and preserves entered values", () => {
    const html = renderFormatIntake(flowForFormat("home"), { brand: "Atelier & Fils" }, null);

    expect(html).toContain('name="answers[brand]"');
    expect(html).toContain('value="Atelier &amp; Fils"');
  });

  it("keeps product sources on a product page", () => {
    const html = renderFormatIntake(flowForFormat("product"), {}, null);
    expect(html).toContain("Importer un lien");
    expect(html).toContain("Ajouter une image");
    expect(html).toContain("Depuis Shopify");
  });

  it("returns exact missing required fields", () => {
    expect(validateFormatIntake(flowForFormat("quiz"), {})).toEqual(["objective", "segments", "result"]);
    expect(validateFormatIntake(flowForFormat("quiz"), { objective: "  ", segments: "peau sèche", result: "routine" })).toEqual(["objective"]);
  });

  it("shows field errors without discarding submitted values", () => {
    const flow = flowForFormat("quiz");
    const answers = { segments: "Peaux sèches", result: "Une routine adaptée" };
    const html = renderFormatIntake(flow, answers, null, {
      missingFieldIds: validateFormatIntake(flow, answers),
      prompt: "Conserver cette précision",
    });

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Ce champ est obligatoire.");
    expect(html).toContain("Peaux sèches");
    expect(html).toContain("Conserver cette précision");
  });
});
