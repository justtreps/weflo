import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

function appAs(userId: string | null) {
  const store = new MemoryStore();
  const app = createApp({
    store,
    session: async () => (userId ? { id: userId, email: `${userId}@x.test` } : null),
  });
  return { app, store };
}

describe("pages API", () => {
  it("rejects anonymous", async () => {
    const { app } = appAs(null);
    expect((await app.request("/api/pages")).status).toBe(401);
  });

  it("bootstraps a workspace and creates a sell page", async () => {
    const { app } = appAs("u1");
    const created = await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "sell", name: "Produit" }),
    });
    expect(created.status).toBe(201);
    const page = await created.json();
    expect(page.type).toBe("sell");
    expect(page.document.sections.some((s: { type: string }) => s.type === "productHero")).toBe(true);

    const list = await app.request("/api/pages");
    const body = await list.json();
    expect(body.pages).toHaveLength(1);
    expect(body.workspace.name).toBeTruthy();
  });

  it("renames, duplicates, deletes", async () => {
    const { app } = appAs("u1");
    const page = await (await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "blank", name: "X" }),
    })).json();

    const renamed = await (await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Y" }),
    })).json();
    expect(renamed.name).toBe("Y");

    const dup = await app.request(`/api/pages/${page.id}/duplicate`, { method: "POST" });
    expect(dup.status).toBe(201);

    expect((await app.request(`/api/pages/${page.id}`, { method: "DELETE" })).status).toBe(204);
    const list = await (await app.request("/api/pages")).json();
    expect(list.pages).toHaveLength(1);
    expect(list.pages[0].name).toMatch(/copy|copie|Y/i);
  });
});
