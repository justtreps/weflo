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
    const changed = await app.request(`/api/onboarding/${importedBody.draft.id}`, { method: "PATCH", headers, body: JSON.stringify({ brandName: "LumiWall", modelId: "proteo" }) });
    expect(changed.status).toBe(200);

    const built = await app.request(`/api/onboarding/${importedBody.draft.id}/build`, { method: "POST", headers });
    const builtBody = await built.json();
    expect(builtBody.draft.status).toBe("ready");
    expect(builtBody.draft.stages.every((stage: { state: string }) => stage.state === "complete")).toBe(true);
    expect(builtBody.draft.document.pages[0].sections.length).toBeGreaterThan(10);

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
});
