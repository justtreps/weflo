import { describe, it, expect } from "vitest";
import { renderPage } from "../src/lib/render-page";
import { initialDocument } from "../src/lib/catalog";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

describe("renderPage", () => {
  it("renders known sections and never dumps raw JSON as the page", () => {
    const html = renderPage(initialDocument("Bougie", "sell"));
    expect(html).toMatch(/Bougie/);
    expect(html).toMatch(/<section/);
    expect(html).not.toMatch(/"sections":/);
  });
});

describe("GET /s/:workspace/:page", () => {
  it("404s unknown slugs", async () => {
    const store = new MemoryStore();
    const app = createApp({ store, session: async () => null });
    expect((await app.request("/s/nope/nope")).status).toBe(404);
    const body = await (await app.request("/s/nope/nope")).text();
    expect(body).toMatch(/canard|404|introuvable/i);
  });

  it("serves a hosted page without auth", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "published_hosted", document: initialDocument("Home", "sell"),
    });
    const app = createApp({ store, session: async () => null });
    const res = await app.request(`/s/${ws.slug}/home`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/Home/);
  });
});
