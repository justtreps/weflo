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
});
