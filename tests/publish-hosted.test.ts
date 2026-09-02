import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("POST /api/pages/:id/publish when Shopify not connected", () => {
  it("returns the Pro paywall without publishing a free workspace", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Home",
      slug: "home",
      type: "sell",
      status: "draft",
      document: initialDocument("Home", "sell"),
    });
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });

    const res = await app.request(`/api/pages/${page.id}/publish`, { method: "POST" });
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ error: "pro_required", upgradeUrl: "/facturation" });
    expect((await store.getPage(page.id))!.status).toBe("draft");
  });

  it("requires Shopify instead of creating a hosted publication", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Home",
      slug: "home",
      type: "sell",
      status: "draft",
      document: initialDocument("Home", "sell"),
    });
    await store.saveWhop({
      workspaceId: ws.id, membershipId: "mem_1", planId: "pro", status: "active",
      manageUrl: null, affiliateId: null,
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });

    const res = await app.request(`/api/pages/${page.id}/publish`, { method: "POST" });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("shopify_required");

    const updated = await store.getPage(page.id);
    expect(updated!.status).toBe("draft");
  });
});
