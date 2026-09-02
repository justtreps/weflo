import type { EditorState } from "../store";

export function layersPanel(state: EditorState): string {
  const kit = state.document.commerce?.brandKit;
  const fonts = ["Inter", "DM Sans", "Manrope", "Space Grotesk", "Playfair Display", "Libre Baskerville"];
  const fontSelect = (key: "headingFont" | "bodyFont", value: string) => `<select data-theme-key="${key}">${fonts.map((font) => `<option value="${font}"${font === value ? " selected" : ""}>${font}</option>`).join("")}</select>`;
  const colorLabels = { background: "Arrière-plan", surface: "Surface", ink: "Texte", accent: "Accent" };
  return `<section data-panel="layers"><p class="editor-panel-help">L’identité globale de ta marque. Les changements s’appliquent à toutes les sections.</p><div class="editor-brand-preview"><small>IDENTITÉ DE MARQUE</small><strong>${state.document.name}</strong><span style="font-family:${kit?.headingFont ?? "Inter"}">Aa</span></div><h3 class="editor-panel-heading">Couleurs</h3><div class="editor-theme-colors">${(["background","surface","ink","accent"] as const).map((key) => `<label><input type="color" data-theme-key="${key}" value="${state.document.theme[key]}"><small>${colorLabels[key]}</small></label>`).join("")}</div><h3 class="editor-panel-heading">Typographie</h3><label class="editor-theme-field"><small>Titres</small>${fontSelect("headingFont", kit?.headingFont ?? "Inter")}</label><label class="editor-theme-field"><small>Texte</small>${fontSelect("bodyFont", kit?.bodyFont ?? "Inter")}</label></section>`;
}
