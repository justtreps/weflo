import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORMAT_FLOWS } from "../src/create/format-flow";

type TemplatePreviewEntry = {
  desktop: string;
  mobile: string;
  desktopHash: string;
  mobileHash: string;
  dimensions: { desktop: { width: number; height: number }; mobile: { width: number; height: number } };
};

const manifest = JSON.parse(readFileSync("public/template-previews/manifest.json", "utf8")) as Record<string, TemplatePreviewEntry>;

describe("template preview assets", () => {
  it("has deterministic desktop and mobile previews for every selectable template", () => {
    const templates = FORMAT_FLOWS.flatMap((flow) => flow.templates);
    expect(templates).toHaveLength(21);
    expect(Object.keys(manifest)).toHaveLength(21);

    for (const template of templates) {
      const entry = manifest[template.id];
      expect(entry.desktop).toBe(`/template-previews/${template.id}-desktop.webp`);
      expect(entry.mobile).toBe(`/template-previews/${template.id}-mobile.webp`);
      expect(entry.desktopHash).toMatch(/^[a-f0-9]{16}$/);
      expect(entry.mobileHash).toMatch(/^[a-f0-9]{16}$/);
      expect(entry.dimensions.desktop).toEqual({ width: 1440, height: 1100 });
      expect(entry.dimensions.mobile).toEqual({ width: 390, height: 844 });
      expect(existsSync(`public${entry.desktop}`)).toBe(true);
      expect(existsSync(`public${entry.mobile}`)).toBe(true);
      expect(entry.desktopHash).toBe(createHash("sha256").update(readFileSync(`public${entry.desktop}`)).digest("hex").slice(0, 16));
      expect(entry.mobileHash).toBe(createHash("sha256").update(readFileSync(`public${entry.mobile}`)).digest("hex").slice(0, 16));
    }
  });
});
