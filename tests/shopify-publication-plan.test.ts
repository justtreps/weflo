import { describe, expect, it } from "vitest";
import { createPublicationPlan } from "../src/shopify/publication-plan";
import type { CompiledThemeFile } from "../src/shopify/compiler";

const compiled: CompiledThemeFile[] = [
  { key: "sections/weflo-hero.liquid", value: "new", checksum: "abc", operation: "upsert" },
  { key: "assets/weflo-shop.css", value: "same", checksum: "same", operation: "upsert" },
];
const themes = [{ id: "live", name: "Dawn", role: "main" as const }, { id: "dev", name: "Test", role: "unpublished" as const }];

describe("Shopify publication planning", () => {
  it("plans direct, duplicate and new-theme strategies", () => {
    expect(createPublicationPlan({ strategy: "active", themes, compiledFiles: compiled, remoteFiles: [] }).targetThemeId).toBe("live");
    expect(createPublicationPlan({ strategy: "duplicate_active", themes, compiledFiles: compiled, remoteFiles: [] }).themeAction).toBe("duplicate");
    expect(createPublicationPlan({ strategy: "new_weflo", themes, compiledFiles: compiled, remoteFiles: [] }).themeAction).toBe("create");
  });

  it("rejects missing active and invalid selected themes", () => {
    expect(() => createPublicationPlan({ strategy: "active", themes: [], compiledFiles: compiled, remoteFiles: [] })).toThrow(/active/i);
    expect(() => createPublicationPlan({ strategy: "active", themeId: "missing", themes, compiledFiles: compiled, remoteFiles: [] })).toThrow(/theme/i);
  });

  it("classifies creates, updates, unchanged and captures backups", () => {
    const plan = createPublicationPlan({ strategy: "active", themes, compiledFiles: compiled, remoteFiles: [{ key: "sections/weflo-hero.liquid", value: "old", checksum: "old" }, { key: "assets/weflo-shop.css", value: "same", checksum: "same" }] });
    expect(plan.files.map((file) => file.action)).toEqual(["update", "unchanged"]);
    expect(plan.files[0].backup).toBe("old");
  });

  it("prohibits accidental global template replacement", () => {
    expect(() => createPublicationPlan({ strategy: "active", themes, compiledFiles: [{ ...compiled[0], key: "templates/product.json" }], remoteFiles: [] })).toThrow(/global/i);
  });
});
