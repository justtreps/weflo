import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { validateEditorDocument } from "../src/editor/schema";
import { initialDocument } from "../src/lib/catalog";
import type { Page } from "../src/types";

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

  it("returns a controlled error without changing a malformed historical v2 document", async () => {
    const { app, store } = appAs("u1");
    const workspace = await store.createWorkspace({ name: "Corrompue", ownerUserId: "u1" });
    const malformed = { version: 2, pages: [] } as unknown as Page["document"];
    const page = await store.createPage({ workspaceId: workspace.id, name: "Corrompue", slug: "corrompue", type: "sell", status: "draft", document: malformed });
    const before = await store.getPage(page.id);

    const response = await app.request(`/api/pages/${page.id}?documentVersion=2`);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "invalid_stored_document",
      message: "Le contenu de cette page est invalide et ne peut pas être ouvert.",
    });
    expect(await store.getPage(page.id)).toEqual(before);
  });

  it("migrates a valid legacy document on v2 GET without changing stored data", async () => {
    const { app, store } = appAs("u1");
    const workspace = await store.createWorkspace({ name: "Legacy", ownerUserId: "u1" });
    const legacy = initialDocument("Ancienne page", "sell");
    const page = await store.createPage({ workspaceId: workspace.id, name: "Ancienne page", slug: "ancienne-page", type: "sell", status: "draft", document: legacy });

    const response = await app.request(`/api/pages/${page.id}?documentVersion=2`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(validateEditorDocument(body.document)).toMatchObject({ ok: true });
    expect(body.document).toMatchObject({ version: 2, name: "Ancienne page" });
    expect((await store.getPage(page.id))?.document).toEqual(legacy);
  });

  it("rejects duplication of a malformed historical v2 document without creating a copy", async () => {
    const { app, store } = appAs("u1");
    const workspace = await store.createWorkspace({ name: "Corrompue", ownerUserId: "u1" });
    const malformed = { version: 2, pages: [] } as unknown as Page["document"];
    const page = await store.createPage({ workspaceId: workspace.id, name: "Corrompue", slug: "corrompue", type: "sell", status: "draft", document: malformed });

    const response = await app.request(`/api/pages/${page.id}/duplicate`, { method: "POST" });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: "invalid_stored_document" });
    expect((await store.listPages(workspace.id)).map((candidate) => candidate.id)).toEqual([page.id]);
  });

  it("rejects a malformed v2 document patch without persisting it", async () => {
    const { app, store } = appAs("u1");
    const workspace = await store.createWorkspace({ name: "Stable", ownerUserId: "u1" });
    const original = initialDocument("Stable", "sell");
    const page = await store.createPage({ workspaceId: workspace.id, name: "Stable", slug: "stable", type: "sell", status: "draft", document: original });

    const response = await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Should not persist", document: { version: 2, pages: [] } }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid document" });
    expect(await store.getPage(page.id)).toMatchObject({ name: "Stable", document: original, documentVersion: 1 });
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
