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
