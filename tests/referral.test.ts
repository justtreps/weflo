import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { assertReferralAllowed } from "../src/lib/whop";

describe("assertReferralAllowed", () => {
  it("blocks self-referral", () => {
    expect(() => assertReferralAllowed("ws1", "ws1")).toThrow(/self/i);
  });
});

describe("GET /r/:code", () => {
  it("redirects to Whop checkout with affiliate query", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveWhop({
      workspaceId: ws.id, membershipId: null, planId: null, status: "none",
      manageUrl: null, affiliateId: "aff_1",
    });
    const app = createApp({
      store,
      session: async () => null,
      publicAppUrl: "https://weflo.example",
      whop: {
        createCheckout: async ({ affiliateCode }) => ({
          purchaseUrl: `https://whop.com/checkout/plan_pro?a=${affiliateCode ?? ""}`,
        }),
        verifyWebhook: () => ({ type: "noop", data: {} }),
        createAffiliate: async () => ({ affiliateId: "aff_1" }),
        affiliateStats: async () => ({ earningsUsd: "0.00", referrals: 0, clicks: 0 }),
      },
    });
    const res = await app.request(`/r/${ws.slug}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/[?&]a=/);
  });
});

describe("attribution", () => {
  it("stores a single attribution and rejects a second", async () => {
    const store = new MemoryStore();
    const a = await store.createWorkspace({ name: "A", ownerUserId: "u1" });
    const b = await store.createWorkspace({ name: "B", ownerUserId: "u2" });
    const app = createApp({
      store,
      session: async () => ({ id: "u2", email: "b@x.test" }),
    });
    const first = await app.request("/api/referral/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: a.slug }),
    });
    expect(first.status).toBe(200);
    const second = await app.request("/api/referral/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: a.slug }),
    });
    expect(second.status).toBe(409);
  });
});
