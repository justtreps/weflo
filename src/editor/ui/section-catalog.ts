import { previewManifestsForCategory } from "../../section-preview/manifests";
import type { PreviewViewport } from "../../section-preview/types";

function escape(value:string):string { return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]!); }

export function sectionCatalogMarkup(input:{category?:string;viewport:PreviewViewport}):string {
  return previewManifestsForCategory(input.category).map((manifest)=>{
    const key=`${manifest.sectionType}:${manifest.variantId}`;
    return `<article class="section-catalog-card" data-section-variant="${escape(key)}">
      <button type="button" class="section-catalog-media" data-section-preview-open="${escape(key)}" aria-label="Voir ${escape(manifest.title)} en grand">
        <img src="${escape(manifest.preview[input.viewport])}" data-preview-desktop="${escape(manifest.preview.desktop)}" data-preview-mobile="${escape(manifest.preview.mobile)}" alt="Aperçu ${escape(manifest.title)}" loading="lazy">
        <span>Voir en grand ↗</span>
      </button>
      <div class="section-catalog-copy"><small>${escape(manifest.conversionGoal)}</small><strong>${escape(manifest.title)}</strong><em>${manifest.supportedArchetypes.map(escape).join(" · ")}</em></div>
      <button type="button" class="section-catalog-add" data-section-variant-insert="${escape(key)}">+ Ajouter</button>
    </article>`;
  }).join("");
}

export function sectionCatalogShellMarkup():string {
  const categories=[{id:"",label:"Tout"},{id:"hero",label:"Hero"},{id:"product",label:"Produit"},{id:"benefits",label:"Bénéfices"},{id:"proof",label:"Avis"},{id:"offer",label:"Offres"},{id:"faq",label:"FAQ"}];
  return `<div class="section-catalog" data-section-catalog data-catalog-category="" data-catalog-viewport="desktop">
    <div class="section-catalog-head"><div><strong>Sections premium</strong><small>Construites comme de vraies sections Shopify.</small></div><div class="section-catalog-viewports"><button type="button" data-catalog-viewport="desktop" aria-pressed="true">Bureau</button><button type="button" data-catalog-viewport="mobile" aria-pressed="false">Mobile</button></div></div>
    <div class="section-catalog-filters">${categories.map((item)=>`<button type="button" data-catalog-filter="${item.id}" aria-pressed="${item.id===""}">${item.label}</button>`).join("")}</div>
    <div class="section-catalog-grid" data-section-catalog-grid>${sectionCatalogMarkup({viewport:"desktop"})}</div>
  </div>`;
}
