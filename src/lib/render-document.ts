import type { PageDocument, PageTheme, Section } from "../types";
import { migrateDocument } from "../editor/migrate";
import { renderEditorDocument } from "../editor/render/render-document";
import { DEFAULT_PAGE_THEME } from "./catalog";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function safeImage(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHtml(url.toString()) : "";
  } catch {
    return "";
  }
}

function text(settings: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) return escapeHtml(value.trim());
  }
  return "";
}

function themeValues(theme?: PageTheme) {
  const value = theme ?? DEFAULT_PAGE_THEME;
  const displays = {
    sans: "Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif",
    serif: "Georgia,'Times New Roman',serif",
    condensed: "'Arial Narrow','Roboto Condensed',Arial,sans-serif",
  } as const;
  const radii = { none: "0px", soft: "18px", round: "36px" } as const;
  return {
    background: safeColor(value.background, DEFAULT_PAGE_THEME.background),
    surface: safeColor(value.surface, DEFAULT_PAGE_THEME.surface),
    ink: safeColor(value.ink, DEFAULT_PAGE_THEME.ink),
    muted: safeColor(value.muted, DEFAULT_PAGE_THEME.muted),
    accent: safeColor(value.accent, DEFAULT_PAGE_THEME.accent),
    display: displays[value.display] ?? displays.sans,
    radius: radii[value.radius] ?? radii.soft,
  };
}

function media(section: Section, title: string): string {
  const image = safeImage(section.settings.image);
  if (!image) return `<div class="wf-media wf-media--empty"><span>${title.slice(0, 1)}</span></div>`;
  return `<div class="wf-media"><img src="${image}" alt="${title}" loading="lazy"></div>`;
}

function sectionHtml(section: Section, pageName: string): string {
  const title = text(section.settings, "title", "heading") || escapeHtml(pageName);
  const subtitle = text(section.settings, "subtitle", "subheading");
  const body = text(section.settings, "text", "body");
  const price = text(section.settings, "price");
  const cta = text(section.settings, "cta", "cta_label", "button") || "Découvrir";
  const picture = media(section, title);
  switch (section.type) {
    case "navigation":
      return "";
    case "footer":
      return `<footer class="wf-wrap wf-footer"><strong>${title}</strong><span>Conçu avec Weflo</span></footer>`;
    case "productHero":
      return `<main class="wf-wrap wf-product">${picture}<div class="wf-product__copy">${subtitle ? `<p class="wf-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p class="wf-lead">${body}</p>` : ""}${price ? `<p class="wf-price">${price}</p>` : ""}<a class="wf-button" href="#acheter">${cta}</a></div></main>`;
    case "hero":
      return `<main class="wf-wrap wf-hero"><div>${subtitle ? `<p class="wf-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p class="wf-lead">${body}</p>` : ""}<a class="wf-button" href="#commencer">${cta}</a></div>${picture}</main>`;
    case "benefits":
    case "guarantees":
    case "reviews":
    case "collectionGrid":
      return `<section class="wf-wrap wf-section"><p class="wf-kicker">${subtitle || section.type}</p><h2>${title}</h2><div class="wf-grid"><article><span>01</span><h3>${title}</h3><p>${body || "Pensé dans les moindres détails."}</p></article><article><span>02</span><h3>Simple au quotidien</h3><p>Une expérience claire, de la découverte à la livraison.</p></article><article><span>03</span><h3>Fait pour durer</h3><p>Des choix assumés et une qualité qui se remarque.</p></article></div></section>`;
    case "bundle":
      return `<section class="wf-wrap wf-band"><div><p class="wf-kicker">Ensemble exclusif</p><h2>${title}</h2><p>${body}</p></div><div>${price ? `<p class="wf-price">${price}</p>` : ""}<a class="wf-button" href="#acheter">${cta}</a></div></section>`;
    case "faq":
      return `<section class="wf-wrap wf-section wf-faq"><p class="wf-kicker">Questions fréquentes</p><h2>${title}</h2><details open><summary>${title}</summary><p>${body || "Toutes les réponses avant de commander."}</p></details><details><summary>Livraison et retours</summary><p>Suivi inclus et retour sous quatorze jours.</p></details></section>`;
    case "cta":
      return `<section class="wf-wrap wf-cta"><p class="wf-kicker">Prêt à commencer ?</p><h2>${title}</h2><p>${body}</p><a class="wf-button" href="#acheter">${cta}</a></section>`;
    case "atelier":
      return `<section class="wf-wrap wf-story">${picture}<div><p class="wf-kicker">Dans les coulisses</p><h2>${title}</h2><p>${body}</p></div></section>`;
    case "article":
      return `<article class="wf-wrap wf-article"><p class="wf-kicker">Journal</p><h1>${title}</h1><p class="wf-lead">${body}</p>${picture}</article>`;
    default:
      return `<section class="wf-wrap wf-section"><h2>${title}</h2><p>${body}</p></section>`;
  }
}

export function renderDocument(doc: PageDocument, options: { compact?: boolean } = {}): string {
  const theme = themeValues(doc.theme);
  const title = escapeHtml(doc.name);
  const content = doc.sections.map((section) => sectionHtml(section, doc.name)).join("");
  const compact = options.compact ? " wf-compact" : "";
  if (doc.referencePreviews && !options.compact) {
    return renderEditorDocument(migrateDocument(doc, "product"), {
      mode: "preview",
      breakpoint: "desktop",
    });
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  :root{--wf-bg:${theme.background};--wf-surface:${theme.surface};--wf-ink:${theme.ink};--wf-muted:${theme.muted};--wf-accent:${theme.accent};--wf-display:${theme.display};--wf-radius:${theme.radius}}
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wf-bg);color:var(--wf-ink);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;line-height:1.5}a{color:inherit}.wf-wrap{width:min(1180px,calc(100% - 56px));margin:auto}.wf-header{height:76px;display:flex;align-items:center;gap:28px;border-bottom:1px solid color-mix(in srgb,var(--wf-ink) 18%,transparent)}.wf-logo{margin-right:auto;font:800 23px/1 var(--wf-display);letter-spacing:-.04em}.wf-nav{display:flex;gap:22px;font-size:13px}.wf-cart{padding:10px 15px;border:1px solid var(--wf-ink);border-radius:999px;text-decoration:none}.wf-product,.wf-hero{display:grid;grid-template-columns:1.08fr .92fr;gap:clamp(34px,6vw,92px);align-items:center;min-height:690px;padding-block:54px}.wf-product__copy{padding:28px 0}.wf-media{min-height:520px;overflow:hidden;border-radius:var(--wf-radius);background:var(--wf-accent)}.wf-media img{width:100%;height:100%;min-height:520px;object-fit:cover;display:block}.wf-media--empty{display:grid;place-items:center;background:linear-gradient(145deg,var(--wf-surface),var(--wf-accent))}.wf-media--empty span{font:800 140px/1 var(--wf-display);opacity:.2}.wf-kicker{margin:0 0 18px;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800}.wf-product h1,.wf-hero h1,.wf-article h1{margin:0 0 24px;font:800 clamp(50px,7vw,92px)/.92 var(--wf-display);letter-spacing:-.055em}.wf-lead{max-width:620px;color:var(--wf-muted);font-size:19px}.wf-price{font:800 28px/1 var(--wf-display)}.wf-button{display:inline-flex;padding:15px 22px;margin-top:16px;border:1px solid var(--wf-ink);border-radius:999px;background:var(--wf-ink);color:var(--wf-surface);font-weight:800;text-decoration:none}.wf-section{padding-block:110px;border-top:1px solid color-mix(in srgb,var(--wf-ink) 18%,transparent)}.wf-section h2,.wf-band h2,.wf-cta h2,.wf-story h2{max-width:800px;margin:0 0 44px;font:800 clamp(38px,5vw,68px)/.96 var(--wf-display);letter-spacing:-.045em}.wf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.wf-grid article{min-height:240px;padding:28px;border:1px solid color-mix(in srgb,var(--wf-ink) 20%,transparent);border-radius:var(--wf-radius);background:var(--wf-surface)}.wf-grid article span{font-size:11px}.wf-grid h3{margin:56px 0 12px;font:800 22px/1.05 var(--wf-display)}.wf-grid p,.wf-band p,.wf-story p{color:var(--wf-muted)}.wf-band{width:min(1180px,calc(100% - 56px));margin:50px auto;display:grid;grid-template-columns:1fr auto;gap:60px;align-items:end;padding:46px;border-radius:var(--wf-radius);background:var(--wf-accent)}.wf-band h2{margin-bottom:16px}.wf-faq details{padding:22px 0;border-top:1px solid var(--wf-ink)}.wf-faq summary{font-weight:800;cursor:pointer}.wf-cta{margin-block:70px;padding-block:90px;text-align:center;border-radius:var(--wf-radius);background:var(--wf-ink);color:var(--wf-surface)}.wf-cta h2,.wf-cta p{margin-inline:auto}.wf-story{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center;padding-block:100px}.wf-article{padding-block:90px}.wf-article>.wf-media{margin-top:50px}.wf-footer{display:flex;justify-content:space-between;padding-block:35px;border-top:1px solid var(--wf-ink);font-size:12px}
  .wf-compact .wf-wrap{width:calc(100% - 28px)}.wf-compact .wf-header{height:44px}.wf-compact .wf-nav,.wf-compact .wf-cart{display:none}.wf-compact .wf-product,.wf-compact .wf-hero{min-height:420px;padding-block:18px;gap:20px}.wf-compact .wf-media,.wf-compact .wf-media img{min-height:360px}.wf-compact .wf-product h1,.wf-compact .wf-hero h1{font-size:46px}.wf-compact .wf-lead{font-size:13px}.wf-compact .wf-section{padding-block:50px}.wf-compact .wf-section h2,.wf-compact .wf-band h2,.wf-compact .wf-cta h2,.wf-compact .wf-story h2{font-size:34px}.wf-compact .wf-grid article{min-height:150px;padding:16px}.wf-compact .wf-grid h3{margin-top:28px;font-size:16px}.wf-compact .wf-band{width:calc(100% - 28px);padding:24px}.wf-compact .wf-story{padding-block:50px}.wf-compact .wf-cta{padding-block:48px}
  @media(max-width:700px){.wf-wrap{width:min(100% - 28px,1180px)}.wf-product,.wf-hero,.wf-story{grid-template-columns:1fr;min-height:auto}.wf-product{padding-top:20px}.wf-media,.wf-media img{min-height:390px}.wf-product h1,.wf-hero h1,.wf-article h1{font-size:50px}.wf-grid{grid-template-columns:1fr}.wf-band{width:calc(100% - 28px);grid-template-columns:1fr;padding:28px}.wf-nav{display:none}}
  </style></head><body class="weflo${compact}"><header class="wf-wrap wf-header"><strong class="wf-logo">${title}</strong><nav class="wf-nav"><a href="#produit">Produit</a><a href="#histoire">Histoire</a></nav><a class="wf-cart" href="#acheter">Panier · 0</a></header>${content}</body></html>`;
}
