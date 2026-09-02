import { createSectionDefinition } from "./factory";
import { edit, escapeHtml, image, safeLink, value } from "./shared";
import type { EditorSection } from "../editor/document";

const base = createSectionDefinition("productHero", "Hero produit", "commerce", "productHero", { price: "49,00 €", image: "", image_alt: "", variant: "ambient-editorial" });

export const productHeroSection = {
  ...base,
  renderWeb: ({ section, pageName }: Parameters<typeof base.renderWeb>[0]) => {
    const title = value(section, "title", pageName);
    const subtitle = value(section, "subtitle");
    const body = value(section, "text");
    const price = value(section, "price");
    const cta = value(section, "cta_label", "Ajouter au panier");
    const media = image(section, "image", value(section, "image_alt", title), "wf-hero__image");
    const action = `<a class="wf-section__button" href="${safeLink(section.settings.cta_link)}">${escapeHtml(cta)}</a>`;
    const variant = value(section, "variant", "ambient-editorial");
    if (variant === "problem-solution") return `<section class="wf-section wf-hero wf-hero__problem" data-wf-variant="problem-solution"><div class="wf-hero__problem-copy"><span>Le problème, résolu.</span>${edit("h1","title",title)}${edit("p","text",body)}<div class="wf-hero__proof">✓ Simple à choisir · ✓ Pensé pour le quotidien</div>${price ? edit("strong","price",price,"wf-section__price") : ""}${action}</div><figure>${media}<figcaption>${escapeHtml(subtitle)}</figcaption></figure></section>`;
    if (variant === "clinical-evidence") return `<section class="wf-section wf-hero wf-hero__clinical" data-wf-variant="clinical-evidence"><div><span class="wf-section__eyebrow">${escapeHtml(subtitle)}</span>${edit("h1","title",title)}${edit("p","text",body)}<dl><div><dt>Usage</dt><dd>Clair</dd></div><div><dt>Choix</dt><dd>Guidé</dd></div></dl>${action}</div><figure>${media}</figure></section>`;
    return `<section class="wf-section wf-hero wf-hero__atmosphere" data-wf-variant="${escapeHtml(variant)}"><figure>${media}</figure><div class="wf-hero__editorial-copy"><span class="wf-section__eyebrow">${escapeHtml(subtitle)}</span>${edit("h1","title",title)}${edit("p","text",body)}${price ? edit("strong","price",price,"wf-section__price") : ""}${action}</div></section>`;
  },
  renderLiquid: (section?: EditorSection) => {
    const variant = section ? value(section, "variant", "ambient-editorial") : "ambient-editorial";
    const modifier = variant === "problem-solution" ? "wf-hero__problem" : variant === "clinical-evidence" ? "wf-hero__clinical" : "wf-hero__atmosphere";
    return `<section class="wf-section wf-hero ${modifier}" data-wf-variant="${escapeHtml(variant)}"><div class="wf-hero__media">{{ section.settings.image | image_url: width: 1800 | image_tag }}</div><div class="wf-hero__content"><p>{{ section.settings.subtitle | escape }}</p><h1>{{ section.settings.title | escape }}</h1><div>{{ section.settings.text }}</div><strong>{{ section.settings.price | escape }}</strong><a href="{{ section.settings.cta_link }}">{{ section.settings.cta_label | escape }}</a></div></section>`;
  },
};
