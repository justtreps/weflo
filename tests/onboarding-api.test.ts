import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import type { ImportedProduct } from "../src/onboarding/types";

const product: ImportedProduct = {
  sourceUrl: "https://example.com/products/lamp", title: "Magnetic Lamp", description: "A wireless wall lamp", vendor: "Lamp Co", currency: "EUR", price: 49, compareAtPrice: 69,
  images: ["https://cdn.example/lamp.jpg"], variants: [{ id: "black", title: "Black", price: 49 }], rating: null, reviewCount: null, reviews: [],
};

describe("anonymous onboarding API", () => {
  it("imports, personalises, builds and claims a store", async () => {
    const store = new MemoryStore();
    const app = createApp({
      store,
      session: async () => ({ id: "user-1", email: "owner@example.com" }),
      productFetch: { fetch: async () => ({ finalUrl: product.sourceUrl, html: `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: product.title, description: product.description, brand: { name: product.vendor }, image: product.images, offers: { price: product.price, priceCurrency: product.currency } })}</script>` }) },
    });
    const imported = await app.request("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: product.sourceUrl, language: "fr" }) });
    expect(imported.status).toBe(201);
    const importedBody = await imported.json();
    expect(importedBody.claimToken).toBeTruthy();
    expect(importedBody.draft.product.title).toBe(product.title);
    expect(importedBody.draft.personas).toHaveLength(4);

    const headers = { "content-type": "application/json", "x-weflo-claim-token": importedBody.claimToken };
    const changed = await app.request(`/api/onboarding/${importedBody.draft.id}`, { method: "PATCH", headers, body: JSON.stringify({ brandName: "LumiWall", modelId: "proteo", creationFormat: "product", templateId: "product-bundle-first", answers: { benefits: "Sans perçage", objections: "Autonomie", offer: "Offre de la fiche source", variants: "Noir" } }) });
    expect(changed.status).toBe(200);

    const built = await app.request(`/api/onboarding/${importedBody.draft.id}/build`, { method: "POST", headers });
    const builtBody = await built.json();
    expect(builtBody.draft.status).toBe("ready");
    expect(builtBody.draft.stages.every((stage: { state: string }) => stage.state === "complete")).toBe(true);
    expect(builtBody.draft.document.pages[0].sections.length).toBeGreaterThan(10);
    expect(builtBody.draft.document.templateId).toBe("product-bundle-first");

    const claimed = await app.request(`/api/onboarding/${importedBody.draft.id}/claim`, { method: "POST", headers });
    const claimBody = await claimed.json();
    expect(claimed.status).toBe(201);
    expect(claimBody.pageId).toMatch(/^pg_/);
    expect((await store.getOnboardingDraft(importedBody.draft.id))?.status).toBe("claimed");
  });

  it("rejects a missing claim token", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null });
    expect((await app.request("/api/onboarding/unknown")).status).toBe(401);
  });

  it("returns a useful error when product extraction exceeds its deadline", async () => {
    const app = createApp({
      store: new MemoryStore(),
      session: async () => null,
      productFetch: { fetch: async () => new Promise(() => undefined) },
      onboardingImportTimeoutMs: 5,
    });

    const result = await Promise.race([
      app.request("/api/onboarding/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: product.sourceUrl }) }),
      new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), 100)),
    ]);

    expect(result).not.toBe("hung");
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(422);
    expect((await response.json()).message).toMatch(/temps|réess/i);
  });

  it("starts the same onboarding flow from a product image", async () => {
    const store = new MemoryStore();
    const imageDataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const app = createApp({
      store,
      session: async () => null,
      onboardingAi: {
        analyse: async () => { throw new Error("not used"); },
        analyseImage: async ({ imageDataUrl: received }: { imageDataUrl: string }) => ({
          product: { ...product, sourceUrl: "https://image.weflo.local/lampe.png", title: "Lampe murale magnétique", images: [received] },
          analysis: {
            brandNames: ["Lumia", "Halo", "Noma", "Éclat", "Aura", "Sora", "Néon", "Maison Lumi"],
            personas: Array.from({ length: 4 }, (_, index) => ({ id: `p-${index}`, title: `Persona ${index}`, insight: "Besoin identifié", icon: "✨", tags: [], selected: index === 0 })),
            angles: Array.from({ length: 4 }, (_, index) => ({ id: `a-${index}`, title: `Angle ${index}`, description: "Bénéfice identifié", icon: "✨", tags: [], selected: index === 0 })),
          },
        }),
      } as never,
    });

    const response = await app.request("/api/onboarding/import-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl, fileName: "lampe.png", language: "fr" }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.draft.product).toMatchObject({ title: "Lampe murale magnétique", images: [imageDataUrl] });
    expect(body.draft.personas).toHaveLength(4);
    expect(body.claimToken).toBeTruthy();
  });

  it("defaults omitted onboarding language to French", async () => {
    const app = createApp({
      store: new MemoryStore(),
      session: async () => null,
    });
    const response = await app.request("/api/onboarding/import-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageDataUrl: "data:image/png;base64,iVBORw0KGgo=", fileName: "lampe.png" }),
    });

    expect(response.status).toBe(201);
    expect((await response.json()).draft.language).toBe("fr");
  });

  it("lists and imports a product from the authenticated connected Shopify catalog", async () => {
    const store = new MemoryStore();
    const workspace = await store.createWorkspace({ name: "Atelier Aube", ownerUserId: "user-1" });
    await store.saveShopify({ workspaceId: workspace.id, shopDomain: "atelier-aube.myshopify.com", tokenEncrypted: "encrypted-token", status: "connected" });
    const catalogProduct = { ...product, id: "gid://shopify/Product/731", sourceUrl: "https://atelier-aube.myshopify.com/products/lamp" };
    const app = createApp({
      store,
      session: async () => ({ id: "user-1", email: "owner@example.com" }),
      shopify: {
        ping: async () => {},
        publish: async () => ({ themeId: "theme-1", productId: "product-1" }),
        rollback: async () => {},
        listProducts: async () => [catalogProduct],
      },
    });

    const listed = await app.request("/api/shopify/products");
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({
      shopDomain: "atelier-aube.myshopify.com",
      products: [{ id: catalogProduct.id, title: product.title, image: product.images[0] }],
    });

    const imported = await app.request("/api/onboarding/import-shopify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: catalogProduct.id, language: "fr" }),
    });
    expect(imported.status).toBe(201);
    const body = await imported.json();
    expect(body.draft.product).toEqual({ ...product, sourceUrl: "https://atelier-aube.myshopify.com/products/lamp" });
    expect(body.claimToken).toEqual(expect.any(String));
  });

  it("pages through more than 50 active products and imports an exact later product", async () => {
    const store = new MemoryStore();
    const workspace = await store.createWorkspace({ name: "Grand catalogue", ownerUserId: "user-1" });
    await store.saveShopify({ workspaceId: workspace.id, shopDomain: "grand-catalogue.myshopify.com", tokenEncrypted: "encrypted-token", status: "connected" });
    const catalog = Array.from({ length: 55 }, (_, index) => ({
      ...product,
      id: String(index + 1),
      title: `Produit ${index + 1}`,
      sourceUrl: `https://grand-catalogue.myshopify.com/products/produit-${index + 1}`,
    }));
    const cursors: Array<string | null> = [];
    const app = createApp({
      store,
      session: async () => ({ id: "user-1", email: "owner@example.com" }),
      shopify: {
        ping: async () => {},
        publish: async () => ({ themeId: "theme-1", productId: "product-1" }),
        rollback: async () => {},
        listProducts: async (input: { cursor?: string | null }) => {
          cursors.push(input.cursor ?? null);
          return input.cursor === "page-2"
            ? { products: catalog.slice(50), nextCursor: null, previousCursor: "page-1" }
            : { products: catalog.slice(0, 50), nextCursor: "page-2", previousCursor: null };
        },
        getProduct: async ({ productId }: { productId: string }) => catalog.find((item) => item.id === productId) ?? null,
      },
    });

    const first = await app.request("/api/shopify/products");
    const second = await app.request("/api/shopify/products?cursor=page-2");
    expect(await first.json()).toMatchObject({ products: expect.arrayContaining([expect.objectContaining({ id: "1" })]), nextCursor: "page-2", previousCursor: null });
    expect(await second.json()).toMatchObject({ products: expect.arrayContaining([expect.objectContaining({ id: "55", title: "Produit 55" })]), nextCursor: null, previousCursor: "page-1" });
    expect(cursors).toEqual([null, "page-2"]);

    const imported = await app.request("/api/onboarding/import-shopify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "55", language: "fr" }),
    });
    expect(imported.status).toBe(201);
    expect((await imported.json()).draft.product.title).toBe("Produit 55");
  });

  it("returns a French reconnect destination when no Shopify catalog is connected", async () => {
    const app = createApp({
      store: new MemoryStore(),
      session: async () => ({ id: "user-1", email: "owner@example.com" }),
    });

    const response = await app.request("/api/shopify/products");

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "shopify_not_connected",
      message: "Aucun catalogue Shopify n’est connecté à cet espace.",
      actionUrl: "/boutique",
    });
  });
});
