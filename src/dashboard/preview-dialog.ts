function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function renderPreviewDialog(input: { url: string; name: string }): string {
  return `<dialog class="preview-dialog" data-preview-dialog aria-label="Aperçu de ${escapeHtml(input.name)}">
    <header><div><span class="preview-live-dot"></span><strong>${escapeHtml(input.name)}</strong><small>Aperçu boutique</small></div><div class="preview-tools">
      <button class="is-active" data-preview-size="desktop" aria-label="Aperçu ordinateur">Ordinateur</button>
      <button data-preview-size="mobile" aria-label="Aperçu mobile">Mobile</button>
      <a href="${escapeHtml(input.url)}" target="_blank" rel="noreferrer" data-preview-fullscreen>Plein écran ↗</a>
      <button data-preview-close aria-label="Fermer l’aperçu">×</button>
    </div></header><div class="preview-stage"><iframe src="${escapeHtml(input.url)}" title="Aperçu de ${escapeHtml(input.name)}"></iframe></div>
  </dialog>`;
}
