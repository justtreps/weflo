import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { applyWhopEvent } from "../src/lib/whop";

describe("applyWhopEvent", () => {
  it("activates membership only on membership.activated", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await applyWhopEvent(store, {
      type: "payment.succeeded",
      data: { metadata: { workspace_id: ws.id, kind: "subscription" }, member: { id: "mem_1" } },
    });
    expect((await store.getWhop(ws.id))?.status).not.toBe("active");

    await applyWhopEvent(store, {
      type: "membership.activated",
      data: {
        id: "mber_1",
        plan_id: "plan_pro",
        manage_url: "https://whop.com/billing/manage/mber_1",
        metadata: { workspace_id: ws.id, kind: "subscription" },
      },
    });
    expect((await store.getWhop(ws.id))?.status).toBe("active");
  });

  it("adds purchased credits on one-time payment and ignores unsigned-equivalent bad events", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const before = await store.getCredits(ws.id);
    await applyWhopEvent(store, {
      type: "payment.succeeded",
      data: { metadata: { workspace_id: ws.id, kind: "credits", credits: 100 } },
    });
    expect((await store.getCredits(ws.id)).purchasedRemaining).toBe(before.purchasedRemaining + 100);
  });
});

describe("billing routes", () => {
  it("returns the workspace id required for direct checkout", async () => {
    const store = new MemoryStore();
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });
    const body = await (await app.request("/api/billing")).json() as { workspace?: { id?: string } };
    expect(body.workspace?.id).toMatch(/^ws_/);
  });

  it("does not activate a plan on checkout click", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      publicAppUrl: "https://weflo.example",
      whop: {
        createCheckout: async () => ({ purchaseUrl: "https://whop.com/checkout/ch_1" }),
        verifyWebhook: () => { throw new Error("bad sig"); },
      },
    });
    const res = await app.request("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, kind: "subscription", planId: "plan_pro" }),
    });
    expect((await res.json()).url).toMatch(/whop.com/);
    expect((await store.getWhop(ws.id))?.status ?? "none").not.toBe("active");
  });

  it("rejects webhook with bad signature and does not change credits", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const before = await store.getCredits(ws.id);
    const app = createApp({
      store,
      session: async () => null,
      whop: { createCheckout: async () => ({ purchaseUrl: "x" }), verifyWebhook: () => { throw new Error("bad sig"); } },
    });
    const res = await app.request("/api/billing/whop/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "payment.succeeded", data: { metadata: { workspace_id: ws.id, kind: "credits", credits: 50 } } }),
    });
    expect(res.status).toBe(400);
    expect((await store.getCredits(ws.id)).purchasedRemaining).toBe(before.purchasedRemaining);
  });
});
