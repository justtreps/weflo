import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";

describe("GET / landing", () => {
  it("serves the long-form conversion landing for anonymous visitors", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("#FAFAF8");
    expect(html).toContain("#141310");
    expect(html).toContain("#FBC531");
    expect(html).toContain("Weflo");
    expect(html).toContain("Crée des pages qui convertissent vraiment");
    expect(html).toContain("/hydrate/accueil.js");
    expect(html).toMatch(/href="#formats"/);
    expect(html).toMatch(/href="#exemples"/);
    expect(html).toMatch(/href="#tarifs"/);
    expect(html.match(/href="\/connexion"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain("Comment ça marche");
  });

  it("exposes one accessible preview panel for every conversion format", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const html = await (await app.request("/")).text();

    const controls = [...html.matchAll(/data-format-tab[^>]+aria-controls="([^"]+)"/g)].map((match) => match[1]);
    const panels = [...html.matchAll(/data-format-panel[^>]+id="([^"]+)"/g)].map((match) => match[1]);

    expect(controls).toEqual([
      "format-produit",
      "format-landing",
      "format-advertorial",
      "format-listicle",
      "format-quiz",
      "format-accueil",
    ]);
    expect(panels).toEqual(controls);
    expect(html.match(/data-format-tab[^>]+aria-selected="true"/g)?.length).toBe(1);
  });

  it("serves the same landing when a session exists", async () => {
    const app = createApp({
      store: null as never,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Crée des pages qui convertissent vraiment");
  });

  it("uses the dashboard typography and real product assets", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const html = await (await app.request("/")).text();

    expect(html).toContain("SF Pro Display");
    expect(html).not.toContain("family=Syne");
    expect(html).toContain("/assets/weflo-storefront-examples.png");
    expect(html).toContain("/assets/weflo-dashboard.png");
    expect(html).toContain("https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-primary-logo-456baa801ee66a0a435671082365958316831c9960c480451dd0330bcdae304f.svg");
  });
});
