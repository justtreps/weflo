import type { EditorDocument, EditorPage, EditorSection } from "../../editor/document";
import { designTokenStyle } from "../../design/tokens";
import { compileShopifySection } from "../compile-section";
import { shopifySectionType } from "../compile-section";
import type { CustomSectionPublication } from "../../custom-sections/service";
import { shopifyHandle } from "../names";
import { wefloProductRuntimeSource } from "../runtime/product-form";
import { wefloThemeShell } from "../theme-shell";
import { validateThemeOutput } from "../validate-theme-output";
import type { AdapterConfidence, ThemeAdapter, ThemeCapabilityReport, ThemeFile, ThemePatch, ThemeValidationResult } from "./types";
import type { DesignProfile } from "../../design/profile";

function template(sectionType: string): string {
  return JSON.stringify({ sections: { main: { type: sectionType, settings: {} } }, order: ["main"] }, null, 2);
}

export const wefloNativeAdapter: ThemeAdapter = {
  id: "weflo-native",
  detect(): AdapterConfidence { return { score: 1, confidence: "fallback", reason: "Sortie Weflo autonome disponible pour tout thème." }; },
  capabilities(): ThemeCapabilityReport { return { adapterId: "weflo-native", capabilities: { "product-form": true, "variant-selection": true, "quantity-breaks": true, "fixed-bundle": true, "selling-plan": true, preorder: true, "custom-bundle": true, "app-blocks": true }, blockers: [] }; },
  mapTokens(profile: DesignProfile): ThemePatch[] { return [{ key: "assets/weflo-profile.css", value: `:root{${designTokenStyle(profile)}}` }]; },
  compileSection(section: EditorSection): ThemeFile[] { return [compileShopifySection(section)]; },
  compileTemplate(page: EditorPage): ThemeFile {
    const first = page.sections[0];
    return { key: `templates/page.weflo-${shopifyHandle(page.slug)}.json`, value: template(first ? `weflo-${shopifyHandle(first.type)}` : "weflo-page-shell") };
  },
  requiredAssets(): ThemeFile[] { return [{ key: "assets/weflo-product-form.js", value: wefloProductRuntimeSource }]; },
  validate(output: ThemeFile[]): ThemeValidationResult { return validateThemeOutput(output.map((entry) => ({ ...entry, checksum: "", operation: "upsert" }))); },
};

/** Complete, original Online Store 2.0 theme. No third-party theme source is used. */
export function compileWefloTheme(document: EditorDocument, customSections: readonly CustomSectionPublication[] = []): ThemeFile[] {
  const sections = [...new Map(document.pages.flatMap((page) => page.sections).map((section) => {
    const compiled = compileShopifySection(section, customSections);
    return [compiled.key, section] as const;
  })).values()];
  const sectionFiles = sections.map((section) => compileShopifySection(section, customSections));
  const primary = sections[0] ? shopifySectionType(sections[0], customSections) : "weflo-page-shell";
  const templates = ["index", "product", "collection", "page"].map((name) => ({ key: `templates/${name}.json`, value: template(primary) }));
  const profile = document.designProfile ? wefloNativeAdapter.mapTokens(document.designProfile) : [{ key: "assets/weflo-profile.css", value: "" }];
  return [...wefloThemeShell, ...sectionFiles, ...wefloNativeAdapter.requiredAssets(document), ...profile, ...templates]
    .sort((a, b) => a.key.localeCompare(b.key));
}
