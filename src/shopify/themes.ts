export type ShopifyTheme = { id: string; name: string; role: "main" | "unpublished" | "development" | "demo" };

export async function listThemes(fetchJson: (path: string) => Promise<unknown>): Promise<ShopifyTheme[]> {
  const payload = await fetchJson("/themes.json") as { themes?: Array<{ id?: unknown; name?: unknown; role?: unknown }> };
  return (payload.themes ?? []).flatMap((theme) => {
    if ((typeof theme.id !== "string" && typeof theme.id !== "number") || typeof theme.name !== "string" || !["main", "unpublished", "development", "demo"].includes(String(theme.role))) return [];
    return [{ id: String(theme.id), name: theme.name, role: theme.role as ShopifyTheme["role"] }];
  });
}
