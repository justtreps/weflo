import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";
import { applyCanardo } from "../src/lib/canardo";

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

describe("POST /api/pages/:id/canardo", () => {
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
});
