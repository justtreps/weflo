import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";
import { applyCanardo, CANARDO_SYSTEM, isReferralPrompt, refuseReferralHelp } from "../src/lib/canardo";

describe("applyCanardo", () => {
  it("rejects unknown section types from the model", () => {
    const doc = initialDocument("Home", "sell");
    expect(() =>
      applyCanardo(doc, {
        message: "ok",
        document: { ...doc, sections: [{ id: "x", type: "magic" as never, settings: {} }] },
      }),
    ).toThrow(/catalog/i);
  });
});

describe("Canardo e-commerce prompt", () => {
  it("describes a Weflo page assistant and refuses referral help", () => {
    expect(CANARDO_SYSTEM).toMatch(/Weflo/i);
    expect(CANARDO_SYSTEM).toMatch(/PageDocument/);
    expect(CANARDO_SYSTEM).toMatch(/SECTION_TYPES|types de sections/i);
    expect(CANARDO_SYSTEM).toMatch(/parrainage|filleul/i);
    expect(CANARDO_SYSTEM).toMatch(/JSON \{\s*message,\s*document\s*\}/);
  });

  it("detects referral prompts", () => {
    expect(isReferralPrompt("combien gagnent mes filleuls")).toBe(true);
    expect(isReferralPrompt("aide-moi sur le parrainage")).toBe(true);
    expect(isReferralPrompt("réécris le hero produit")).toBe(false);
  });

  it("refuses referral help without changing the document", () => {
    const doc = initialDocument("Home", "sell");
    const refused = refuseReferralHelp("montre mes filleuls", doc);
    expect(refused).toBeTruthy();
    expect(refused!.document).toBe(doc);
    expect(refused!.message).toMatch(/pages/i);
    expect(refused!.message).not.toMatch(/filleul/i);
    expect(refuseReferralHelp("change le titre", doc)).toBeNull();
  });
});

describe("POST /api/pages/:id/canardo", () => {
  it("rejects an empty prompt with an actionable message", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => { throw new Error("should not call"); } },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "prompt", message: expect.any(String) });
  });

  it("explains when Canardo is not configured", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "crée une page" }),
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "unavailable", message: expect.stringMatching(/configuré/i) });
  });

  it("returns 402 when credits are empty", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveCredits({
      workspaceId: ws.id, monthlyRemaining: 0, purchasedRemaining: 0,
      monthlyResetAt: new Date().toISOString(),
    });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => { throw new Error("should not call"); } },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "change le titre" }),
    });
    expect(res.status).toBe(402);
  });

  it("saves the new document and decrements credits", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const next = initialDocument("Home", "sell");
    next.sections[1].settings.title = "Des bougies coulées à Nantes";
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => ({ message: "Fait.", document: next }) },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "réécris le titre" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Fait.");
    expect((await store.getPage(page.id))!.document.sections[1].settings.title).toMatch(/Nantes/);
    expect((await store.getCredits(ws.id)).monthlyRemaining).toBeLessThan(40);
  });

  it("refuses referral prompts without calling the model or spending credits", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const before = (await store.getCredits(ws.id)).monthlyRemaining;
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => { throw new Error("should not call"); } },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "combien rapportent mes filleuls" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/pages/i);
    expect(body.message).not.toMatch(/filleul/i);
    expect((await store.getPage(page.id))!.document).toEqual(page.document);
    expect((await store.getCredits(ws.id)).monthlyRemaining).toBe(before);
  });
});
