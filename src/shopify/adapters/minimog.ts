import type { DesignProfile } from "../../design/profile";
import type { EditorDocument, EditorPage, EditorSection } from "../../editor/document";
import { compileShopifySection } from "../compile-section";
import { shopifyHandle } from "../names";
import { validateThemeOutput } from "../validate-theme-output";
import type { AdapterConfidence, ThemeAdapter, ThemeCapabilityReport, ThemeFile, ThemePatch, ThemeValidationResult } from "./types";

/** Structural adapter only. It never reads, stores, or republishes Minimog source. */
export const minimogAdapter: ThemeAdapter = {
  id: "minimog",
  detect(files): AdapterConfidence { const found = files.some((file) => /minimog|foxkit/i.test(file.key)); return found ? { score: 60, confidence: "compatible", reason: "Empreinte structurelle Minimog détectée." } : { score: 0, confidence: "fallback", reason: "Aucune empreinte Minimog." }; },
  capabilities(files): ThemeCapabilityReport { const detected = files.some((file) => /minimog|foxkit/i.test(file.key)); return { adapterId: "minimog", capabilities: { "app-blocks": detected }, blockers: detected ? [] : ["Version Minimog inconnue : publication isolée uniquement."] }; },
  mapTokens(profile: DesignProfile): ThemePatch[] { return [{ key: "assets/weflo-minimog-tokens.css", value: `.wf-section{--wf-profile-background:${profile.colors.background};--wf-profile-ink:${profile.colors.ink};--wf-profile-accent:${profile.colors.accent}}` }]; },
  compileSection(section: EditorSection): ThemeFile[] { return [compileShopifySection(section)]; },
  compileTemplate(page: EditorPage): ThemeFile { const first = page.sections[0]; return { key: `templates/page.weflo-${shopifyHandle(page.slug)}.json`, value: JSON.stringify({ sections: { main: { type: first ? `weflo-${shopifyHandle(first.type)}` : "weflo-page-shell", settings: {} } }, order: ["main"] }, null, 2) }; },
  requiredAssets(_document: EditorDocument): ThemeFile[] { return []; },
  validate(output): ThemeValidationResult { return validateThemeOutput(output.map((entry) => ({ ...entry, checksum: "", operation: "upsert" }))); },
};
