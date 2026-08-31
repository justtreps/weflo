import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("PATCH page document", () => {
  it("persists section settings", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const doc = { ...page.document, name: "Home 2" };
    const res = await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: doc, name: "Home 2" }),
    });
    expect(res.status).toBe(200);
    expect((await store.getPage(page.id))!.document.name).toBe("Home 2");
  });
});

describe("GET page by id", () => {
  it("returns the page if member", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request(`/api/pages/${page.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(page.id);
    expect(body.name).toBe("Home");
    expect(body.slug).toBe("home");
    expect(body.document.name).toBe("Home");
  });

  it("rejects anonymous", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({ store, session: async () => null });
    expect((await app.request(`/api/pages/${page.id}`)).status).toBe(401);
  });
});
