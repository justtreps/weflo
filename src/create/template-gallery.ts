import type { CreationTemplate, FormatFlow } from "./format-flow";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function renderPreview(template: CreationTemplate): string {
  const title = `Aperçu ${template.name}`;
  return `<div class="template-preview" data-template-preview="${esc(template.id)}" data-preview-device="desktop">
    <div class="template-preview-frame">
      <img src="${esc(template.previewDesktop)}" alt="${esc(title)} sur ordinateur" data-preview-image="desktop" data-preview-key="previewDesktop" onerror="this.classList.add('is-missing')">
      <img src="${esc(template.previewMobile)}" alt="${esc(title)} sur mobile" data-preview-image="mobile" data-preview-key="previewMobile" onerror="this.classList.add('is-missing')">
      <div class="template-preview-fallback" aria-hidden="true"><span>${esc(template.name)}</span><i></i><i></i><i></i></div>
    </div>
    <div class="template-device-switch" role="group" aria-label="Format de l’aperçu ${esc(template.name)}">
      <button type="button" data-template-device="desktop" aria-pressed="true">Ordinateur</button>
      <button type="button" data-template-device="mobile" aria-pressed="false">Mobile</button>
    </div>
  </div>`;
}

export function renderTemplateGallery(flow: FormatFlow, selectedTemplateId: string | null, templateUrl = (template: CreationTemplate) => `/creer?format=${flow.id}&template=${template.id}`): string {
  const selected = flow.templates.some((template) => template.id === selectedTemplateId) ? selectedTemplateId : null;
  const cards = flow.templates.map((template) => `<article class="template-card" data-template-card="${esc(template.id)}" ${template.id === selected ? 'data-selected="true"' : ""}>
    ${renderPreview(template)}
    <div class="template-card-copy"><div><h2>${esc(template.name)}</h2><p>${esc(template.description)}</p></div>
      <div class="template-card-actions"><button type="button" class="template-preview-button" data-template-open="${esc(template.id)}">Aperçu</button><a href="${esc(templateUrl(template))}" data-template-select="${esc(template.id)}">Choisir ce modèle</a></div>
    </div>
  </article>`).join("");

  return `<section class="template-gallery" aria-labelledby="template-gallery-title">
    <header class="template-gallery-heading"><p>${esc(flow.title)}</p><h1 id="template-gallery-title">Choisis une direction pour ta page.</h1><span>Chaque modèle pose la hiérarchie, le rythme et les sections de départ. Tu pourras tout ajuster dans l’éditeur.</span></header>
    <div class="template-gallery-list">${cards}</div>
  </section>
  <dialog class="template-preview-dialog" data-template-dialog aria-labelledby="template-dialog-title">
    <form method="dialog"><button class="template-dialog-close" aria-label="Fermer l’aperçu">×</button></form>
    <div class="template-dialog-content"><div class="template-dialog-copy"><p>${esc(flow.title)}</p><h2 id="template-dialog-title" data-template-dialog-title>Aperçu du modèle</h2><span data-template-dialog-description>Choisis ce modèle si cette composition te ressemble.</span><a data-template-dialog-select href="${esc(templateUrl(flow.templates[0]!))}">Choisir ce modèle</a></div>
      <div class="template-dialog-stage" data-preview-device="desktop"><img data-template-dialog-image alt="" onerror="this.classList.add('is-missing')"><div class="template-preview-fallback" aria-hidden="true"><span data-template-dialog-fallback>Modèle Weflo</span><i></i><i></i><i></i></div></div>
    </div>
  </dialog>`;
}
