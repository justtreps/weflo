import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { PAGE_MODELS, documentFromModel, initialDocument } from "../src/lib/catalog";
import { documentForModel, migrateDocument } from "../src/editor/migrate";

describe("legacy editor document migration", () => {
  it("converts a current structured page without losing its content", () => {
    const legacy = initialDocument("Accueil", "sell");
    legacy.sections[1].settings = { title: "Produit phare", price: "49 €", enabled: true };

    const migrated = migrateDocument(legacy, "product");

    expect(migrated.version).toBe(2);
    expect(migrated.name).toBe("Accueil");
    expect(migrated.pages[0].sections[1].settings).toEqual({ title: "Produit phare", price: "49 €", enabled: true });
    expect(migrated.pages[0].sections.map((section) => section.type)).toEqual(legacy.sections.map((section) => section.type));
  });

  it("builds all gallery models as structured v2 documents", () => {
    expect(PAGE_MODELS).toHaveLength(18);
    for (const model of PAGE_MODELS) {
      const migrated = migrateDocument(documentFromModel(model.id, model.name), "product");
      const direct = documentForModel(model.id, model.name);
      expect(migrated.version).toBe(2);
      expect(direct.modelId).toBe(model.id);
      expect(direct.pages[0].sections.length).toBeGreaterThan(2);
      expect(JSON.stringify(direct)).not.toContain("referencePreviews");
    }
  });

  it("returns a normalized document only when the v2 API format is requested", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "Weflo", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Produit",
      slug: "produit",
      type: "sell",
      status: "draft",
      document: initialDocument("Produit", "sell"),
    });
    const app = createApp({ store, session: async () => ({ id: "u1", email: "user@example.com" }) });

    const legacy = await (await app.request(`/api/pages/${page.id}`)).json();
    const normalized = await (await app.request(`/api/pages/${page.id}?documentVersion=2`)).json();

    expect(legacy.document.version).toBeUndefined();
    expect(normalized.document.version).toBe(2);
    expect(normalized.document.pages[0].sections).toHaveLength(page.document.sections.length);
    expect((await store.getPage(page.id))?.document).toEqual(page.document);
  });
});
