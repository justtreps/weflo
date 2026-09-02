import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";

describe("dashboard HTML prototype", () => {
  it("serves the visual creation home and its four starting modes", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const response = await app.request("/maquette-dashboard");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Que veux-tu vendre ?");
    expect(html).toContain("Mes créations");
    expect(html).toContain('data-start-mode="link"');
    expect(html).toContain('data-start-mode="image"');
    expect(html).toContain('data-start-mode="shopify"');
    expect(html).toContain('data-start-mode="blank"');
    expect(html).toContain("/hydrate/maquette-dashboard.js");
  });
});
