import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECTION_PREVIEW_MANIFESTS } from "../src/section-preview/manifests";

describe("generated section preview assets", () => {
  it("contains desktop and mobile captures for every manifest", () => {
    for (const entry of SECTION_PREVIEW_MANIFESTS) {
      expect(existsSync(`public${entry.preview.desktop}`)).toBe(true);
      expect(existsSync(`public${entry.preview.mobile}`)).toBe(true);
    }
    const output = JSON.parse(readFileSync("public/assets/section-previews/manifest.json", "utf8"));
    expect(output.entries).toHaveLength(24);
  });
});
