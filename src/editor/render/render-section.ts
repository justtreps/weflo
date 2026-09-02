import type { EditorBlock, EditorSection, SettingValue } from "../document";

export function escapeEditorHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function text(section: EditorSection, ...keys: string[]): string {
  for (const key of keys) {
    const value = section.settings[key];
    if (typeof value === "string" && value.trim()) return escapeEditorHtml(value.trim());
  }
  return "";
}

function safeMedia(value: SettingValue | undefined): string {
  if (typeof value !== "string") return "";
  if (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value)) return escapeEditorHtml(value);
  return "";
}

function blocks(section: EditorSection): string {
  return section.blocks.map((block: EditorBlock) => {
    const label = typeof block.settings.label === "string" ? block.settings.label : typeof block.settings.text === "string" ? block.settings.text : block.type;
    return `<div class="wf-v2-block" data-wf-block-id="${escapeEditorHtml(block.id)}">${escapeEditorHtml(label)}</div>`;
  }).join("");
}

export function renderKnownSection(section: EditorSection, pageName: string): string {
  const title = text(section, "title", "heading") || escapeEditorHtml(pageName);
  const subtitle = text(section, "subtitle", "subheading");
  const body = text(section, "text", "body");
  const price = text(section, "price");
  const cta = text(section, "cta", "cta_label", "button") || "Découvrir";
  const image = safeMedia(section.settings.image);
  const media = image
    ? `<figure class="wf-v2-media"><img src="${image}" alt="${title}"></figure>`
    : `<div class="wf-v2-media wf-v2-media--empty" aria-label="Image à ajouter"></div>`;
  const blockMarkup = blocks(section);

  switch (section.type) {
    case "navigation":
      return `<nav class="wf-v2-wrap wf-v2-nav"><strong>${title}</strong><div>${blockMarkup || "<a href=\"#product\">Produit</a><a href=\"#story\">Histoire</a>"}</div><a href="#cart">Panier</a></nav>`;
    case "footer":
      return `<footer class="wf-v2-wrap wf-v2-footer"><strong>${title}</strong><span>Conçu avec Weflo</span>${blockMarkup}</footer>`;
    case "productHero":
      return `<div class="wf-v2-wrap wf-v2-split">${media}<div>${subtitle ? `<p class="wf-v2-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p>${body}</p>` : ""}${price ? `<strong class="wf-v2-price">${price}</strong>` : ""}<a class="wf-v2-button" href="#buy">${cta}</a>${blockMarkup}</div></div>`;
    case "hero":
      return `<div class="wf-v2-wrap wf-v2-split"><div>${subtitle ? `<p class="wf-v2-kicker">${subtitle}</p>` : ""}<h1>${title}</h1>${body ? `<p>${body}</p>` : ""}<a class="wf-v2-button" href="#start">${cta}</a>${blockMarkup}</div>${media}</div>`;
    case "bundle":
    case "cta":
      return `<div class="wf-v2-wrap wf-v2-band"><div><p class="wf-v2-kicker">${subtitle || section.type}</p><h2>${title}</h2><p>${body}</p></div><div>${price ? `<strong class="wf-v2-price">${price}</strong>` : ""}<a class="wf-v2-button" href="#buy">${cta}</a></div>${blockMarkup}</div>`;
    case "faq":
      return `<div class="wf-v2-wrap wf-v2-content"><h2>${title}</h2><details open><summary>${title}</summary><p>${body}</p></details>${blockMarkup}</div>`;
    case "atelier":
    case "article":
      return `<div class="wf-v2-wrap wf-v2-split">${media}<div><p class="wf-v2-kicker">${subtitle || section.type}</p><h2>${title}</h2><p>${body}</p>${blockMarkup}</div></div>`;
    default:
      return `<div class="wf-v2-wrap wf-v2-content"><p class="wf-v2-kicker">${subtitle || section.type}</p><h2>${title}</h2><p>${body}</p><div class="wf-v2-grid">${blockMarkup || `<article><h3>${title}</h3><p>${body || "Pensé dans les moindres détails."}</p></article><article><h3>Simple</h3><p>Une expérience claire.</p></article><article><h3>Durable</h3><p>Fait pour durer.</p></article>`}</div></div>`;
  }
}

