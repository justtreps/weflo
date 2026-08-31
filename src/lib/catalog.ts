import type { PageDocument, PageType, Section, SectionType } from "../types";

export const SECTION_TYPES: SectionType[] = [
  "navigation",
  "productHero",
  "benefits",
  "bundle",
  "guarantees",
  "reviews",
  "faq",
  "cta",
  "footer",
  "hero",
  "collectionGrid",
  "atelier",
  "article",
];

const TEMPLATES: Record<PageType, SectionType[]> = {
  sell: [
    "navigation",
    "productHero",
    "benefits",
    "bundle",
    "guarantees",
    "reviews",
    "faq",
    "cta",
    "footer",
  ],
  write: ["navigation", "article", "footer"],
  blank: ["navigation", "hero", "footer"],
};

export function initialDocument(name: string, type: PageType): PageDocument {
  const sections: Section[] = TEMPLATES[type].map((sectionType, i) => ({
    id: `${sectionType}-${i}`,
    type: sectionType,
    settings: { title: name },
  }));
  return { name, path: "/", sections };
}
