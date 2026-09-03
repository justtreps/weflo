import type { DesignProfile } from "../design/profile";
import type { CustomNode, CustomSectionSpecV1 } from "./custom-spec";
import { compileCustomStyle } from "./custom-style";
import { validateCustomSectionSpec } from "./custom-validate";

export type CustomCompileInput = { spec: CustomSectionSpecV1; designProfile?: DesignProfile };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const binding = (name: string) => `{{${name}}}`;

function nodeWeb(node: CustomNode): string {
  switch (node.kind) {
    case "stack": return `<div class="wf-custom-stack">${node.children.map(nodeWeb).join("")}</div>`;
    case "grid": return `<div class="wf-custom-grid">${node.children.map(nodeWeb).join("")}</div>`;
    case "heading": return `<h2 class="wf-custom-heading">${binding(node.binding)}</h2>`;
    case "text": return `<p class="wf-custom-text">${binding(node.binding)}</p>`;
    case "button": return `<button class="wf-custom-button" type="button">${binding(node.binding)}</button>`;
    case "image": return `<img class="wf-custom-image" src="${binding(node.binding)}" alt="">`;
    case "icon": return `<span class="wf-custom-icon" aria-hidden="true">${binding(node.binding)}</span>`;
    case "repeater": return `<div class="wf-custom-grid">${node.template.map(nodeWeb).join("")}</div>`;
    case "product-form": return `<div class="wf-custom-commerce" data-wf-product-form>Formulaire produit Shopify</div>`;
    case "variant-selector": return `<div class="wf-custom-commerce" data-wf-variant-selector>Variantes Shopify</div>`;
    case "quantity-selector": return `<div class="wf-custom-commerce" data-wf-quantity-selector>Quantité</div>`;
  }
}

/** Deterministic HTML used in the sandbox; bindings remain inert text markers. */
export function compileCustomWeb(input: CustomCompileInput): string {
  const validation = validateCustomSectionSpec(input.spec);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  const spec = validation.value;
  return `<style>${compileCustomStyle(spec, input.designProfile)}</style><section data-wf-custom="${escapeHtml(spec.id)}" class="wf-custom-section" aria-label="${escapeHtml(spec.name)}">${spec.nodes.map(nodeWeb).join("")}</section>`;
}

export function customPreviewDocument(input: CustomCompileInput): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"></head><body>${compileCustomWeb(input)}</body></html>`;
}
