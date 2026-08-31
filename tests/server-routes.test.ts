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
  });

  it("redirects / to /connexion when logged out", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/connexion");
  });

  it("redirects / to /dashboard when logged in", async () => {
    const app = createApp({
      store: null as never,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/dashboard");
  });

  it("serves DA pages without session", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    expect((await app.request("/mascottes")).status).toBe(200);
    expect((await app.request("/maquettes")).status).toBe(200);
  });
});
