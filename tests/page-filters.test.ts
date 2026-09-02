import { describe, expect, it } from "vitest";
import { filterPages, pageMatchesChip, sortPages } from "../src/lib/page-filters";
import { initialDocument } from "../src/lib/catalog";
import type { Page } from "../src/types";

function page(name: string, type: Page["type"]): Page {
  return {
    id: name,
    workspaceId: "ws",
    name,
    slug: name.toLowerCase(),
    type,
    status: "draft",
    document: initialDocument(name, type),
    updatedAt: new Date().toISOString(),
  };
}

describe("pageMatchesChip", () => {
  it("keeps Accueil pages instead of emptying the list", () => {
    expect(pageMatchesChip(page("Page d'accueil", "blank"), "Accueil")).toBe(true);
    expect(pageMatchesChip(page("Home", "sell"), "Accueil")).toBe(true);
    expect(pageMatchesChip(page("Page produit", "sell"), "Accueil")).toBe(false);
  });
});

describe("filterPages", () => {
  it("does not drop Accueil chip results when a homepage exists", () => {
    const pages = [page("Page produit", "sell"), page("Page d'accueil", "blank")];
    expect(filterPages(pages, "Accueil", "").map((p) => p.name)).toEqual(["Page d'accueil"]);
    expect(filterPages(pages, "Tout", "").length).toBe(2);
  });

  it("returns an empty list for Accueil when no home/blank page exists", () => {
    const pages = [page("Page produit", "sell"), page("Landing page", "sell")];
    expect(filterPages(pages, "Accueil", "")).toEqual([]);
  });

  it("applies search on top of the active chip", () => {
    const pages = [page("Page d'accueil", "blank"), page("Home café", "blank"), page("Page produit", "sell")];
    expect(filterPages(pages, "Accueil", "café").map((p) => p.name)).toEqual(["Home café"]);
    expect(filterPages(pages, "Tout", "page").map((p) => p.name)).toEqual(["Page d'accueil", "Page produit"]);
  });

  it("splits sell pages between Produit and Landing", () => {
    const pages = [page("Page produit", "sell"), page("Landing page", "sell"), page("Home", "blank")];
    expect(filterPages(pages, "Produit", "").map((p) => p.name)).toEqual(["Page produit"]);
    expect(filterPages(pages, "Landing", "").map((p) => p.name)).toEqual(["Landing page"]);
  });
});

describe("sortPages", () => {
  it("sorts by name and keeps the Accueil filter result", () => {
    const pages = [page("Zulu", "blank"), page("Accueil", "blank"), page("Produit", "sell")];
    const filtered = filterPages(pages, "Accueil", "");
    expect(sortPages(filtered, "name", false).map((p) => p.name)).toEqual(["Accueil", "Zulu"]);
  });
});
