import type { EditorState } from "../store";

export function mediaPanel(state: EditorState): string {
  return `<section data-panel="media"><button type="button" class="editor-panel-primary" data-panel-action="uploadMedia">Importer un média</button><div class="editor-media-grid">${state.document.assets.length ? state.document.assets.map((asset) => `<button type="button" data-panel-action="pickMedia" data-asset-id="${asset.id}"><img src="${asset.url}" alt="${asset.alt ?? ""}"></button>`).join("") : "<p>Aucun média. Importe une image ou une vidéo.</p>"}</div></section>`;
}

