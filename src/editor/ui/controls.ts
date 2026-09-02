import type { EditorSection, SettingValue, StyleValue } from "../document";
import type { InspectorControl } from "../section-schema";

function escape(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function controlValue(section: EditorSection, control: InspectorControl, breakpoint: "desktop" | "tablet" | "mobile"): SettingValue | StyleValue | undefined {
  if (control.scope === "settings") return section.settings[control.key];
  if (control.scope === "responsive") return section.responsive[breakpoint]?.[control.key];
  return section.style[control.key];
}

export function inspectorControlMarkup(section: EditorSection, control: InspectorControl, breakpoint: "desktop" | "tablet" | "mobile"): string {
  const value = controlValue(section, control, breakpoint);
  const attrs = `data-inspector-control="${control.type}" data-inspector-scope="${control.scope}" data-inspector-key="${control.key}"`;
  if (control.type === "textarea" || control.type === "code") return `<label class="editor-control"><span>${control.label}</span><textarea ${attrs} rows="${control.type === "code" ? 8 : 4}">${escape(value)}</textarea></label>`;
  if (control.type === "select") return `<label class="editor-control"><span>${control.label}</span><select ${attrs}>${control.options?.map((option) => `<option value="${option}"${value === option ? " selected" : ""}>${option}</option>`).join("")}</select></label>`;
  if (control.type === "toggle") return `<label class="editor-control editor-control--toggle"><span>${control.label}</span><input type="checkbox" ${attrs}${value ? " checked" : ""}></label>`;
  const inputType = control.type === "number" ? "number" : control.type === "color" ? "color" : "text";
  return `<label class="editor-control"><span>${control.label}</span><input type="${inputType}" ${attrs} value="${escape(value)}">${control.type === "image" && value ? `<button type="button" class="editor-image-ai" data-image-ai data-image-key="${control.key}">✦ Edit with AI</button>` : ""}</label>`;
}
