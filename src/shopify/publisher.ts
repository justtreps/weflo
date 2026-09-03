import type { CompiledThemeFile } from "./compiler";
import type { PublicationStrategy, RemoteThemeFile } from "./publication-plan";
import type { PublicationRecord } from "./publication-record";
import type { ShopifyTheme } from "./themes";
import { validateThemeOutput } from "./validate-theme-output";
import { createPublicationPlan, type ShopifyPublicationPlan } from "./publication-plan";
import { assertPublishCapabilities, type ShopifyCapabilityReport } from "./capability-report";
import { createHash } from "node:crypto";

export type ShopifyThemeTransport = {
  listThemes(): Promise<ShopifyTheme[]>;
  createTheme(name: string): Promise<ShopifyTheme>;
  duplicateTheme(themeId: string, name: string): Promise<ShopifyTheme>;
  readFile(themeId: string, key: string): Promise<string | null>;
  writeFile(themeId: string, key: string, value: string): Promise<void>;
  deleteFile(themeId: string, key: string): Promise<void>;
  bindResource(themeId: string, templateSuffix: string): Promise<{ resourceId?: string; previousTemplateSuffix?: string | null }>;
};

export type PublishToShopifyInput = { strategy: PublicationStrategy; themeId?: string; files: CompiledThemeFile[]; templateSuffix: string; transport: ShopifyThemeTransport; shopDomain?: string; capabilityReport?: ShopifyCapabilityReport };
export type ShopifyPublicationDryRun = { plan: ShopifyPublicationPlan; blockers: string[] };

const checksum = (value: string | null) => value === null ? undefined : createHash("sha256").update(value).digest("hex");

/** Read-only dry run. It does not create, duplicate, write, activate, or bind a theme. */
export async function planShopifyPublication(input: Omit<PublishToShopifyInput, "templateSuffix">): Promise<ShopifyPublicationDryRun> {
  if (input.capabilityReport) assertPublishCapabilities(input.capabilityReport);
  const validation = validateThemeOutput(input.files);
  if (!validation.ok) throw new Error(`Export Shopify invalide : ${validation.errors.join(" ")}`);
  const themes = await input.transport.listThemes();
  const active = themes.find((theme) => theme.role === "main");
  const sourceId = input.strategy === "new_weflo" ? undefined : input.themeId ?? active?.id;
  const inspected = sourceId ? await Promise.all(input.files.map(async (file) => {
    const value = await input.transport.readFile(sourceId, file.key);
    return value === null ? null : { key: file.key, value, checksum: checksum(value) ?? "" };
  })) : [];
  const remoteFiles = inspected.filter((file): file is RemoteThemeFile => file !== null);
  const plan = createPublicationPlan({ strategy: input.strategy, themeId: input.themeId, themes, compiledFiles: input.files, remoteFiles, capabilityReport: input.capabilityReport });
  return { plan, blockers: input.capabilityReport?.blockers ?? [] };
}

export async function rollbackPublication(record: PublicationRecord, transport: Pick<ShopifyThemeTransport, "writeFile" | "deleteFile">): Promise<PublicationRecord> {
  for (const backup of [...record.backups].reverse()) {
    if (backup.value === null) await transport.deleteFile(record.themeId, backup.key);
    else await transport.writeFile(record.themeId, backup.key, backup.value);
    record.results.push({ key: backup.key, status: "restored" });
  }
  record.status = "rolled_back";
  return record;
}

export async function publishToShopify(input: PublishToShopifyInput): Promise<{ themeId: string; previewUrl: string; record: PublicationRecord }> {
  if (input.capabilityReport) assertPublishCapabilities(input.capabilityReport);
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
      record.backups.push({ key: file.key, value: previous, checksum: checksum(previous) });
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
    await rollbackPublication({ ...record, backups: written.map((backup) => ({ ...backup, checksum: checksum(backup.value) })) }, input.transport).catch(() => {});
    record.status = "rolled_back";
    throw error;
  }
}
