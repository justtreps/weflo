import { describe, expect, it } from "vitest";
import { initialDocument } from "../src/lib/catalog";
import { MemoryStore } from "../src/repos/memory";
import { PageVersionConflictError } from "../src/repos/types";
import { createApp } from "../src/server/app";

async function pageFixture() {
  const store = new MemoryStore();
  const workspace = await store.createWorkspace({ name: "Weflo", ownerUserId: "u1" });
  const page = await store.createPage({
    workspaceId: workspace.id,
    name: "Page",
    slug: "page",
    type: "sell",
    status: "draft",
    document: initialDocument("Page", "sell"),
  });
  return { store, page };
}

describe("page document versions", () => {
  it("increments a matching version and rejects a stale repository write", async () => {
    const { store, page } = await pageFixture();
    expect(page.documentVersion).toBe(1);

    const updated = await store.updatePage(page.id, { name: "Version 2" }, { expectedVersion: 1 });
    expect(updated.documentVersion).toBe(2);

    await expect(store.updatePage(page.id, { name: "Stale" }, { expectedVersion: 1 }))
      .rejects.toBeInstanceOf(PageVersionConflictError);
    expect((await store.getPage(page.id))?.name).toBe("Version 2");
  });

  it("returns HTTP 409 and the server page when an editor save is stale", async () => {
    const { store, page } = await pageFixture();
    const app = createApp({ store, session: async () => ({ id: "u1", email: "user@example.com" }) });

    const first = await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Version 2", expectedVersion: 1 }),
    });
    expect(first.status).toBe(200);
    expect((await first.json()).documentVersion).toBe(2);

    const stale = await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Écrasée", expectedVersion: 1 }),
    });
    expect(stale.status).toBe(409);
    const body = await stale.json();
    expect(body.error).toBe("version_conflict");
    expect(body.serverPage.name).toBe("Version 2");
    expect((await store.getPage(page.id))?.name).toBe("Version 2");
  });
});
