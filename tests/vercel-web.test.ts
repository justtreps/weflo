import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createVercelWebHandler } from "../src/server/vercel-web";

describe("Vercel Web Handler", () => {
  it("restores a rewritten API path and preserves the remaining query", async () => {
    const app = new Hono();
    app.get("/api/auth/me", (c) => c.json({ path: c.req.path, next: c.req.query("next") }));
    const handler = createVercelWebHandler(app);
    const response = await handler.fetch(new Request("https://weflo.test/api?__weflo_path=api%2Fauth%2Fme&next=dashboard"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ path: "/api/auth/me", next: "dashboard" });
  });

  it("restores the marketing root", async () => {
    const app = new Hono();
    app.get("/", (c) => c.text("landing"));
    const response = await createVercelWebHandler(app).fetch(new Request("https://weflo.test/api?__weflo_path="));
    expect(await response.text()).toBe("landing");
  });
});
