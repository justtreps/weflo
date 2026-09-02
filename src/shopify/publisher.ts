import type { CompiledThemeFile } from "./compiler";
import type { PublicationStrategy } from "./publication-plan";
import type { PublicationRecord } from "./publication-record";
import type { ShopifyTheme } from "./themes";
import { validateThemeOutput } from "./validate-theme-output";

export type ShopifyThemeTransport = {
  listThemes(): Promise<ShopifyTheme[]>;
  createTheme(name: string): Promise<ShopifyTheme>;
  duplicateTheme(themeId: string, name: string): Promise<ShopifyTheme>;
  readFile(themeId: string, key: string): Promise<string | null>;
  writeFile(themeId: string, key: string, value: string): Promise<void>;
  deleteFile(themeId: string, key: string): Promise<void>;
  bindResource(themeId: string, templateSuffix: string): Promise<{ resourceId?: string; previousTemplateSuffix?: string | null }>;
};

export type PublishToShopifyInput = { strategy: PublicationStrategy; themeId?: string; files: CompiledThemeFile[]; templateSuffix: string; transport: ShopifyThemeTransport; shopDomain?: string };

export async function publishToShopify(input: PublishToShopifyInput): Promise<{ themeId: string; previewUrl: string; record: PublicationRecord }> {
  const validation = validateThemeOutput(input.files);
  if (!validation.ok) throw new Error(`Export Shopify invalide : ${validation.errors.join(" ")}`);
  const themes = await input.transport.listThemes();
  const active = themes.find((theme) => theme.role === "main");
  if ((input.strategy === "active" || input.strategy === "duplicate_active") && !active) throw new Error("Active Shopify theme not found");
  let theme: ShopifyTheme;
  if (input.strategy === "new_weflo") theme = await input.transport.createTheme("Weflo");
  else if (input.strategy === "duplicate_active") theme = await input.transport.duplicateTheme(active!.id, `${active!.name} — Weflo`);
  else theme = themes.find((item) => item.id === (input.themeId ?? active!.id)) ?? (() => { throw new Error("Selected Shopify theme not found"); })();
  const now = new Date();
  const record: PublicationRecord = { id: `pub-${now.getTime()}`, strategy: input.strategy, themeId: theme.id, ...(input.strategy === "duplicate_active" ? { sourceThemeId: active!.id } : {}), status: "running", backups: [], results: [], createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString() };
  const written: Array<{ key: string; value: string | null }> = [];
  try {
    for (const file of input.files) {
      const previous = await input.transport.readFile(theme.id, file.key);
      record.backups.push({ key: file.key, value: previous });
      if (previous === file.value) { record.results.push({ key: file.key, status: "unchanged" }); continue; }
      await input.transport.writeFile(theme.id, file.key, file.value);
      written.push({ key: file.key, value: previous });
      record.results.push({ key: file.key, status: "written" });
    }
    await input.transport.bindResource(theme.id, input.templateSuffix);
    const host = input.shopDomain?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "shop.myshopify.com";
    const previewUrl = `https://${host}/?preview_theme_id=${encodeURIComponent(theme.id)}`;
    record.status = "completed"; record.previewUrl = previewUrl;
    return { themeId: theme.id, previewUrl, record };
  } catch (error) {
    for (const backup of written.reverse()) {
      if (backup.value === null) await input.transport.deleteFile(theme.id, backup.key).catch(() => {});
      else await input.transport.writeFile(theme.id, backup.key, backup.value).catch(() => {});
    }
    record.status = "rolled_back";
    throw error;
  }
}
