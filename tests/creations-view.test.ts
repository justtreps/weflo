import { describe, expect, it } from "vitest";
import { renderCreationsView } from "../src/dashboard/creations-view";
import { renderPreviewDialog } from "../src/dashboard/preview-dialog";

describe("creations library", () => {
  it("renders a visual project card with preview and complete actions", () => {
    const html = renderCreationsView({
      workspace: { id: "ws_1", name: "Maison Lumi", slug: "maison-lumi" },
      totalProjects: 1,
      greeting: "Bonjour Théo",
      projects: [{
        id: "pg_1", name: "LumiWall", slug: "lumiwall", type: "sell", typeLabel: "Page produit",
        status: "draft", statusLabel: "Brouillon", statusTone: "neutral",
        previewImage: "https://cdn.example/lamp.webp", updatedAt: "2026-09-02T12:00:00Z", updatedLabel: "Modifiée le 2 sept.",
      }],
    });

    expect(html).toContain("https://cdn.example/lamp.webp");
    expect(html).toContain('data-command="preview"');
    expect(html).toContain('data-command="edit"');
    expect(html).toContain('data-command="duplicate"');
    expect(html).toContain('data-command="delete"');
    expect(html).toContain('href="/studio"');
  });

  it("uses a deliberate branded cover when a page has no media", () => {
    const html = renderCreationsView({
      workspace: { id: "ws_1", name: "Studio", slug: "studio" }, totalProjects: 1, greeting: "Bonjour",
      projects: [{ id: "pg_1", name: "Page vierge", slug: "page-vierge", type: "blank", typeLabel: "Page sur mesure", status: "draft", statusLabel: "Brouillon", statusTone: "neutral", previewImage: null, updatedAt: "2026-09-02T12:00:00Z", updatedLabel: "Récemment" }],
    });
    expect(html).toContain("creation-cover--fallback");
    expect(html).not.toContain("Aperçu indisponible");
  });
});

describe("preview dialog", () => {
  it("embeds the live storefront URL and exposes desktop, mobile and fullscreen controls", () => {
    const html = renderPreviewDialog({ url: "/s/maison-lumi/lumiwall", name: "LumiWall" });
    expect(html).toContain('src="/s/maison-lumi/lumiwall"');
    expect(html).toContain('data-preview-size="desktop"');
    expect(html).toContain('data-preview-size="mobile"');
    expect(html).toContain('data-preview-fullscreen');
    expect(html).toContain('aria-label="Fermer l’aperçu"');
  });
});
