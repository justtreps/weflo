import { createSectionDefinition } from "./factory";
import { blockValue, edit, escapeHtml, safeLink, safeMediaUrl, textControl, value } from "./shared";
import type { EditorSection } from "../editor/document";

const base = createSectionDefinition(
  "collectionGrid",
  "Grille de collections",
  "commerce",
  "cards",
  { collection_handle: "" },
  [textControl("collection_handle", "Collection Shopify", "text")],
);

export const collectionGridSection = {
  ...base,
  renderWeb: ({ section, pageName }: Parameters<typeof base.renderWeb>[0]) => {
    const title = value(section, "title", pageName);
    const subtitle = value(section, "subtitle");
    const copy = value(section, "text");
    const cards = section.blocks.map((block) => {
      const name = blockValue(block, "title", "[Nom de la collection]");
      const description = blockValue(block, "text");
      const media = safeMediaUrl(block.settings.image);
      const content = `${media ? `<img src="${media}" alt="${escapeHtml(blockValue(block, "image_alt", name))}" loading="lazy">` : ""}<h3>${escapeHtml(name)}</h3>${description ? `<p>${escapeHtml(description)}</p>` : ""}`;
      const link = blockValue(block, "link");
      return `<article class="wf-section__card" data-wf-block-id="${escapeHtml(block.id)}">${link ? `<a href="${safeLink(link)}">${content}</a>` : content}</article>`;
    }).join("");
    return `<section class="wf-section wf-collection-grid"><header>${subtitle ? edit("p", "subtitle", subtitle, "wf-section__eyebrow") : ""}${edit("h2", "title", title)}${copy ? edit("p", "text", copy, "wf-section__copy") : ""}</header><div class="wf-section__grid">${cards}</div></section>`;
  },
  renderLiquid: (_section?: EditorSection) => `<section class="wf-section weflo-collection-grid"><header><p>{{ section.settings.subtitle | escape }}</p><h2>{{ section.settings.title | escape }}</h2><div>{{ section.settings.text }}</div></header><div class="wf-section__grid">{% for block in section.blocks %}<article class="wf-section__card" {{ block.shopify_attributes }}>{% if block.settings.link != blank %}<a href="{{ block.settings.link }}">{% endif %}{% if block.settings.image != blank %}{{ block.settings.image | image_url: width: 900 | image_tag: alt: block.settings.title }}{% endif %}<h3>{{ block.settings.title | escape }}</h3><p>{{ block.settings.text }}</p>{% if block.settings.link != blank %}</a>{% endif %}</article>{% endfor %}</div></section>`,
};
