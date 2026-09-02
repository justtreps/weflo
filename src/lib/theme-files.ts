import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import type { PageDocument, Section, SectionType } from "../types";

const SECTION_FILE: Record<SectionType, string | null> = {
  navigation: null,
  footer: null,
  productHero: "product-hero",
  benefits: "benefits",
  bundle: "bundle",
  guarantees: "guarantees",
  reviews: "reviews",
  faq: "faq",
  cta: "cta",
  hero: "hero",
  collectionGrid: "collection-grid",
  atelier: "atelier",
  article: "article",
};

export function shopifySectionType(type: SectionType): string | null {
  return SECTION_FILE[type];
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function collectThemeFiles(root = join(process.cwd(), "theme")): { key: string; value: string }[] {
  return walk(root)
    .map((full) => ({
      key: relative(root, full).split(sep).join(posix.sep),
      value: readFileSync(full, "utf8"),
    }))
    .filter((file) => !file.key.startsWith("."));
}

function settingText(settings: Record<string, unknown>, key: string): string {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

export function sectionToShopifySettings(section: Section): Record<string, string> {
  const s = section.settings;
  return {
    heading: settingText(s, "title") || settingText(s, "heading"),
    subheading: settingText(s, "subtitle") || settingText(s, "subheading"),
    text: settingText(s, "text") || settingText(s, "body"),
    price: settingText(s, "price"),
    image: settingText(s, "image"),
    button_label: settingText(s, "cta") || settingText(s, "cta_label") || settingText(s, "button"),
  };
}

function sectionKey(type: string, sectionId: string): string {
  const raw = `${type}-${sectionId}`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return raw.replace(/^-+|-+$/g, "") || type;
}

export function documentToTemplateJson(doc: PageDocument, _kind: "product" | "index"): string {
  const sections: Record<string, { type: string; settings: Record<string, string> }> = {};
  const order: string[] = [];
  for (const section of doc.sections) {
    const type = shopifySectionType(section.type);
    if (!type) continue;
    let id = sectionKey(type, section.id);
    if (sections[id]) id = sectionKey(type, `${section.id}-${order.length}`);
    sections[id] = { type, settings: sectionToShopifySettings(section) };
    order.push(id);
  }
  if (order.length === 0) {
    sections.hero = {
      type: "hero",
      settings: { heading: doc.name, subheading: "", text: "", price: "", image: "", button_label: "" },
    };
    order.push("hero");
  }
  return JSON.stringify({ sections, order }, null, 2);
}

export function shopifyThemeAssets(doc: PageDocument): { key: string; value: string }[] {
  const files = collectThemeFiles();
  const byKey = new Map(files.map((file) => [file.key, file]));
  const product = documentToTemplateJson(doc, "product");
  const index = documentToTemplateJson(doc, "index");
  byKey.set("templates/product.json", { key: "templates/product.json", value: product });
  byKey.set("templates/index.json", { key: "templates/index.json", value: index });
  byKey.set("templates/page.weflo.json", { key: "templates/page.weflo.json", value: index });
  return [...byKey.values()];
}
