import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

async function setup(studio?: Parameters<typeof createApp>[0]["imageStudio"]) {
  const store = new MemoryStore();
  const workspace = await store.createWorkspace({ name: "Studio", ownerUserId: "u1" });
  const app = createApp({ store, session: async () => ({ id: "u1", email: "u@x.test" }), imageStudio: studio });
  return { app, store, workspace };
}

describe("studio image API", () => {
  it("requires authentication", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null });
    expect((await app.request("/api/studio/generations")).status).toBe(401);
  });

  it("validates prompts and reports a missing provider as JSON", async () => {
    const { app } = await setup();
    expect((await app.request("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(400);
    const response = await app.request("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "Une lampe premium", model: "nano-banana-2", aspectRatio: "1:1", numImages: 1 }) });
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("persists a successful generation in workspace history", async () => {
    const { app } = await setup({ generate: async () => ({ images: [{ url: "https://fal.media/lamp.webp", width: 1024, height: 1024 }] }) });
    const generated = await app.request("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "Une lampe premium", model: "gpt-image-2", aspectRatio: "1:1", numImages: 1 }) });
    expect(generated.status).toBe(201);
    expect(await generated.json()).toMatchObject({ prompt: "Une lampe premium", status: "completed", images: [{ url: "https://fal.media/lamp.webp" }] });
    const history = await app.request("/api/studio/generations");
    const payload = await history.json() as { generations: unknown[] };
    expect(payload.generations).toHaveLength(1);
  });

  it("returns the Fal result even when generation history storage is unavailable", async () => {
    const { app, store } = await setup({ generate: async () => ({ images: [{ url: "https://fal.media/recovered.webp" }] }) });
    store.saveImageGeneration = async () => { throw new Error("permission denied for schema public"); };

    const response = await app.request("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "Une bouteille premium", model: "nano-banana-2", aspectRatio: "1:1", numImages: 1 }) });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ status: "completed", images: [{ url: "https://fal.media/recovered.webp" }] });
  });

  it("returns an empty history when its optional storage is unavailable", async () => {
    const { app, store } = await setup();
    store.listImageGenerations = async () => { throw new Error("permission denied for schema public"); };

    const response = await app.request("/api/studio/generations");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ generations: [] });
  });
});
