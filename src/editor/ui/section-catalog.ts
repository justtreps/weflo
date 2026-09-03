import { querySectionCatalog } from "../../section-preview/manifests";
import type { PreviewViewport, SectionCatalogQuery } from "../../section-preview/types";

function escape(value:string):string { return value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]!); }

const FAMILIES = [
  ["", "Tout"], ["headers-navigation", "En-têtes"], ["heroes", "Héros"], ["product-purchase", "Produit et achat"], ["variants-options", "Variantes"], ["bundles-offers", "Bundles et offres"], ["subscriptions-preorders", "Abonnements"], ["benefits", "Bénéfices"], ["demo-media", "Médias"], ["before-after", "Avant / après"], ["reviews-ugc", "Avis et UGC"], ["comparison", "Comparaison"], ["ingredients-materials", "Détails"], ["collections-recommendations", "Collections"], ["brand-story", "Histoire"], ["advertorial", "Advertorial"], ["listicle", "Listicle"], ["quiz-forms", "Quiz et formulaires"], ["faq-trust", "FAQ et confiance"], ["conversion-capture", "Conversion"], ["footer-utilities", "Footer"], ["custom", "Sur mesure"],
] as const;

function stateLabel(state:"native"|"app-required"|"unavailable"):string { return state === "native" ? "Natif" : state === "app-required" ? "Application requise" : "Indisponible"; }
function queryFrom(input:{category?:string;viewport:PreviewViewport;query?:SectionCatalogQuery}):SectionCatalogQuery { return {...input.query,...(input.category ? {category:input.category} : {})}; }

export function sectionCatalogMarkup(input:{category?:string;viewport:PreviewViewport;query?:SectionCatalogQuery}):string {
  const catalogQuery=queryFrom(input);
  const results=querySectionCatalog(catalogQuery);
  if (!results.length) return `<p class="section-catalog-empty">Aucune section ne correspond à cette recherche.</p>`;
  return results.map((manifest)=>{
    const key=`${manifest.sectionType}:${manifest.variantId}`;
    const badges=manifest.capabilityBadges.map((badge)=>`<span class="section-catalog-badge is-${badge.state}" title="${escape(stateLabel(badge.state))}">${escape(badge.label)}</span>`).join("");
    const required=manifest.requiredData?.length ? `<small class="section-catalog-required">Données : ${escape(manifest.requiredData.join(" · "))}</small>` : "";
    return `<article class="section-catalog-card" data-section-variant="${escape(key)}">
      <button type="button" class="section-catalog-media" data-section-preview-open="${escape(key)}" aria-label="Voir ${escape(manifest.title)} en grand">
        <img src="${escape(manifest.preview[input.viewport])}" data-preview-desktop="${escape(manifest.preview.desktop)}" data-preview-mobile="${escape(manifest.preview.mobile)}" alt="Aperçu ${escape(manifest.title)}" loading="lazy">
        <span>Voir en grand ↗</span>
      </button>
      <div class="section-catalog-copy"><small>${escape(manifest.conversionGoal)}</small><strong>${escape(manifest.title)}</strong><em>${escape(manifest.family ?? "Sur mesure")}</em>${badges ? `<div class="section-catalog-badges">${badges}</div>` : ""}${required}</div>
      <button type="button" class="section-catalog-add" data-section-variant-insert="${escape(key)}">+ Ajouter</button>
    </article>`;
  }).join("");
}

export function sectionCatalogShellMarkup():string {
  return `<div class="section-catalog" data-section-catalog data-catalog-family="" data-catalog-viewport="desktop" data-catalog-sort="recommended">
    <div class="section-catalog-head"><div><strong>Sections premium</strong><small>Prévisualise, puis ajoute une composition adaptée à ta boutique.</small></div><div class="section-catalog-viewports"><button type="button" data-catalog-viewport="desktop" aria-pressed="true">Bureau</button><button type="button" data-catalog-viewport="mobile" aria-pressed="false">Mobile</button></div></div>
    <label class="section-catalog-search"><span class="sr-only">Rechercher une section</span><input type="search" data-catalog-search placeholder="Rechercher : bundle, avis, quantité…" autocomplete="off"></label>
    <div class="section-catalog-sort"><label>Trier <select data-catalog-sort-select><option value="recommended">Recommandées</option><option value="newest">Nouveautés</option><option value="popular">Les plus utilisées</option></select></label><label>Capacité <select data-catalog-capability><option value="">Toutes</option><option value="product-form">Formulaire produit</option><option value="variant-selection">Variantes Shopify</option><option value="fixed-bundle">Bundle fixe</option><option value="quantity-breaks">Paliers de quantité</option><option value="selling-plan">Abonnement</option><option value="app-blocks">Bloc d’application</option></select></label></div>
    <div class="section-catalog-filters" role="tablist" aria-label="Familles de sections">${FAMILIES.map(([id,label])=>`<button type="button" data-catalog-filter="${id}" aria-pressed="${id===""}">${label}</button>`).join("")}</div>
    <div class="section-catalog-grid" data-section-catalog-grid>${sectionCatalogMarkup({viewport:"desktop"})}</div>
  </div>`;
}
