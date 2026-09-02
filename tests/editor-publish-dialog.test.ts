import { describe, expect, it } from "vitest";
import { publishDialogMarkup, publishRequest } from "../src/editor/ui/publish-dialog";

describe("editor publish dialog", () => {
  it("shows hosted publication and Shopify strategies", () => {
    const html = publishDialogMarkup({ pro: true, shopify: { connected: true, shopDomain: "demo.myshopify.com", themes: [{ id: "1", name: "Dawn", role: "main" }] } });
    expect(html).toContain("Page hébergée Weflo");
    expect(html).toContain("Thème actif");
    expect(html).toContain("Copie du thème actif");
    expect(html).toContain("Nouveau thème Weflo");
  });

  it("explains disconnected Shopify without hiding hosted publication", () => {
    const html = publishDialogMarkup({ pro: true, shopify: { connected: false, shopDomain: null, themes: [] } });
    expect(html).toContain("Connecter Shopify");
    expect(html).toContain("Page hébergée Weflo");
  });

  it("builds the selected destination request", () => {
    const body = JSON.parse(String(publishRequest({ destination: "shopify", strategy: "active", themeId: "1", confirmLive: true, expectedVersion: 4 }).body));
    expect(body).toMatchObject({ destination: "shopify", strategy: "active", themeId: "1", confirmLive: true, expectedVersion: 4 });
  });
});
