import { describe, expect, it } from "vitest";
import { publishToShopify, type ShopifyThemeTransport } from "../src/shopify/publisher";
import type { CompiledThemeFile } from "../src/shopify/compiler";

function fakeTransport(log: string[], failKey?: string): ShopifyThemeTransport {
  return {
    listThemes: async () => [{ id: "live", name: "Dawn", role: "main" }],
    createTheme: async () => { log.push("createTheme"); return { id: "new", name: "Weflo", role: "unpublished" }; },
    duplicateTheme: async (id) => { log.push(`duplicate:${id}`); return { id: "copy", name: "Dawn — Weflo", role: "unpublished" }; },
    readFile: async (_id, key) => key.includes("hero") ? "old" : null,
    writeFile: async (_id, key) => { log.push(`write:${key}`); if (key === failKey) throw new Error("fail"); },
    deleteFile: async (_id, key) => { log.push(`delete:${key}`); },
    bindResource: async (_id, suffix) => { log.push(`bind:${suffix}`); return { resourceId: "page-1", previousTemplateSuffix: null }; },
  };
}
const files: CompiledThemeFile[] = [{ key: "sections/weflo-hero.liquid", value: "new", checksum: "a", operation: "upsert" }, { key: "assets/weflo.css", value: "css", checksum: "b", operation: "upsert" }];

describe("Shopify theme publisher", () => {
  it.each([["active", "live"], ["duplicate_active", "copy"], ["new_weflo", "new"]] as const)("executes %s strategy", async (strategy, expectedTheme) => {
    const log: string[] = [];
    const result = await publishToShopify({ strategy, files, templateSuffix: "weflo-shop", transport: fakeTransport(log) });
    expect(result.themeId).toBe(expectedTheme);
    expect(result.previewUrl).toContain(expectedTheme);
    expect(log.some((item) => item.startsWith("bind:"))).toBe(true);
  });

  it("backs up and restores changed files in reverse order after failure", async () => {
    const log: string[] = [];
    await expect(publishToShopify({ strategy: "active", files, templateSuffix: "weflo-shop", transport: fakeTransport(log, "assets/weflo.css") })).rejects.toThrow(/fail/);
    expect(log.at(-1)).toBe("write:sections/weflo-hero.liquid");
  });
});
