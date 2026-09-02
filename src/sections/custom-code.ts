import { escapeHtml } from "./shared";
import type { SectionDefinition } from "./types";
import { validateCustomCode } from "../editor/custom-code-policy";

export const customCodeSection: SectionDefinition = {
  type: "customCode",
  name: "Code personnalisé",
  category: "layout",
  defaults: { html: "<div><h2>Ta section sur mesure</h2></div>", css: "", js: "" },
  settings: [
    { key: "html", label: "HTML", type: "code", scope: "settings" },
    { key: "css", label: "CSS", type: "code", scope: "settings" },
    { key: "js", label: "JavaScript local", type: "code", scope: "settings" },
  ],
  blocks: [],
  renderWeb: ({ section }) => {
    const html = String(section.settings.html ?? "");
    const css = String(section.settings.css ?? "");
    const js = String(section.settings.js ?? "");
    const validation = validateCustomCode({ html, css, js, allowedDomains: [], namespace: section.id });
    if (!validation.ok) return `<div class="wf-section wf-custom-error" role="alert"><strong>Cette section doit être corrigée</strong><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>`;
    const source = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}${css}</style><div data-wf-custom-id="${escapeHtml(section.id)}">${html}</div>${js ? `<script>${js}<\/script>` : ""}`;
    return `<iframe class="wf-custom-frame" title="Section personnalisée" sandbox="allow-scripts" srcdoc="${escapeHtml(source)}"></iframe>`;
  },
  renderLiquid: () => `<section class="weflo-custom-code" data-wf-custom-id="{{ section.id }}">{{ section.settings.html }}<style>{{ section.settings.css }}</style><script>{{ section.settings.js }}</script></section>`,
};
