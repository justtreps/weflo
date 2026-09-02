import type { CompiledThemeFile } from "./compiler";
import type { ShopifyTheme } from "./themes";

export type PublicationStrategy = "active" | "duplicate_active" | "new_weflo";
export type RemoteThemeFile = { key: string; value: string; checksum: string };
export type PlannedFile = CompiledThemeFile & { action: "create" | "update" | "unchanged"; backup?: string };
export type ShopifyPublicationPlan = { strategy: PublicationStrategy; themeAction: "use" | "duplicate" | "create"; targetThemeId?: string; sourceThemeId?: string; files: PlannedFile[] };

export function createPublicationPlan(input: { strategy: PublicationStrategy; themeId?: string; themes: ShopifyTheme[]; compiledFiles: CompiledThemeFile[]; remoteFiles: RemoteThemeFile[]; allowGlobalReplacement?: boolean }): ShopifyPublicationPlan {
  if (!input.allowGlobalReplacement && input.compiledFiles.some((file) => /^templates\/(?:index|product)\.json$/.test(file.key))) throw new Error("Global template replacement requires explicit confirmation");
  const active = input.themes.find((theme) => theme.role === "main");
  if ((input.strategy === "active" || input.strategy === "duplicate_active") && !active) throw new Error("Active Shopify theme not found");
  if (input.themeId && !input.themes.some((theme) => theme.id === input.themeId)) throw new Error("Selected Shopify theme not found");
  const targetThemeId = input.strategy === "active" ? (input.themeId ?? active!.id) : undefined;
  const remote = new Map(input.remoteFiles.map((file) => [file.key, file]));
  const files = input.compiledFiles.map((compiled): PlannedFile => {
    const current = remote.get(compiled.key);
    if (!current) return { ...compiled, action: "create" };
    if (current.checksum === compiled.checksum || current.value === compiled.value) return { ...compiled, action: "unchanged" };
    return { ...compiled, action: "update", backup: current.value };
  });
  return {
    strategy: input.strategy,
    themeAction: input.strategy === "active" ? "use" : input.strategy === "duplicate_active" ? "duplicate" : "create",
    ...(targetThemeId ? { targetThemeId } : {}),
    ...(input.strategy === "duplicate_active" ? { sourceThemeId: active!.id } : {}),
    files,
  };
}
