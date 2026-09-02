import { describe, expect, it } from "vitest";
import { blankDocument, documentFromModel, initialDocument } from "../src/lib/catalog";
import { canardoControlState, canardoErrorMessage, editorViewForDocument } from "../src/hydrate/editeur-state";

describe("editor state", () => {
  it("closes the picker for model and blank documents", () => {
    expect(editorViewForDocument(documentFromModel("proteo", "Sport"))).toBe("preview");
    expect(editorViewForDocument(blankDocument("Libre"))).toBe("preview");
    expect(editorViewForDocument(initialDocument("Nouveau", "sell"))).toBe("gallery");
  });

  it("maps Canardo failures to visible French messages", () => {
    expect(canardoErrorMessage(402, { error: "credits" })).toMatch(/crédits/i);
    expect(canardoErrorMessage(503, { error: "unavailable" })).toMatch(/configuré/i);
    expect(canardoErrorMessage(400, { error: "catalog" })).toMatch(/conservée/i);
    expect(canardoErrorMessage(0, {})).toMatch(/connexion/i);
  });

  it("keeps the Canardo composer usable when no request is running", () => {
    expect(canardoControlState(false)).toEqual({
      inputDisabled: false,
      ariaBusy: "false",
      ariaDisabled: "false",
      cursor: "pointer",
    });
    expect(canardoControlState(true).inputDisabled).toBe(true);
  });
});
