import type { DesignProfile } from "../../design/profile";
import type { EditorDocument, EditorPage, EditorSection } from "../../editor/document";
import type { SectionCapability } from "../../sections/types";

export type ThemeFile = { key: string; value: string };
export type ThemePatch = ThemeFile & { mode?: "create" | "append" };
export type AdapterConfidence = { score: number; confidence: "exact" | "compatible" | "fallback"; reason: string };
export type ThemeCapabilityReport = { adapterId: string; capabilities: Partial<Record<SectionCapability, boolean>>; blockers: string[] };
export type ThemeValidationResult = { ok: boolean; errors: string[] };

export type ThemeAdapter = {
  id: string;
  detect(files: ThemeFile[]): AdapterConfidence;
  capabilities(files: ThemeFile[]): ThemeCapabilityReport;
  mapTokens(profile: DesignProfile): ThemePatch[];
  compileSection(section: EditorSection): ThemeFile[];
  compileTemplate(page: EditorPage): ThemeFile;
  requiredAssets(document: EditorDocument): ThemeFile[];
  validate(output: ThemeFile[]): ThemeValidationResult;
};
