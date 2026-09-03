import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { validateEditorDocument } from "../src/editor/schema";
import { initialDocument } from "../src/lib/catalog";

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
    expect(page.document.version).toBe(2);
    expect(validateEditorDocument(page.document)).toMatchObject({ ok: true });

    const list = await app.request("/api/pages");
    const body = await list.json();
    expect(body.pages).toHaveLength(1);
    expect(body.workspace.name).toBeTruthy();
  });

  it("compiles description creation through the selected template recipe", async () => {
    const { app } = appAs("u1");
    const created = await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "sell",
        name: "Aube",
        creationFormat: "home",
        templateId: "home-story-first",
        answers: { brand: "Aube", activity: "Maison", promise: "Habiter plus doucement", collections: "Linge\nLumière", story: "Créée à Lyon" },
      }),
    });
    expect(created.status).toBe(201);
    const page = await created.json();
    expect(page.document.templateId).toBe("home-story-first");
    expect(page.document.pages[0].sections.map((section: { type: string }) => section.type)).toEqual([
      "navigation", "hero", "richText", "imageText", "press", "collectionGrid", "newsletter", "footer",
    ]);
    expect(validateEditorDocument(page.document)).toMatchObject({ ok: true });
  });

  it("creates a genuinely empty structured blank page", async () => {
    const { app } = appAs("u1");
    const page = await (await app.request("/api/pages", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "blank", name: "Libre", creationFormat: "blank", templateId: null, answers: {} }),
    })).json();
    expect(page.document.version).toBe(2);
    expect(page.document.pages[0].sections).toEqual([]);
    expect(validateEditorDocument(page.document)).toMatchObject({ ok: true });
  });

  it.each([
    [{ type: "sell", creationFormat: "home", templateId: "" }, "invalid template"],
    [{ type: "sell", creationFormat: "home", templateId: 42 }, "invalid template"],
    [{ type: "sell", creationFormat: "home", templateId: null }, "invalid template"],
    [{ type: "write", creationFormat: "home", templateId: "home-brand-editorial" }, "incompatible type"],
    [{ type: "sell", creationFormat: "home", templateId: "blog-guide" }, "invalid template"],
  ])("rejects malformed or incompatible structured creation input %#", async (input, error) => {
    const { app } = appAs("u1");
    const response = await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Invalide", ...input }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error });
  });

  it("migrates and validates a legacy document before duplicating it", async () => {
    const { app, store } = appAs("u1");
    const workspace = await store.createWorkspace({ name: "Legacy", ownerUserId: "u1" });
    const legacy = await store.createPage({
      workspaceId: workspace.id,
      name: "Ancienne page",
      slug: "ancienne-page",
      type: "sell",
      status: "draft",
      document: initialDocument("Ancienne page", "sell"),
    });

    const response = await app.request(`/api/pages/${legacy.id}/duplicate`, { method: "POST" });
    const copy = await response.json();

    expect(response.status).toBe(201);
    expect(copy.document.version).toBe(2);
    expect(validateEditorDocument(copy.document)).toMatchObject({ ok: true });
    expect((await store.getPage(copy.id))?.document).toEqual(copy.document);
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
