import { describe, expect, it } from "vitest";
import { renderBoutiqueView } from "../src/dashboard/boutique-view";

describe("Shopify boutique view", () => {
  it("renders the disconnected state with the real logo and connection fields", () => {
    const html = renderBoutiqueView({ workspaceName: "Studio", workspaceId: "ws_1", status: "none", shopDomain: null });
    expect(html).toContain('src="/assets/brands/shopify.svg"');
    expect(html).toContain('name="shopDomain"');
    expect(html).toContain('name="token"');
    expect(html).toContain("Connecter Shopify");
  });

  it("renders connected and invalid states explicitly", () => {
    expect(renderBoutiqueView({ workspaceName: "Studio", workspaceId: "ws_1", status: "connected", shopDomain: "shop.myshopify.com" })).toContain("Boutique connectée");
    expect(renderBoutiqueView({ workspaceName: "Studio", workspaceId: "ws_1", status: "invalid", shopDomain: "shop.myshopify.com" })).toContain("Connexion à vérifier");
  });
});
