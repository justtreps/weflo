import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("Shopify connect and publish", () => {
  it("stores connected without echoing the token", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      shopify: { ping: async () => {}, publish: async () => ({ themeId: "1", productId: "2" }), rollback: async () => {} },
      encryptionKey: "0".repeat(64),
    });
    const res = await app.request("/api/shopify/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", token: "shpat_abc" }),
    });
    const body = await res.json();
    expect(body.status).toBe("connected");
    expect(JSON.stringify(body)).not.toMatch(/shpat_/);
    expect((await store.getShopify(ws.id))!.tokenEncrypted).not.toContain("shpat_abc");
  });

  it("marks invalid and does not publish when ping fails", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      shopify: { ping: async () => { throw new Error("bad token"); }, publish: async () => { throw new Error("no"); }, rollback: async () => {} },
      encryptionKey: "0".repeat(64),
    });
    const res = await app.request("/api/shopify/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", token: "shpat_bad" }),
    });
    expect(res.status).toBe(400);
    expect((await store.getShopify(ws.id))!.status).toBe("invalid");
  });

  it("rolls back and stays hosted when publish throws mid-way", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveShopify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", tokenEncrypted: "enc", status: "connected" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    let rolled = false;
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      encryptionKey: "0".repeat(64),
      shopify: {
        ping: async () => {},
        publish: async () => { throw new Error("product failed"); },
        rollback: async () => { rolled = true; },
      },
    });
    const res = await app.request(`/api/pages/${page.id}/publish`, { method: "POST" });
    expect(res.status).toBe(502);
    expect(rolled).toBe(true);
    expect((await store.getPage(page.id))!.status).toBe("published_hosted");
    expect((await res.json()).shopify).toBe("failed");
  });
});
