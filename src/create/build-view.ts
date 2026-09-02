import type { BuildStage } from "../onboarding/types";

function esc(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!); }

export function renderBuildExperience(input: { brandName: string; formatTitle: string; stages: BuildStage[]; activeIndex: number; productImage?: string | null }): string {
  const total = Math.max(input.stages.length, 1);
  const activeIndex = Math.min(Math.max(input.activeIndex, 0), total - 1);
  const progress = Math.round(((activeIndex + 1) / total) * 100);
  const current = input.stages[activeIndex]?.label ?? "Finalisation de la page";
  const visible = input.stages.slice(Math.max(0, activeIndex - 2), Math.min(total, activeIndex + 4));
  const image = input.productImage && /^(https:\/\/|data:image\/)/.test(input.productImage) ? input.productImage : null;
  const previewSections = ["navigation", "hero", "offre", "bénéfices", "preuves sociales"];

  return `<main class="build-experience">
    <header class="build-topbar"><div><span>${esc(input.formatTitle)}</span><strong>${esc(input.brandName)} prend forme</strong></div><div class="build-percent"><b>${progress}%</b><span>Construction</span></div></header>
    <div class="build-progress" data-build-progress="${progress}" role="progressbar" aria-label="Construction de la page : ${progress} %" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
    <div class="build-layout">
      <section class="build-status">
        <div class="canardo-status"><span class="canardo-orbit">●</span><div><small>Canardo travaille maintenant</small><h1>${esc(current)}</h1><p>La structure, les textes et la direction visuelle sont assemblés dans une même identité.</p></div></div>
        <div class="stage-stream">${visible.map((stage) => { const index = input.stages.indexOf(stage); const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting"; return `<div class="stage-row" data-stage-state="${state}"><i>${state === "done" ? "✓" : state === "active" ? "●" : ""}</i><span>${esc(stage.label)}</span>${state === "active" ? "<em>en cours</em>" : ""}</div>`; }).join("")}</div>
        <div class="build-note"><span>✦</span><p><strong>Une seule direction de marque.</strong> Chaque nouvelle section reprend les mêmes couleurs, espacements et règles typographiques.</p></div>
      </section>
      <section class="storefront-window" data-build-preview>
        <div class="browser-chrome"><i></i><i></i><i></i><span>${esc(input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")) || "boutique"}.com</span><b>aperçu en direct</b></div>
        <div class="storefront-canvas">
          <div class="preview-nav preview-part ${activeIndex >= 0 ? "is-built" : ""}" data-preview-section="navigation"><strong>${esc(input.brandName)}</strong><span>Boutique&nbsp;&nbsp; À propos&nbsp;&nbsp; Journal</span><button>Panier (0)</button></div>
          <div class="preview-hero preview-part ${activeIndex >= 1 ? "is-built" : ""}" data-preview-section="hero"><div><small>La sélection ${esc(input.brandName)}</small><h2>Le produit pensé pour ton quotidien.</h2><p>Une promesse claire, une preuve crédible et un parcours sans friction.</p><button>Découvrir le produit</button></div><div class="preview-media">${image ? `<img src="${esc(image)}" alt="Produit importé">` : "<span></span>"}</div></div>
          <div class="preview-trust preview-part ${activeIndex >= 2 ? "is-built" : ""}" data-preview-section="offre"><span>Livraison suivie</span><span>Paiement sécurisé</span><span>30 jours pour essayer</span></div>
          <div class="preview-benefits preview-part ${activeIndex >= 3 ? "is-built" : ""}" data-preview-section="bénéfices"><article><i>01</i><strong>Conçu avec intention</strong><p>Le bénéfice principal expliqué sans détour.</p></article><article><i>02</i><strong>Simple à adopter</strong><p>Une démonstration visuelle qui rassure.</p></article><article><i>03</i><strong>Fait pour durer</strong><p>Des preuves concrètes avant la promesse.</p></article></div>
          <div class="preview-proof preview-part ${activeIndex >= 4 ? "is-built" : ""}" data-preview-section="preuves"><div><span>★★★★★</span><strong>“C’est exactement ce que je cherchais.”</strong><small>Acheteur vérifié</small></div><div class="proof-image"></div></div>
          <div class="preview-building"><span></span><span></span><span></span></div>
        </div>
      </section>
    </div>
  </main>`;
}
