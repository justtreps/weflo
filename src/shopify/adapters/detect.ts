import { dawnAdapter } from "./dawn";
import { minimogAdapter } from "./minimog";
import { wefloNativeAdapter } from "./weflo-native";
import type { ThemeAdapter, ThemeFile } from "./types";

export const themeAdapters: ThemeAdapter[] = [dawnAdapter, minimogAdapter, wefloNativeAdapter];

export function detectThemeAdapter(files: ThemeFile[]): { adapterId: ThemeAdapter["id"]; confidence: "exact" | "compatible" | "fallback"; reason: string; adapter: ThemeAdapter } {
  const ranked = themeAdapters.map((adapter) => ({ adapter, result: adapter.detect(files) }))
    .sort((a, b) => b.result.score - a.result.score || a.adapter.id.localeCompare(b.adapter.id));
  const winner = ranked[0];
  return { adapterId: winner.adapter.id, confidence: winner.result.confidence, reason: winner.result.reason, adapter: winner.adapter };
}
