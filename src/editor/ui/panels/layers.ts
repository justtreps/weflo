import type { EditorState } from "../store";

export function layersPanel(state: EditorState): string {
  const kit = state.document.commerce?.brandKit;
  const fonts = ["Inter", "DM Sans", "Manrope", "Space Grotesk", "Playfair Display", "Libre Baskerville"];
  const fontSelect = (key: "headingFont" | "bodyFont", value: string) => `<select data-theme-key="${key}">${fonts.map((font) => `<option value="${font}"${font === value ? " selected" : ""}>${font}</option>`).join("")}</select>`;
  return `<section data-panel="layers"><p class="editor-panel-help">Your global brand system. Changes apply across every section.</p><div class="editor-brand-preview"><small>BRAND KIT</small><strong>${state.document.name}</strong><span style="font-family:${kit?.headingFont ?? "Inter"}">Aa</span></div><h3 class="editor-panel-heading">Colors</h3><div class="editor-theme-colors">${(["background","surface","ink","accent"] as const).map((key) => `<label><input type="color" data-theme-key="${key}" value="${state.document.theme[key]}"><small>${key}</small></label>`).join("")}</div><h3 class="editor-panel-heading">Typography</h3><label class="editor-theme-field"><small>Headlines</small>${fontSelect("headingFont", kit?.headingFont ?? "Inter")}</label><label class="editor-theme-field"><small>Body</small>${fontSelect("bodyFont", kit?.bodyFont ?? "Inter")}</label></section>`;
}
