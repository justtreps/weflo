import { createHash } from "node:crypto";
import type { EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { compileShopifySection } from "./compile-section";
import { shopifyHandle } from "./names";

export type ShopifyCompileTarget = { resource: "page" | "product" | "collection" | "home"; replaceGlobalTemplate?: boolean };
export type CompiledThemeFile = { key: string; value: string; checksum: string; operation: "upsert" };

function checksum(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function file(key: string, value: string): CompiledThemeFile { return { key, value, checksum: checksum(value), operation: "upsert" }; }
function setting(value: SettingValue): string | number | boolean | null | Array<string | number | boolean | null> { return value; }
function sectionKey(section: EditorSection, index: number): string { return `${shopifyHandle(section.type)}-${shopifyHandle(section.id)}-${index + 1}`.slice(0, 50); }

export function compileShopifyPage(document: EditorDocument, target: ShopifyCompileTarget): CompiledThemeFile[] {
  const page = document.pages[0];
  const slug = shopifyHandle(page.slug || document.modelId || page.name);
  const used = [...new Map(page.sections.map((section) => [section.type, section])).values()];
  const liquidFiles = used.map(compileShopifySection).sort((a, b) => a.key.localeCompare(b.key));
  const sections: Record<string, { type: string; disabled?: boolean; settings: Record<string, unknown>; blocks?: Record<string, unknown>; block_order?: string[] }> = {};
  const order: string[] = [];
  page.sections.forEach((section, index) => {
    const key = sectionKey(section, index);
    const blocks = Object.fromEntries(section.blocks.map((block) => [shopifyHandle(block.id), { type: block.type, settings: Object.fromEntries(Object.entries(block.settings).map(([name, current]) => [name, setting(current)])) }]));
    sections[key] = { type: `weflo-${shopifyHandle(section.type)}`, ...(section.hidden ? { disabled: true } : {}), settings: Object.fromEntries(Object.entries(section.settings).map(([name, current]) => [name, setting(current)])), ...(section.blocks.length ? { blocks, block_order: Object.keys(blocks) } : {}) };
    order.push(key);
  });
  const templateValue = JSON.stringify({ sections, order }, null, 2);
  const prefix = target.resource === "home" && target.replaceGlobalTemplate ? "index" : target.resource === "home" ? "page" : target.resource;
  const templateKey = target.replaceGlobalTemplate && (target.resource === "product" || target.resource === "home") ? `templates/${prefix}.json` : `templates/${prefix}.weflo-${slug}.json`;
  const scope = `.shopify-section:has(.wf-section),.shopify-section:has(.weflo-product-main)`;
  const css = `:root{--wf-background:${document.theme.background};--wf-surface:${document.theme.surface};--wf-ink:${document.theme.ink};--wf-accent:${document.theme.accent}}${scope}{background:var(--wf-background);color:var(--wf-ink)}.wf-section,.weflo-product-main{box-sizing:border-box;max-width:1240px;margin-inline:auto;padding:clamp(48px,7vw,104px) 28px}.wf-section img,.weflo-product-main img{display:block;width:100%;height:auto}.wf-section__button,.wf-product button,.weflo-product-main button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border:1px solid var(--wf-ink);border-radius:8px;background:var(--wf-ink);color:var(--wf-surface);font:700 15px/1.2 inherit;text-decoration:none}.wf-hero__atmosphere,.wf-hero__clinical,.wf-hero__problem,.wf-product,.weflo-product-main{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);gap:clamp(34px,6vw,90px);align-items:center}.wf-hero figure{margin:0;overflow:hidden}.wf-hero__image,.wf-hero__media img{aspect-ratio:4/5;object-fit:cover}.wf-hero h1,.wf-product h1,.weflo-product-main h1{font-size:clamp(42px,6vw,78px);line-height:.96;letter-spacing:-.05em;margin:14px 0 22px}.wf-hero__problem{background:var(--wf-ink);color:var(--wf-surface);max-width:none}.wf-hero__clinical dl{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wf-product,.weflo-product-main{position:relative;align-items:start}.wf-product__gallery{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wf-product__gallery>:first-child{grid-column:1/-1}.wf-product__image{aspect-ratio:1/1;object-fit:cover}.wf-product__buy-box{position:sticky;top:24px}.wf-product__prices{display:flex;align-items:center;gap:12px;font-size:23px;margin:18px 0}.wf-product__buy-box form{display:grid;gap:12px}.wf-product__buy-box label{display:grid;gap:6px}.wf-product__buy-box select,.wf-product__buy-box input{min-height:46px;border:1px solid currentColor;border-radius:7px;background:transparent;padding:9px}.wf-product__bundle{display:grid;gap:8px;margin:5px 0;padding:14px;border:1px solid currentColor;border-radius:10px}.wf-product__trust{text-align:center;font-size:12px;opacity:.7}.wf-product__sticky{display:none}.wf-proof__editorial-flow{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:14px}.wf-proof__results .wf-section__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.wf-section__card{padding:22px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:10px;background:var(--wf-surface)}@media(max-width:749px){.wf-section,.weflo-product-main{padding:44px 18px}.wf-hero__atmosphere,.wf-hero__clinical,.wf-hero__problem,.wf-product,.weflo-product-main{grid-template-columns:1fr;gap:24px}.wf-hero h1,.wf-product h1,.weflo-product-main h1{font-size:42px}.wf-product__buy-box{position:static}.wf-product__sticky{position:fixed;z-index:30;display:grid;grid-template-columns:1fr auto;align-items:center;left:10px;right:10px;bottom:10px;padding:10px 12px;border-radius:12px;background:var(--wf-ink);color:var(--wf-surface);box-shadow:0 10px 35px #0003}.wf-product__sticky span{font-size:12px}.wf-product__sticky strong{font-size:13px}.wf-product__sticky button{grid-column:2;grid-row:1/3}.wf-proof__editorial-flow,.wf-proof__results .wf-section__grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.wf-section *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}`;
  return [...liquidFiles.map((entry) => file(entry.key, entry.value)), file(`assets/weflo-${slug}.css`, css), file(templateKey, templateValue)];
}
