import type { EditorDocument } from "../document";

export type SectionDragTarget = { pageId: string; toIndex: number };
export type BlockDragTarget = { sectionId: string; toIndex: number };
export type DropPosition = "before" | "after";

export function pointerDropPosition(clientY: number, bounds: { top: number; height: number }): DropPosition {
  return clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

export function sectionMoveTarget(document: EditorDocument, sectionId: string, direction: -1 | 1): SectionDragTarget | null {
  for (const page of document.pages) {
    const index = page.sections.findIndex((section) => section.id === sectionId);
    if (index < 0) continue;
    const target = index + direction;
    if (target < 0 || target >= page.sections.length) return null;
    return { pageId: page.id, toIndex: direction > 0 ? target + 1 : target };
  }
  return null;
}

/**
 * Turns a pointer drop into the immutable command index used by the editor.
 * `after` is explicit so dropping at the end is not confused with dropping on
 * the last section itself.
 */
export function sectionDropTarget(document: EditorDocument, sectionId: string, targetSectionId: string | null, after = false): SectionDragTarget | null {
  for (const page of document.pages) {
    if (!page.sections.some((section) => section.id === sectionId)) continue;
    if (!targetSectionId) return { pageId: page.id, toIndex: page.sections.length };
    const targetIndex=page.sections.findIndex((section)=>section.id===targetSectionId);
    if (targetIndex >= 0) return { pageId:page.id,toIndex:targetIndex+(after ? 1 : 0) };
  }
  return null;
}

export function blockDropTarget(
  document: EditorDocument,
  sectionId: string,
  blockId: string,
  targetSectionId: string,
  targetBlockId: string,
  after = false,
): BlockDragTarget | null {
  if (sectionId !== targetSectionId) return null;
  for (const page of document.pages) {
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) continue;
    const source = section.blocks.find((block) => block.id === blockId);
    const targetIndex = section.blocks.findIndex((block) => block.id === targetBlockId && block.type === "offer-tier");
    if (source?.type !== "offer-tier" || targetIndex < 0) return null;
    return { sectionId, toIndex: targetIndex + (after ? 1 : 0) };
  }
  return null;
}

export function sectionKeyboardMove(document: EditorDocument, sectionId: string, key: string): SectionDragTarget | null {
  if (key === "ArrowUp") return sectionMoveTarget(document,sectionId,-1);
  if (key === "ArrowDown") return sectionMoveTarget(document,sectionId,1);
  return null;
}
