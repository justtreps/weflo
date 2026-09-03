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
    expect(migrated.templateId).toBeNull();
    expect(migrated.templateVersion).toBe(1);
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
    const original = initialDocument("Produit", "sell");
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Produit",
      slug: "produit",
      type: "sell",
      status: "draft",
      document: original,
    });
    const app = createApp({ store, session: async () => ({ id: "u1", email: "user@example.com" }) });

    const legacy = await (await app.request(`/api/pages/${page.id}`)).json();
    const normalized = await (await app.request(`/api/pages/${page.id}?documentVersion=2`)).json();

    expect(legacy.document.version).toBeUndefined();
    expect(normalized.document.version).toBe(2);
    expect(normalized.document.pages[0].sections).toHaveLength(original.sections.length);
    expect((await store.getPage(page.id))?.document).toEqual(page.document);
  });

  it("keeps an already migrated document unchanged on reload", () => {
    const migrated = migrateDocument(initialDocument("Déjà v2", "blank"));
    expect(migrateDocument(migrated)).toEqual(migrated);
  });

  it("preserves provenance on an already structured document", () => {
    const migrated = { ...migrateDocument(initialDocument("Accueil", "sell")), templateId: "home-brand-editorial", templateVersion: 1 };
    expect(migrateDocument(migrated)).toEqual(migrated);
  });

  it("migrates legacy quantity offers without losing text or price fields", () => {
    const document = migrateDocument(initialDocument("Offres", "sell"));
    document.pages[0].sections = [{
      id: "quantity", type: "quantity-offer", name: "Offre quantité", hidden: false, locked: false,
      settings: { product_handle: "serum", quantity_breaks: "1,2,3", variant: "single-duo-trio" }, style: {}, responsive: {}, packVersion: 1,
      blocks: [{ id: "duo", type: "offer", settings: { title: "Duo", text: "Deux sérums", price: "49 €" } }],
    }];

    const migrated = migrateDocument(document);
    const block = migrated.pages[0].sections[0].blocks[0];

    expect(block.type).toBe("offer-tier");
    expect(block.settings).toMatchObject({ title: "Duo", subtitle: "Deux sérums", text: "Deux sérums", price: "49 €", quantity: 1, product_handle: "serum" });
    expect(migrated.pages[0].sections[0].settings.variant).toBe("horizontal-cards");
  });
});
