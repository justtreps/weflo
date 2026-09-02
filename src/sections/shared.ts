import type { EditorBlock, EditorSection, SettingValue } from "../editor/document";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function safeMediaUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,|\/(?!\/))/i.test(url) ? escapeHtml(url) : "";
}

export function safeLink(value: unknown): string {
  if (typeof value !== "string") return "#";
  const url = value.trim();
  return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(url) ? escapeHtml(url) : "#";
}

export function formatPrice(cents: number, currency = "EUR", locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function value(section: EditorSection, key: string, fallback = ""): string {
  const current = section.settings[key];
  return typeof current === "string" || typeof current === "number" ? String(current) : fallback;
}

export function bool(section: EditorSection, key: string, fallback = false): boolean {
  const current = section.settings[key];
  return typeof current === "boolean" ? current : fallback;
}

export function edit(tag: string, key: string, content: unknown, className = ""): string {
  return `<${tag}${className ? ` class="${escapeHtml(className)}"` : ""} data-wf-edit-key="${escapeHtml(key)}">${escapeHtml(content)}</${tag}>`;
}

export function image(section: EditorSection, key = "image", alt = "", className = "wf-section__image"): string {
  const url = safeMediaUrl(section.settings[key]);
  return url
    ? `<img class="${escapeHtml(className)}" src="${url}" alt="${escapeHtml(alt)}" loading="lazy" data-wf-media-key="${escapeHtml(key)}">`
    : `<div class="${escapeHtml(className)} wf-media-empty" data-wf-media-key="${escapeHtml(key)}" role="img" aria-label="Ajouter une image"></div>`;
}

export function blockValue(block: EditorBlock, key: string, fallback = ""): string {
  const current: SettingValue | undefined = block.settings[key];
  return typeof current === "string" || typeof current === "number" ? String(current) : fallback;
}

export function sectionStyle(section: EditorSection): string {
  const background = typeof section.style.backgroundColor === "string" ? `--wf-bg:${escapeHtml(section.style.backgroundColor)};` : "";
  const color = typeof section.style.color === "string" ? `--wf-color:${escapeHtml(section.style.color)};` : "";
  const top = typeof section.style.paddingTop === "number" ? `--wf-pt:${section.style.paddingTop}px;` : "";
  const bottom = typeof section.style.paddingBottom === "number" ? `--wf-pb:${section.style.paddingBottom}px;` : "";
  return background + color + top + bottom;
}

export const textControl = (key: string, label: string, type: "text" | "textarea" | "link" | "image" = "text") => ({ key, label, type, scope: "settings" as const });
