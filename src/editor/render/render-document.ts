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
  const declarations = Object.entries(style).filter(([, value]) => value !== null).map(([key, value]) => `${cssName(key)}:${cssValue(key, value)}`).join(";");
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

function safeFont(value: string | undefined, fallback: string): string {
  const allowed = new Set(["Inter", "DM Sans", "Manrope", "Space Grotesk", "Playfair Display", "Libre Baskerville"]);
  return allowed.has(value ?? "") ? `'${value}',${fallback}` : fallback;
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
  const theme = document.theme;
  const radius = theme.radius === "none" ? "0px" : theme.radius === "round" ? "36px" : "18px";
  const headingFont = safeFont(document.commerce?.brandKit.headingFont, themeFont(theme.display));
  const bodyFont = safeFont(document.commerce?.brandKit.bodyFont, "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif");
  const scopedStyles = `body{font-family:${bodyFont}}.wf-section h1,.wf-section h2,.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-family:${headingFont}}${page.sections.map(sectionStyles).join("")}`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEditorHtml(document.name)}</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${theme.background};color:${theme.ink};font:15px/1.5 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}a{color:inherit}.wf-section{width:min(1180px,calc(100% - 56px));margin-inline:auto;padding-block:clamp(54px,8vw,112px)}.wf-section h1,.wf-section h2{max-width:900px;margin:.12em 0 .35em;font-family:${themeFont(theme.display)};font-size:clamp(42px,6.5vw,92px);font-weight:700;line-height:.94;letter-spacing:-.055em}.wf-section__eyebrow{text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.15em}.wf-section__copy{max-width:650px;font-size:clamp(17px,2vw,22px);line-height:1.45}.wf-section__button,.wf-section button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:24px;padding:0 22px;border:0;border-radius:${radius};background:${theme.ink};color:${theme.surface};font-weight:800;text-decoration:none;cursor:pointer}.wf-section__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:38px}.wf-section__card{padding:24px;border:1px solid color-mix(in srgb,${theme.ink} 14%,transparent);border-radius:${radius};background:${theme.surface}}.wf-section__card img,.wf-section__image{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:${radius}}.wf-media-empty{min-height:360px;background:linear-gradient(135deg,${theme.surface},color-mix(in srgb,${theme.accent} 70%,${theme.background}));border:1px dashed color-mix(in srgb,${theme.ink} 25%,transparent)}.wf-navigation{min-height:76px;padding-block:0;display:flex;align-items:center;justify-content:space-between;gap:24px}.wf-navigation>div{display:flex;gap:24px}.wf-navigation a{text-decoration:none}.wf-navigation__brand{font-weight:900;font-size:20px}.wf-navigation .wf-section__button{margin-top:0;min-height:40px}.wf-announcement{width:100%;padding:10px 28px;display:flex;justify-content:center;align-items:center;gap:18px;background:${theme.accent};text-align:center}.wf-announcement p{margin:0}.wf-announcement .wf-section__button{min-height:auto;margin:0;padding:0;background:transparent;color:inherit;text-decoration:underline}.wf-hero,.wf-image-text{min-height:680px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(32px,7vw,100px)}.wf-hero figure{margin:0}.wf-hero .wf-section__image,.wf-image-text>.wf-section__image{aspect-ratio:4/5;min-height:560px}.wf-video-hero{position:relative;width:100%;min-height:760px;padding:80px;display:grid;align-items:end;color:#fff;overflow:hidden}.wf-video-hero video,.wf-video-hero>.wf-section__image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.62)}.wf-video-hero>div{position:relative;z-index:1}.wf-gallery .wf-section__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wf-before-after__media{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:36px}.wf-product form{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin-top:28px}.wf-product label{display:grid;gap:6px}.wf-product input,.wf-product select,.wf-form input{min-height:48px;padding:0 12px;border:1px solid color-mix(in srgb,${theme.ink} 25%,transparent);border-radius:10px;background:${theme.background}}.wf-bundle fieldset,.wf-quiz fieldset{display:grid;gap:8px;margin-top:28px;padding:20px;border:1px solid color-mix(in srgb,${theme.ink} 18%,transparent);border-radius:${radius}}.wf-bundle label{display:grid;grid-template-columns:auto 1fr auto;gap:12px;padding:12px}.wf-bundle__total{display:block;margin-top:18px;font-size:22px;font-weight:800}.wf-faq details{padding:20px 0;border-bottom:1px solid color-mix(in srgb,${theme.ink} 18%,transparent)}.wf-faq summary{font-size:20px;font-weight:700;cursor:pointer}.wf-form form{display:flex;gap:10px;margin-top:30px}.wf-form label{display:grid;gap:5px;flex:1;max-width:440px}.wf-cta{width:min(1180px,calc(100% - 56px));margin-block:56px;padding:clamp(38px,7vw,90px);border-radius:${radius};background:${theme.accent}}.wf-footer{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid color-mix(in srgb,${theme.ink} 18%,transparent)}.wf-v2-wrap{width:min(1180px,calc(100% - 56px));margin-inline:auto}.wf-v2-nav,.wf-v2-footer{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:24px}.wf-v2-nav>div{display:flex;gap:20px}.wf-v2-nav a{text-decoration:none}.wf-v2-split{min-height:620px;padding-block:52px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(28px,6vw,88px)}.wf-v2-media{margin:0;min-height:500px;background:${theme.surface};border-radius:${radius};overflow:hidden}.wf-v2-media img{display:block;width:100%;height:100%;min-height:500px;object-fit:cover}.wf-v2-media--empty{background:linear-gradient(145deg,${theme.surface},${theme.accent})}.wf-v2-kicker{text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.14em}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-family:${themeFont(theme.display)};font-size:clamp(42px,6vw,84px);line-height:.96;letter-spacing:-.045em;margin:.2em 0}.wf-v2-price{display:block;font-size:26px;margin-top:24px}.wf-v2-button{display:inline-flex;margin-top:22px;padding:14px 22px;border-radius:999px;background:${theme.ink};color:${theme.surface};font-weight:800;text-decoration:none}.wf-v2-content{padding-block:90px;border-top:1px solid color-mix(in srgb,${theme.ink} 16%,transparent)}.wf-v2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.wf-v2-grid article,.wf-v2-block{padding:22px;background:${theme.surface};border-radius:${radius}}.wf-v2-band{margin-block:56px;padding:44px;background:${theme.accent};border-radius:${radius};display:grid;grid-template-columns:1fr auto;gap:40px}.wf-v2-footer{border-top:1px solid ${theme.ink}}body[data-wf-mode="edit"] [data-wf-selected="true"]{outline:2px solid #315efb;outline-offset:-2px}body[data-wf-mode="edit"] [data-wf-hidden="true"]{opacity:.42}
@media(max-width:700px){.wf-section{width:calc(100% - 28px);padding-block:54px}.wf-navigation>div{display:none}.wf-hero,.wf-image-text,.wf-footer{grid-template-columns:1fr;min-height:auto}.wf-hero .wf-section__image,.wf-image-text>.wf-section__image{min-height:390px}.wf-section__grid,.wf-gallery .wf-section__grid,.wf-before-after__media{grid-template-columns:1fr}.wf-video-hero{min-height:640px;padding:32px 20px}.wf-form form{display:grid}.wf-v2-wrap{width:calc(100% - 28px)}.wf-v2-nav>div{display:none}.wf-v2-split{grid-template-columns:1fr;min-height:auto;padding-block:24px}.wf-v2-media,.wf-v2-media img{min-height:390px}.wf-v2-grid{grid-template-columns:1fr}.wf-v2-band{grid-template-columns:1fr;padding:28px}.wf-v2-split h1,.wf-v2-split h2,.wf-v2-content h2,.wf-v2-band h2{font-size:48px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}${scopedStyles}</style></head><body data-wf-mode="${options.mode}" data-wf-breakpoint="${options.breakpoint}">${sections}</body></html>`;
}
