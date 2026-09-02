import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PageDocument, Section } from "../types";
import type { EditorDocument } from "../editor/document";
import { renderDocument } from "./render-document";

const INK = "#141310";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function settingText(settings: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function themeCss(): string {
  try {
    return readFileSync(join(process.cwd(), "theme", "assets", "theme.css"), "utf8");
  } catch {
    return `body{font-family:Syne,system-ui,sans-serif;background:#faf9f5;color:${INK}}`;
  }
}

function sectionInner(section: Section, pageName: string): string {
  const title = escapeHtml(settingText(section.settings, "title", "heading") || pageName);
  const sub = escapeHtml(settingText(section.settings, "subtitle", "subheading"));
  const text = escapeHtml(settingText(section.settings, "text", "body"));
  const price = escapeHtml(settingText(section.settings, "price"));
  const image = settingText(section.settings, "image");
  const cta = escapeHtml(settingText(section.settings, "cta", "cta_label", "button") || "Acheter");
  const media = image
    ? `<div class="wf-media"><img src="${escapeHtml(image)}" alt="${title}"></div>`
    : `<div class="wf-media"></div>`;

  switch (section.type) {
    case "navigation":
      return "";
    case "footer":
      return `<div class="wf-wrap wf-footer"><span>${title}</span><span>Weflo</span></div>`;
    case "productHero":
      return `<section class="wf-wrap wf-product">${media}<div>
        ${sub ? `<p class="wf-kicker">${sub}</p>` : ""}
        <h1 class="wf-title">${title}</h1>
        ${text ? `<p class="wf-lead">${text}</p>` : ""}
        ${price ? `<p class="wf-price">${price}</p>` : ""}
        <p><a class="wf-btn" href="#acheter">${cta}</a></p>
      </div></section>`;
    case "hero":
      return `<section class="wf-wrap wf-hero"><div>
        ${sub ? `<p class="wf-kicker">${sub}</p>` : ""}
        <h1 class="wf-title">${title}</h1>
        ${text ? `<p class="wf-lead">${text}</p>` : ""}
        <p><a class="wf-btn wf-btn--gold" href="#acheter">${cta}</a></p>
      </div>${media}</section>`;
    case "benefits":
    case "guarantees":
    case "reviews":
    case "collectionGrid":
      return `<section class="wf-wrap wf-sec"><h2>${title}</h2>
        <div class="wf-grid">
          <article class="wf-card"><h3>${title}</h3><p>${text || "Pensé pour convertir, pas pour décorer."}</p></article>
          <article class="wf-card"><h3>Livraison</h3><p>Suivi, emballage soigné.</p></article>
          <article class="wf-card"><h3>Retours</h3><p>14 jours pour changer d'avis.</p></article>
        </div></section>`;
    case "bundle":
      return `<section class="wf-wrap wf-sec"><div class="wf-card"><h2>${title}</h2><p>${text}</p>${price ? `<p class="wf-price">${price}</p>` : ""}</div></section>`;
    case "faq":
      return `<section class="wf-wrap wf-sec wf-faq"><h2>${title}</h2>
        <details open><summary>${title}</summary><p>${text || "Livraison sous 48h ouvrées."}</p></details>
      </section>`;
    case "cta":
      return `<section class="wf-wrap wf-sec"><div class="wf-cta"><h2>${title}</h2><p>${text}</p><a class="wf-btn wf-btn--gold" href="#acheter">${cta}</a></div></section>`;
    case "atelier":
      return `<section class="wf-wrap wf-hero">${media}<div><p class="wf-kicker">Atelier</p><h2 class="wf-title">${title}</h2><p class="wf-lead">${text}</p></div></section>`;
    case "article":
      return `<article class="wf-wrap wf-article"><h1 class="wf-title">${title}</h1><div class="wf-lead">${text}</div></article>`;
    default:
      return `<section class="wf-wrap wf-sec"><h2>${title}</h2><p>${text}</p></section>`;
  }
}

function wrapDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${themeCss()}</style>
</head>
<body class="weflo">
${body}
</body>
</html>`;
}

export function renderPage(doc: PageDocument | EditorDocument): string {
  return renderDocument(doc);
}

const CRYING_DUCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="Canard qui pleure">
  <ellipse cx="62" cy="78" rx="28" ry="22" fill="#e8c15a"/>
  <circle cx="58" cy="52" r="22" fill="#f2d36b"/>
  <ellipse cx="86" cy="54" rx="14" ry="8" fill="#e07a2f"/>
  <circle cx="52" cy="48" r="3.2" fill="#141310"/>
  <path d="M50 62c4 6 14 6 18 0" fill="none" stroke="#141310" stroke-width="2" stroke-linecap="round"/>
  <path d="M48 58c-1 8-3 14-2 20" fill="none" stroke="#6ec8e8" stroke-width="2" stroke-linecap="round"/>
  <circle cx="46" cy="80" r="2.2" fill="#6ec8e8"/>
</svg>`;

export function renderNotFound(): string {
  return wrapDocument(
    "404 — Page introuvable",
    `  <div class="wf-wrap wf-sec" style="text-align:center;padding:96px 0">
    ${CRYING_DUCK}
    <h1 class="wf-title">404</h1>
    <p>Page introuvable. Le canard pleure.</p>
  </div>`,
  );
}
