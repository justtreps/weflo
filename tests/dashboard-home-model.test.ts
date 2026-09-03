import { describe, expect, it } from "vitest";
import { dashboardHomeModel, projectPreviewImage } from "../src/dashboard/home-model";
import type { Page, Workspace } from "../src/types";

const workspace: Workspace = {
  id: "ws_1",
  name: "Atelier Lumière",
  slug: "atelier-lumiere",
  ownerUserId: "usr_1",
  createdAt: "2026-09-01T10:00:00.000Z",
};

function page(overrides: Partial<Page> = {}): Page {
  return {
    id: "pg_1",
    workspaceId: workspace.id,
    name: "LumiWall",
    slug: "lumiwall",
    type: "sell",
    status: "draft",
    document: {
      name: "LumiWall",
      path: "/lumiwall",
      sections: [],
    },
    documentVersion: 1,
    updatedAt: "2026-09-02T12:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard home model", () => {
  it("finds the first real product image in nested section settings", () => {
    const product = page({
      document: {
        name: "LumiWall",
        path: "/lumiwall",
        sections: [
          { id: "s1", type: "productHero", settings: { gallery: { product_image: "https://cdn.example/lamp.webp" } } },
        ],
      },
    });

    expect(projectPreviewImage(product)).toBe("https://cdn.example/lamp.webp");
  });

  it("ignores unrelated URLs and accepts embedded uploaded images", () => {
    const product = page({
      document: {
        name: "Produit",
        path: "/produit",
        sections: [
          { id: "s1", type: "hero", settings: { link: "https://example.com", poster: "data:image/webp;base64,AAAA" } },
        ],
      },
    });

    expect(projectPreviewImage(product)).toBe("data:image/webp;base64,AAAA");
  });

  it("uses the first image asset from a v2 product document", () => {
    const product = page({
      document: {
        version: 2,
        name: "Produit v2",
        path: "/produit-v2",
        kind: "product",
        theme: { background: "#ffffff", surface: "#f4f1ec", ink: "#111111", muted: "#666666", accent: "#111111", display: "sans", radius: "soft" },
        pages: [{ id: "page-produit", name: "Produit v2", slug: "produit-v2", sections: [] }],
        assets: [{ id: "asset-1", type: "image", url: "https://cdn.example/product-v2.webp", alt: "Produit v2" }],
      },
      documentVersion: 2,
    });

    expect(projectPreviewImage(product)).toBe("https://cdn.example/product-v2.webp");
  });

  it("does not crash on a malformed v2-like historical document", () => {
    const historical = { ...page(), document: { version: 2, pages: [] } } as unknown as Page;

    expect(() => dashboardHomeModel({ pages: [historical], workspace })).not.toThrow();
    expect(dashboardHomeModel({ pages: [historical], workspace }).projects[0].previewImage).toBeNull();
  });

  it("sorts recent projects and maps publication states in French", () => {
    const draft = page({ id: "draft", updatedAt: "2026-09-01T12:00:00.000Z" });
    const ready = page({ id: "ready", status: "published_hosted", updatedAt: "2026-09-02T12:00:00.000Z" });
    const shopify = page({ id: "shopify", status: "published_shopify", updatedAt: "2026-09-03T12:00:00.000Z" });

    const model = dashboardHomeModel({ pages: [draft, ready, shopify], workspace, userName: "Théo" });

    expect(model.greeting).toBe("Bonjour Théo");
    expect(model.projects.map((project) => project.id)).toEqual(["shopify", "ready", "draft"]);
    expect(model.projects.map((project) => project.statusLabel)).toEqual([
      "Publiée sur Shopify",
      "Prête",
      "Brouillon",
    ]);
  });

  it("limits the visual shelf to six projects", () => {
    const pages = Array.from({ length: 8 }, (_, index) => page({ id: `pg_${index}` }));
    expect(dashboardHomeModel({ pages, workspace }).projects).toHaveLength(6);
  });
});
