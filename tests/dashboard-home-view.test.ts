import { describe, expect, it } from "vitest";
import { renderDashboardHome } from "../src/dashboard/home-view";
import type { DashboardHomeModel } from "../src/dashboard/home-model";

describe("dashboard home view", () => {
  it("renders creation actions and real project previews", () => {
    const model: DashboardHomeModel = {
      greeting: "Bonjour Théo",
      workspace: { id: "ws_1", name: "Studio", slug: "studio" },
      totalProjects: 1,
      projects: [{
        id: "pg_1", name: "LumiWall", slug: "lumiwall", type: "sell", typeLabel: "Page produit",
        status: "draft", statusLabel: "Brouillon", statusTone: "neutral",
        previewImage: "https://cdn.example/lamp.webp", updatedAt: "2026-09-02T12:00:00Z", updatedLabel: "Modifiée le 2 sept.",
      }],
    };

    const html = renderDashboardHome(model);
    expect(html).toContain('data-dashboard-action="generate"');
    expect(html).toContain('data-dashboard-action="blank"');
    expect(html).toContain('data-project-id="pg_1"');
    expect(html).toContain("https://cdn.example/lamp.webp");
    expect(html).toContain("Mes créations");
  });

  it("escapes project content and uses a branded fallback instead of a placeholder", () => {
    const html = renderDashboardHome({
      greeting: "Bonjour",
      workspace: { id: "ws_1", name: "Studio", slug: "studio" },
      totalProjects: 1,
      projects: [{
        id: "pg_1", name: '<img src=x onerror="boom">', slug: "x", type: "blank", typeLabel: "Page sur mesure",
        status: "draft", statusLabel: "Brouillon", statusTone: "neutral", previewImage: null,
        updatedAt: "2026-09-02T12:00:00Z", updatedLabel: "Récemment",
      }],
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("Aperçu indisponible");
    expect(html).toContain("page-preview-fallback");
  });

  it("exposes the complete workspace navigation and the real Shopify brand mark", () => {
    const html = renderDashboardHome({
      greeting: "Bonjour",
      workspace: { id: "ws_1", name: "Studio", slug: "studio" },
      totalProjects: 0,
      projects: [],
    });

    expect(html).toContain('href="/creations"');
    expect(html).toContain('href="/studio"');
    expect(html).toContain('href="/boutique"');
    expect(html).toContain('src="/assets/brands/shopify.svg"');
    expect(html).toContain('alt="Shopify"');
  });
});
