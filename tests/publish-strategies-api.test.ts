import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { buildModelDocument } from "../src/models/model-manifest";

async function fixture(pro = true, connected = true) {
  const store = new MemoryStore();
  const workspace = await store.createWorkspace({ name: "Shop", ownerUserId: "u1" });
  if (pro) await store.saveWhop({ workspaceId: workspace.id, membershipId: "m", planId: "pro", status: "active", manageUrl: null, affiliateId: null });
  if (connected) await store.saveShopify({ workspaceId: workspace.id, shopDomain: "demo.myshopify.com", tokenEncrypted: "token", status: "connected" });
  const document = buildModelDocument("proteo", "Shop");
  const page = await store.createPage({ workspaceId: workspace.id, name: "Shop", slug: "shop", type: "sell", status: "draft", document: document as never });
  return { store, workspace, page };
}

describe("publication strategies API", () => {
  it("keeps publication Pro-only", async () => {
    const { store, page } = await fixture(false, false);
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });
    expect((await app.request(`/api/pages/${page.id}/publish`, { method: "POST" })).status).toBe(402);
  });

  it("returns Shopify destination options without exposing credentials", async () => {
    const { store, page } = await fixture();
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }), shopify: { ping: async () => {}, publish: async () => ({ themeId: "x", productId: "y" }), rollback: async () => {}, listThemes: async () => [{ id: "1", name: "Dawn", role: "main" }] } });
    const response = await app.request(`/api/pages/${page.id}/publish-options`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.shopify.themes[0]).toMatchObject({ name: "Dawn", role: "main" });
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("requires explicit confirmation for the active theme", async () => {
    const { store, page } = await fixture();
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });
    const response = await app.request(`/api/pages/${page.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: "shopify", strategy: "active" }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "live_confirmation_required" });
  });

  it("passes the chosen strategy and theme to the Shopify publisher", async () => {
    const { store, page } = await fixture();
    let received: Record<string, unknown> = {};
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }), shopify: { ping: async () => {}, publish: async () => ({ themeId: "x", productId: "y" }), rollback: async () => {}, publishEditor: async (input) => { received = input; return { themeId: "1", previewUrl: "https://demo.myshopify.com/?preview_theme_id=1" }; } } });
    const response = await app.request(`/api/pages/${page.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: "shopify", strategy: "active", themeId: "1", confirmLive: true, expectedVersion: page.documentVersion }) });
    expect(response.status).toBe(200);
    expect(received).toMatchObject({ strategy: "active", themeId: "1" });
    expect(await response.json()).toMatchObject({ shopify: "published", shopifyPreviewUrl: expect.stringContaining("preview_theme_id=1") });
  });
});
