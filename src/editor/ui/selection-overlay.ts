export function selectionToolbarMarkup(sectionId: string): string {
  return `<div class="wf-canvas-toolbar" data-canvas-toolbar data-section-id="${sectionId}"><button type="button" data-canvas-action="moveUp" title="Monter">↑</button><button type="button" data-canvas-action="moveDown" title="Descendre">↓</button><button type="button" data-canvas-action="duplicate" title="Dupliquer">Dupliquer</button><button type="button" data-canvas-action="hide" title="Masquer">Masquer</button><button type="button" data-canvas-action="remove" title="Supprimer">Supprimer</button></div>`;
}

