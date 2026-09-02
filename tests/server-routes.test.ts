import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";

describe("static routes", () => {
  it("serves extracted connexion HTML", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/connexion");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/html/i);
    expect(body).not.toMatch(/Continuer avec Shopify/i);
    expect(body).toContain("Content de te revoir");
    expect(body).not.toContain("{{ title }}");
    expect(body).not.toContain("{{ ctaLabel }}");
    expect(body).toMatch(/\/assets\/[0-9a-f-]{36}\.(png|webp)/);
  });

  it("serves extracted static assets", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const page = await (await app.request("/connexion")).text();
    const match = page.match(/\/assets\/([0-9a-f-]{36}\.(?:png|webp|svg|woff2))/);
    expect(match).toBeTruthy();
    const res = await app.request(match![0]);
    expect(res.status).toBe(200);
    expect(Number(res.headers.get("content-length") ?? 1)).toBeGreaterThan(0);
  });

  it("serves generated editor stylesheets with a CSS content type", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/hydrate/editeur.css");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  it("serves the marketing landing at / when logged out", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/Weflo/);
  });

  it("serves the marketing landing at / when logged in", async () => {
    const app = createApp({
      store: null as never,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/Weflo/);
  });

  it("serves DA pages without session", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    expect((await app.request("/mascottes")).status).toBe(200);
    expect((await app.request("/maquettes")).status).toBe(200);
  });
});
