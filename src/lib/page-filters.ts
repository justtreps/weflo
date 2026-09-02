import type { Page } from "../types";

export function pageMatchesChip(page: Page, chip: string): boolean {
  const name = page.name.toLowerCase();
  switch (chip) {
    case "Tout":
      return true;
    case "Produit":
      return page.type === "sell" && !/landing|accueil|home/i.test(name);
    case "Landing":
      return page.type === "sell" && /landing/i.test(name);
    case "Accueil":
      return page.type === "blank" || /accueil|home/i.test(name);
    case "Advertorial":
      return page.type === "write" && /advertorial|adv/i.test(name);
    case "Blog":
      return page.type === "write" && !/advertorial|adv/i.test(name);
    default:
      return true;
  }
}

export function filterPages(pages: Page[], chip: string, query: string): Page[] {
  const q = query.trim().toLowerCase();
  return pages.filter((page) => {
    if (!pageMatchesChip(page, chip)) return false;
    if (!q) return true;
    return page.name.toLowerCase().includes(q) || page.type.toLowerCase().includes(q);
  });
}

export function sortPages(pages: Page[], sortBy: "edited" | "name" | "type", desc: boolean): Page[] {
  const dir = desc ? -1 : 1;
  return [...pages].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "fr") * dir;
    if (sortBy === "type") return a.type.localeCompare(b.type) * dir;
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
  });
}
