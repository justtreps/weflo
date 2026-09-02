import type { EditorDocument } from "../document";

export function sectionMoveTarget(document: EditorDocument, sectionId: string, direction: -1 | 1): { pageId: string; toIndex: number } | null {
  for (const page of document.pages) {
    const index = page.sections.findIndex((section) => section.id === sectionId);
    if (index < 0) continue;
    const target = index + direction;
    if (target < 0 || target >= page.sections.length) return null;
    return { pageId: page.id, toIndex: direction > 0 ? target + 1 : target };
  }
  return null;
}

