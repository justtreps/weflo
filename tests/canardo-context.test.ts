import { describe, expect, it } from "vitest";
import { buildCanardoContext } from "../src/canardo/context";
import { CANARDO_SYSTEM_PROMPT } from "../src/canardo/prompt";
import { buildModelDocument } from "../src/models/model-manifest";

describe("Canardo focused context", () => {
  it("contains selection, brand tokens and allowed definitions without secrets", () => {
    const document = buildModelDocument("proteo", "Shop");
    const selected = document.pages[0].sections[2];
    const context = buildCanardoContext(document, selected.id, { connected: true, productCount: 12, token: "secret-token", products: [{ huge: "payload" }] } as never);
    const json = JSON.stringify(context);
    expect(json).toContain(selected.id);
    expect(json).toContain(document.theme.accent);
    expect(json).toContain("productHero");
    expect(json).not.toContain("secret-token");
    expect(json).not.toContain("huge");
    expect(json.length).toBeLessThan(20_000);
  });

  it("instructs the model to return operations and handle vibecode safely", () => {
    expect(CANARDO_SYSTEM_PROMPT).toMatch(/commands/i);
    expect(CANARDO_SYSTEM_PROMPT).toMatch(/customCode|vibecode/i);
    expect(CANARDO_SYSTEM_PROMPT).toMatch(/30/);
    expect(CANARDO_SYSTEM_PROMPT).toMatch(/Shopify.*token/i);
  });
});
