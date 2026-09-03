import { createHash } from "node:crypto";
import type { EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { compileShopifySection } from "./compile-section";
import { shopifySectionType } from "./compile-section";
import type { CustomSectionPublication } from "../custom-sections/service";
import { shopifyHandle } from "./names";
import { assertPublishCapabilities, buildCapabilityReport, type ShopifyCapabilityReport } from "./capability-report";
import { quantityOfferRuntimeExtensionSource, wefloProductRuntimeSource } from "./runtime/product-form";
import { designTokenStyle } from "../design/tokens";
import { getSectionDefinition } from "../sections";

export type ShopifyCompileTarget = { resource: "page" | "product" | "collection" | "home"; replaceGlobalTemplate?: boolean; capabilityReport?: ShopifyCapabilityReport; enforceCapabilities?: boolean; customSections?: readonly CustomSectionPublication[] };
export type CompiledThemeFile = { key: string; value: string; checksum: string; operation: "upsert" };

function checksum(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function file(key: string, value: string): CompiledThemeFile { return { key, value, checksum: checksum(value), operation: "upsert" }; }
export function compileThemeFile(key: string, value: string): CompiledThemeFile { return file(key, value); }
function setting(value: SettingValue): string | number | boolean | null | Array<string | number | boolean | null> { return value; }
function sectionKey(section: EditorSection, index: number): string { return `${shopifyHandle(section.type)}-${shopifyHandle(section.id)}-${index + 1}`.slice(0, 50); }

export function compileShopifyPage(document: EditorDocument, target: ShopifyCompileTarget): CompiledThemeFile[] {
  const report = target.capabilityReport ?? buildCapabilityReport({ sections: document.pages.flatMap((page) => page.sections) });
  if (target.enforceCapabilities || target.capabilityReport) assertPublishCapabilities(report);
  const page = document.pages[0];
  const slug = shopifyHandle(page.slug || document.modelId || page.name);
  const liquidFiles = [...new Map(page.sections.map((section) => {
    const compiled = compileShopifySection(section, target.customSections);
    return [compiled.key, compiled] as const;
  })).values()].sort((a, b) => a.key.localeCompare(b.key));
  const sections: Record<string, { type: string; disabled?: boolean; settings: Record<string, unknown>; blocks?: Record<string, unknown>; block_order?: string[] }> = {};
  const order: string[] = [];
  page.sections.forEach((section, index) => {
    const key = sectionKey(section, index);
    const blocks = Object.fromEntries(section.blocks.map((block) => [shopifyHandle(block.id), { type: block.type, settings: Object.fromEntries(Object.entries(block.settings).map(([name, current]) => [name, setting(current)])) }]));
    sections[key] = { type: shopifySectionType(section, target.customSections), ...(section.hidden ? { disabled: true } : {}), settings: Object.fromEntries(Object.entries(section.settings).map(([name, current]) => [name, setting(current)])), ...(section.blocks.length ? { blocks, block_order: Object.keys(blocks) } : {}) };
    order.push(key);
  });
  const templateValue = JSON.stringify({ sections, order }, null, 2);
  const prefix = target.resource === "home" && target.replaceGlobalTemplate ? "index" : target.resource === "home" ? "page" : target.resource;
  const templateKey = target.replaceGlobalTemplate && (target.resource === "product" || target.resource === "home") ? `templates/${prefix}.json` : `templates/${prefix}.weflo-${slug}.json`;
  const scope = `.shopify-section:has(.wf-section),.shopify-section:has(.weflo-product-main)`;
  const profileTokens = document.designProfile ? designTokenStyle(document.designProfile) : "";
  const css = `:root{--wf-background:${document.theme.background};--wf-surface:${document.theme.surface};--wf-ink:${document.theme.ink};--wf-accent:${document.theme.accent};${profileTokens}}${scope}{background:var(--wf-profile-background,var(--wf-background));color:var(--wf-profile-ink,var(--wf-ink))}.wf-section,.weflo-product-main{box-sizing:border-box;max-width:1240px;margin-inline:auto;padding:clamp(48px,7vw,104px) 28px}.wf-section img,.weflo-product-main img{display:block;width:100%;height:auto}.wf-section__button,.wf-product button,.weflo-product-main button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border:1px solid var(--wf-ink);border-radius:var(--wf-profile-button-radius,8px);background:var(--wf-ink);color:var(--wf-surface);font:700 15px/1.2 inherit;text-decoration:none}.wf-hero__atmosphere,.wf-hero__clinical,.wf-hero__problem,.wf-product,.weflo-product-main{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);gap:clamp(34px,6vw,90px);align-items:center}.wf-product__prices{display:flex;align-items:center;gap:12px;font-size:23px;margin:18px 0}.wf-product__form{display:grid;gap:12px}.wf-product__form label{display:grid;gap:6px}.wf-product__form select,.wf-product__form input{min-height:46px;border:1px solid currentColor;border-radius:7px;background:transparent;padding:9px}.wf-product__quantity-offers{display:flex;gap:8px;border:0;padding:0;margin:0}.wf-product__quantity-offers button{background:transparent;color:inherit;min-height:38px}.wf-product__setup{padding:12px;border:1px solid currentColor;border-radius:8px}.wf-proof__editorial-flow{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:14px}.wf-proof__results .wf-section__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.wf-section__card{padding:22px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:var(--wf-profile-card-radius,10px);background:var(--wf-surface)}@media(max-width:749px){.wf-section,.weflo-product-main{padding:44px 18px}.wf-hero__atmosphere,.wf-hero__clinical,.wf-hero__problem,.wf-product,.weflo-product-main{grid-template-columns:1fr;gap:24px}.wf-product__quantity-offers{flex-wrap:wrap}.wf-proof__editorial-flow,.wf-proof__results .wf-section__grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.wf-section *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}`;
  const commerceCapabilities = new Set(["product-form", "variant-selection", "quantity-breaks", "fixed-bundle", "selling-plan", "preorder"]);
  const needsProductRuntime = page.sections.some((section) => (getSectionDefinition(section.type)?.capabilities ?? []).some((capability) => commerceCapabilities.has(capability)))
    || (target.customSections ?? []).some((custom) => custom.section.spec.requiredCapabilities.some((capability) => commerceCapabilities.has(capability)));
  return [...liquidFiles.map((entry) => file(entry.key, entry.value)), file(`assets/weflo-${slug}.css`, css), ...(needsProductRuntime ? [file("assets/weflo-product-form.js", wefloProductRuntimeSource + quantityOfferRuntimeExtensionSource)] : []), file(templateKey, templateValue)];
}
