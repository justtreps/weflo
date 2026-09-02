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

function editable(tag: "h1" | "h2" | "p" | "strong", key: string, value: string, className = ""): string {
  const cls = className ? ` class="${className}"` : "";
  return `<${tag}${cls} data-wf-edit-key="${key}">${value}</${tag}>`;
}

export function renderKnownSection(section: EditorSection, pageName: string): string {
  const title = text(section, "title", "heading") || escapeEditorHtml(pageName);
  const subtitle = text(section, "subtitle", "subheading");
  const body = text(section, "text", "body");
  const price = text(section, "price");
  const cta = text(section, "cta", "cta_label", "button") || "Découvrir";
  const image = safeMedia(section.settings.image);
  const variant = text(section, "variant") || "default";
  const media = image
    ? `<figure class="wf-v2-media"><img src="${image}" alt="${title}"></figure>`
    : `<div class="wf-v2-media wf-v2-media--empty" aria-label="Image à ajouter"></div>`;
  const blockMarkup = blocks(section);

  switch (section.type) {
    case "navigation":
      return `<nav class="wf-v2-wrap wf-v2-nav">${editable("strong", "title", title)}<div>${blockMarkup || "<a href=\"#product\">Produit</a><a href=\"#story\">Histoire</a>"}</div><a href="#cart">Panier</a></nav>`;
    case "footer":
      return `<footer class="wf-v2-wrap wf-v2-footer"><strong>${title}</strong><span>Conçu avec Weflo</span>${blockMarkup}</footer>`;
    case "productHero":
      return `<div class="wf-v2-wrap wf-v2-split wf-v2-hero--${variant}">${variant === "problem-solution" ? '<span class="wf-v2-problem-label">Le problème, résolu.</span>' : ""}${media}<div>${subtitle ? editable("p", "subtitle", subtitle, "wf-v2-kicker") : ""}${editable("h1", "title", title)}${body ? editable("p", "text", body) : ""}${price ? editable("strong", "price", price, "wf-v2-price") : ""}<a class="wf-v2-button" href="#buy">${cta}</a>${blockMarkup}</div></div>`;
    case "productMain":
      return `<div class="wf-v2-wrap wf-v2-product wf-v2-product--${variant}"><div class="wf-v2-product__gallery">${media}<div class="wf-v2-product__thumbs"><button>Image 1</button><button>Image 2</button></div></div><div class="wf-v2-product__buy-box">${editable("h1", "title", title)}${editable("p", "text", body)}<div class="wf-v2-product__prices">${editable("strong", "price", price, "wf-v2-price")}<s data-wf-edit-key="compare_at_price">${text(section,"compare_at_price")}</s></div>${blockMarkup}<label>Quantité<input type="number" value="1" min="1"></label><div class="wf-v2-product__bundle">Solo · Duo · Pack</div><button class="wf-v2-button">${cta}</button><p>Paiement sécurisé · Commande suivie</p></div><div class="wf-v2-product__sticky"><span>${title}</span><strong>${price}</strong><button>${cta}</button></div></div>`;
    case "hero":
      return `<div class="wf-v2-wrap wf-v2-split"><div>${subtitle ? editable("p", "subtitle", subtitle, "wf-v2-kicker") : ""}${editable("h1", "title", title)}${body ? editable("p", "text", body) : ""}<a class="wf-v2-button" href="#start">${cta}</a>${blockMarkup}</div>${media}</div>`;
    case "bundle":
    case "cta":
      return `<div class="wf-v2-wrap wf-v2-band"><div>${editable("p", "subtitle", subtitle || section.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}</div><div>${price ? editable("strong", "price", price, "wf-v2-price") : ""}<a class="wf-v2-button" href="#buy">${cta}</a></div>${blockMarkup}</div>`;
    case "faq":
      return `<div class="wf-v2-wrap wf-v2-content">${editable("h2", "title", title)}<details open><summary>${title}</summary>${editable("p", "text", body)}</details>${blockMarkup}</div>`;
    case "atelier":
    case "article":
      return `<div class="wf-v2-wrap wf-v2-split">${media}<div>${editable("p", "subtitle", subtitle || section.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}${blockMarkup}</div></div>`;
    default:
      return `<div class="wf-v2-wrap wf-v2-content">${editable("p", "subtitle", subtitle || section.type, "wf-v2-kicker")}${editable("h2", "title", title)}${editable("p", "text", body)}<div class="wf-v2-grid">${blockMarkup || `<article><h3>${title}</h3><p>${body || "Pensé dans les moindres détails."}</p></article><article><h3>Simple</h3><p>Une expérience claire.</p></article><article><h3>Durable</h3><p>Fait pour durer.</p></article>`}</div></div>`;
  }
}
