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
  const scope = `[data-wf-page="${slug}"]`;
  const css = `${scope}{--wf-background:${document.theme.background};--wf-surface:${document.theme.surface};--wf-ink:${document.theme.ink};--wf-accent:${document.theme.accent};color:var(--wf-ink);background:var(--wf-background)}${scope} .weflo-section{max-width:1200px;margin-inline:auto;padding:72px 28px}@media(max-width:749px){${scope} .weflo-section{padding:44px 18px}}`;
  return [...liquidFiles.map((entry) => file(entry.key, entry.value)), file(`assets/weflo-${slug}.css`, css), file(templateKey, templateValue)];
}
