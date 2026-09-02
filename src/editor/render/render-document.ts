import type { EditorBreakpoint, EditorDocument, EditorSection, StyleSettings, StyleValue } from "../document";
import { rendererForSection } from "./registry";
import { escapeEditorHtml } from "./render-section";

export type EditorRenderOptions = {
  mode: "edit" | "preview";
  breakpoint: EditorBreakpoint;
  selectedId?: string;
};

function cssName(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).replace(/[^a-z0-9-]/g, "");
}

function cssValue(key: string, value: StyleValue): string {
  if (typeof value === "number" && !/^(opacity|zIndex|fontWeight|lineHeight)$/.test(key)) return `${value}px`;
  return String(value);
}

function styleRule(sectionId: string, style: StyleSettings): string {
  const declarations = Object.entries(style).map(([key, value]) => `${cssName(key)}:${cssValue(key, value)}`).join(";");
  return declarations ? `[data-wf-section-id="${escapeEditorHtml(sectionId)}"]{${declarations}}` : "";
}

function sectionStyles(section: EditorSection): string {
  const desktop = styleRule(section.id, section.style);
  const tablet = styleRule(section.id, section.responsive.tablet ?? {});
  const mobile = styleRule(section.id, section.responsive.mobile ?? {});
  return `${desktop}${tablet ? `@media(max-width:1000px){${tablet}}` : ""}${mobile ? `@media(max-width:700px){${mobile}}` : ""}`;
}

function themeFont(display: EditorDocument["theme"]["display"]): string {
  if (display === "serif") return "Georgia,'Times New Roman',serif";
  if (display === "condensed") return "'Arial Narrow',Impact,sans-serif";
  return "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";
}

export function renderEditorDocument(document: EditorDocument, options: EditorRenderOptions): string {
  const page = document.pages[0];
  const sections = page.sections
    .filter((section) => options.mode === "edit" || !section.hidden)
    .map((section) => {
      const selected = options.mode === "edit" && section.id === options.selectedId ? ' data-wf-selected="true"' : "";
      const hidden = options.mode === "edit" && section.hidden ? ' data-wf-hidden="true"' : "";
      return `<section data-wf-section-id="${escapeEditorHtml(section.id)}" data-wf-section-type="${escapeEditorHtml(section.type)}"${selected}${hidden}>${rendererForSection(section.type)(section, page.name)}</section>`;
    }).join("");
  const scopedStyles = page.sections.map(sectionStyles).join("");
  const theme = document.theme;
  const radius = theme.radius === "none" ? "0px" : theme.radius === "round" ? "36px" : "18px";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEditorHtml(document.name)}</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${theme.background};color:${theme.ink};font:15px/1.5 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}a{color:inherit}.wf-v2-wrap{width:min(1180px,calc(100% - 56px));margin-inline:auto}.wf-v2-nav,.wf-v2-footer{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:24px}.wf-v2-nav>div{display:flex;gap:20px}.wf-v2-nav a{text-decoration:none}.wf-v2-split{min-height:620px;padding-block:52px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(28px,6vw,88px)}.wf-v2-media{margin:0;min-height:500px;background:${theme.surface};border-radius:${radius};overflow:hidden}.wf-v2-media img{display:block;width:100%;height:100%;min-height:500px;object-fit:cover}.wf-v2-media--empty{background:linear-gradient(145deg,${theme.surface},${theme.accent})}.wf-v2-kicker{text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.14em}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-family:${themeFont(theme.display)};font-size:clamp(42px,6vw,84px);line-height:.96;letter-spacing:-.045em;margin:.2em 0}.wf-v2-price{display:block;font-size:26px;margin-top:24px}.wf-v2-button{display:inline-flex;margin-top:22px;padding:14px 22px;border-radius:999px;background:${theme.ink};color:${theme.surface};font-weight:800;text-decoration:none}.wf-v2-content{padding-block:90px;border-top:1px solid color-mix(in srgb,${theme.ink} 16%,transparent)}.wf-v2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.wf-v2-grid article,.wf-v2-block{padding:22px;background:${theme.surface};border-radius:${radius}}.wf-v2-band{margin-block:56px;padding:44px;background:${theme.accent};border-radius:${radius};display:grid;grid-template-columns:1fr auto;gap:40px}.wf-v2-footer{border-top:1px solid ${theme.ink}}body[data-wf-mode="edit"] [data-wf-selected="true"]{outline:2px solid #315efb;outline-offset:-2px}body[data-wf-mode="edit"] [data-wf-hidden="true"]{opacity:.42}
@media(max-width:700px){.wf-v2-wrap{width:calc(100% - 28px)}.wf-v2-nav>div{display:none}.wf-v2-split{grid-template-columns:1fr;min-height:auto;padding-block:24px}.wf-v2-media,.wf-v2-media img{min-height:390px}.wf-v2-grid{grid-template-columns:1fr}.wf-v2-band{grid-template-columns:1fr;padding:28px}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-size:48px}}${scopedStyles}</style></head><body data-wf-mode="${options.mode}" data-wf-breakpoint="${options.breakpoint}">${sections}</body></html>`;
}

