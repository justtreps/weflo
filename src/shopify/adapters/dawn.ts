import type { DesignProfile } from "../../design/profile";
import type { EditorDocument, EditorPage, EditorSection } from "../../editor/document";
import { compileShopifySection } from "../compile-section";
import { shopifyHandle } from "../names";
import { wefloProductRuntimeSource } from "../runtime/product-form";
import { validateThemeOutput } from "../validate-theme-output";
import type { AdapterConfidence, ThemeAdapter, ThemeCapabilityReport, ThemeFile, ThemePatch, ThemeValidationResult } from "./types";

function isDawn(files: ThemeFile[]): boolean {
  const names = new Set(files.map((file) => file.key));
  const schema = files.find((file) => file.key === "config/settings_schema.json")?.value || "";
  return names.has("layout/theme.liquid") && (names.has("assets/base.css") || names.has("sections/main-product.liquid") || /\bDawn\b/i.test(schema));
}

export const dawnAdapter: ThemeAdapter = {
  id: "dawn",
  detect(files): AdapterConfidence { return isDawn(files) ? { score: 90, confidence: "exact", reason: "Signature Dawn détectée (layout et base/section produit)." } : { score: 0, confidence: "fallback", reason: "Signature Dawn absente." }; },
  capabilities(files): ThemeCapabilityReport {
    const detected = isDawn(files);
    return { adapterId: "dawn", capabilities: { "product-form": detected, "variant-selection": detected, "cart-drawer": detected, "quantity-breaks": true, "fixed-bundle": true, "app-blocks": detected }, blockers: detected ? [] : ["Le thème fourni n’est pas reconnu comme Dawn."] };
  },
  mapTokens(profile: DesignProfile): ThemePatch[] {
    return [{ key: "assets/weflo-dawn-tokens.css", value: `.wf-section{--wf-profile-background:var(--color-base-background-1,${profile.colors.background});--wf-profile-surface:var(--color-base-background-2,${profile.colors.surface});--wf-profile-ink:rgb(var(--color-foreground,17,17,17));--wf-profile-accent:rgb(var(--color-button,17,17,17));--wf-profile-section:${profile.spacing.section}px;--wf-profile-gap:${profile.spacing.gap}px;--wf-profile-card-radius:${profile.radius.card}px;--wf-profile-button-radius:${profile.radius.button}px}` }];
  },
  compileSection(section: EditorSection): ThemeFile[] { return [compileShopifySection(section)]; },
  compileTemplate(page: EditorPage): ThemeFile {
    const first = page.sections[0];
    const type = first ? `weflo-${shopifyHandle(first.type)}` : "weflo-page-shell";
    return { key: `templates/page.weflo-${shopifyHandle(page.slug)}.json`, value: JSON.stringify({ sections: { main: { type, settings: {} } }, order: ["main"] }, null, 2) };
  },
  requiredAssets(): ThemeFile[] { return [{ key: "assets/weflo-product-form.js", value: wefloProductRuntimeSource }, { key: "assets/weflo-dawn.css", value: `.wf-section{color:var(--wf-profile-ink,rgb(var(--color-foreground)));background:var(--wf-profile-background,transparent)}.wf-product__form{display:grid;gap:12px}.wf-product__quantity-offers{display:flex;gap:8px;border:0;padding:0}` }]; },
  validate(output): ThemeValidationResult { return validateThemeOutput(output.map((entry) => ({ ...entry, checksum: "", operation: "upsert" }))); },
};

/** Dawn publication is additive: sections, assets and alternate templates only. */
export function compileDawnAdditive(document: EditorDocument): ThemeFile[] {
  const page = document.pages[0];
  const sections = [...new Map(page.sections.map((section) => [section.type, section])).values()].flatMap((section) => dawnAdapter.compileSection(section)).map((file) => ({ ...file, value: `{{ 'weflo-dawn.css' | asset_url | stylesheet_tag }}\n${file.value}` }));
  return [...sections, dawnAdapter.compileTemplate(page), ...dawnAdapter.requiredAssets(document), ...(document.designProfile ? dawnAdapter.mapTokens(document.designProfile) : [])]
    .sort((a, b) => a.key.localeCompare(b.key));
}
