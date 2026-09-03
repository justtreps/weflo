import type { DesignProfile } from "../design/profile";
import type { CustomSectionSpecV1 } from "./custom-spec";

function cssValue(value: string): string { return value.replace(/[^#(),.%\- a-zA-Z0-9]/g, ""); }

/** Emits a small, fully namespaced stylesheet. The DSL never carries CSS. */
export function compileCustomStyle(spec: CustomSectionSpecV1, profile?: DesignProfile): string {
  const id = spec.id.replace(/[^a-z0-9-]/g, "");
  const root = `[data-wf-custom="${id}"]`;
  const colors = profile?.colors ?? { background: "#ffffff", surface: "#f7f7f5", ink: "#171715", accent: "#171715" };
  const spacing = profile?.spacing ?? { section: 72, gap: 20 };
  const radius = profile?.radius ?? { card: 16, button: 999 };
  return `${root}{--wf-custom-bg:${cssValue(colors.background)};--wf-custom-surface:${cssValue(colors.surface)};--wf-custom-ink:${cssValue(colors.ink)};--wf-custom-accent:${cssValue(colors.accent)};--wf-custom-gap:${Math.max(0, Math.min(160, spacing.gap))}px;--wf-custom-radius:${Math.max(0, Math.min(48, radius.card))}px;box-sizing:border-box;color:var(--wf-custom-ink);background:var(--wf-custom-bg);padding:${Math.max(0, Math.min(160, spacing.section))}px clamp(16px,4vw,64px)}${root} *,${root} *:before,${root} *:after{box-sizing:border-box}${root} .wf-custom-stack{display:grid;gap:var(--wf-custom-gap)}${root} .wf-custom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--wf-custom-gap)}${root} .wf-custom-card{padding:24px;border:1px solid color-mix(in srgb,var(--wf-custom-ink) 14%,transparent);border-radius:var(--wf-custom-radius);background:var(--wf-custom-surface)}${root} .wf-custom-heading{margin:0;font-family:inherit;font-size:clamp(28px,4vw,52px);line-height:1.05}${root} .wf-custom-text{margin:0;line-height:1.55}${root} .wf-custom-button{display:inline-flex;justify-content:center;align-items:center;min-height:44px;padding:12px 20px;border:0;border-radius:${Math.max(0, Math.min(48, radius.button))}px;background:var(--wf-custom-accent);color:var(--wf-custom-bg);text-decoration:none;font:inherit;font-weight:700}${root} .wf-custom-image{display:block;width:100%;height:auto;border-radius:var(--wf-custom-radius)}${root} .wf-custom-icon{display:inline-flex;width:1.25em;height:1.25em;align-items:center;justify-content:center;border-radius:50%;background:var(--wf-custom-accent);color:var(--wf-custom-bg)}${root} .wf-custom-commerce{padding:20px;border:1px solid color-mix(in srgb,var(--wf-custom-ink) 14%,transparent);border-radius:var(--wf-custom-radius)}@media (max-width: 700px){${root}{padding:48px 20px}${root} .wf-custom-grid{grid-template-columns:1fr}${root} .wf-custom-heading{font-size:32px}}`;
}
