import { describe, it, expect } from "vitest";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("MemoryStore pages", () => {
  it("creates a workspace for the owner and isolates pages", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    expect(ws.slug.length).toBeGreaterThan(0);
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Home",
      slug: "home",
      type: "sell",
      status: "draft",
      document: initialDocument("Home", "sell"),
    });
    expect((await store.listPages(ws.id)).map((p) => p.id)).toEqual([page.id]);
    await expect(store.assertMember("u2", ws.id)).rejects.toThrow(/forbidden/i);
  });

  it("duplicates by creating a second page with copied document", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const a = await store.createPage({
      workspaceId: ws.id, name: "A", slug: "a", type: "sell", status: "draft",
      document: initialDocument("A", "sell"),
    });
    const b = await store.createPage({
      workspaceId: ws.id, name: "A copy", slug: "a-copy", type: a.type, status: "draft",
      document: a.document,
    });
    expect(b.id).not.toBe(a.id);
    expect(b.document).toEqual(a.document);
  });
});
