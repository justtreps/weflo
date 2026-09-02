import type { EditorState } from "../store";

export function commercePanel(state: EditorState): string {
  const product = state.document.commerce?.sourceProduct;
  const page = state.document.pages.find((item) => item.id === state.pageId) ?? state.document.pages[0];
  const groups = [["Product", ["productHero", "gallery", "productMain"]], ["Bundles & offers", ["bundle", "cta"]], ["Target persona", ["benefits", "reviews", "testimonials"]], ["Marketing angle", ["imageText", "comparison", "guarantees"]]] as const;
  return `<section data-panel="commerce">${product ? `<div class="editor-product-card">${product.images[0] ? `<img src="${product.images[0]}" alt="">` : ""}<div><strong>${product.title}</strong><small>${product.vendor}</small></div></div>` : ""}<p class="editor-panel-help">Commerce blocks built from your product and strategy.</p><div class="editor-commerce-groups">${groups.map(([label, types]) => { const section = page.sections.find((item) => types.includes(item.type as never)); return `<button type="button" data-panel-action="${section ? "select" : "insert"}" ${section ? `data-section-id="${section.id}"` : `data-section-type="${types[0]}"`}><span><b>${label}</b><small>${section ? section.name : "Add to page"}</small></span><i>›</i></button>`; }).join("")}</div><a class="editor-shopify-link" href="/dashboard#shopify">Shopify connection & publishing →</a></section>`;
}
