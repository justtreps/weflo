import type { EditorBlock, EditorDocument, EditorSection, SettingValue, StyleValue } from "./document";

export type EditorCommand =
  | { type: "insertSection"; pageId: string; index: number; section: EditorSection }
  | { type: "moveSection"; sectionId: string; toPageId: string; toIndex: number }
  | { type: "updateSetting"; sectionId: string; key: string; value: SettingValue }
  | { type: "updateStyle"; sectionId: string; key: string; value: StyleValue }
  | { type: "duplicateSection"; sectionId: string; newSectionId: string; index?: number }
  | { type: "removeSection"; sectionId: string }
  | { type: "toggleHidden"; sectionId: string }
  | { type: "toggleLocked"; sectionId: string }
  | { type: "insertBlock"; sectionId: string; index: number; block: EditorBlock }
  | { type: "moveBlock"; sectionId: string; blockId: string; toIndex: number }
  | { type: "removeBlock"; sectionId: string; blockId: string }
  | { type: "restoreDocument"; document: EditorDocument };

export class EditorCommandError extends Error {}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sectionLocation(document: EditorDocument, sectionId: string) {
  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex += 1) {
    const sectionIndex = document.pages[pageIndex].sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex >= 0) return { pageIndex, sectionIndex };
  }
  throw new EditorCommandError(`Section not found: ${sectionId}`);
}

function pageLocation(document: EditorDocument, pageId: string): number {
  const index = document.pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new EditorCommandError(`Page not found: ${pageId}`);
  return index;
}

function sectionIds(document: EditorDocument): Set<string> {
  return new Set(document.pages.flatMap((page) => page.sections.map((section) => section.id)));
}

function blockIds(document: EditorDocument): Set<string> {
  return new Set(document.pages.flatMap((page) => page.sections.flatMap((section) => section.blocks.map((block) => block.id))));
}

function checkedIndex(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0 || index > length) throw new EditorCommandError(`Invalid insertion index: ${index}`);
  return index;
}

function editableSection(document: EditorDocument, sectionId: string) {
  const location = sectionLocation(document, sectionId);
  const section = document.pages[location.pageIndex].sections[location.sectionIndex];
  if (section.locked) throw new EditorCommandError(`Section is locked: ${sectionId}`);
  return { ...location, section };
}

export function applyCommand(document: EditorDocument, command: EditorCommand): EditorDocument {
  if (command.type === "restoreDocument") return clone(command.document);
  const next = clone(document);

  switch (command.type) {
    case "insertSection": {
      if (sectionIds(next).has(command.section.id)) throw new EditorCommandError(`Duplicate section id: ${command.section.id}`);
      const pageIndex = pageLocation(next, command.pageId);
      next.pages[pageIndex].sections.splice(checkedIndex(command.index, next.pages[pageIndex].sections.length), 0, clone(command.section));
      break;
    }
    case "moveSection": {
      const from = editableSection(next, command.sectionId);
      const targetPageIndex = pageLocation(next, command.toPageId);
      const [moving] = next.pages[from.pageIndex].sections.splice(from.sectionIndex, 1);
      let targetIndex = command.toIndex;
      if (from.pageIndex === targetPageIndex && from.sectionIndex < targetIndex) targetIndex -= 1;
      next.pages[targetPageIndex].sections.splice(checkedIndex(targetIndex, next.pages[targetPageIndex].sections.length), 0, moving);
      break;
    }
    case "updateSetting": {
      const { section } = editableSection(next, command.sectionId);
      section.settings[command.key] = clone(command.value);
      break;
    }
    case "updateStyle": {
      const { section } = editableSection(next, command.sectionId);
      section.style[command.key] = command.value;
      break;
    }
    case "duplicateSection": {
      const from = editableSection(next, command.sectionId);
      if (sectionIds(next).has(command.newSectionId)) throw new EditorCommandError(`Duplicate section id: ${command.newSectionId}`);
      const copy = clone(from.section);
      copy.id = command.newSectionId;
      copy.name = `${copy.name} copy`;
      copy.blocks = copy.blocks.map((block, index) => ({ ...block, id: `${command.newSectionId}-block-${index + 1}` }));
      const insertion = command.index ?? from.sectionIndex + 1;
      next.pages[from.pageIndex].sections.splice(checkedIndex(insertion, next.pages[from.pageIndex].sections.length), 0, copy);
      break;
    }
    case "removeSection": {
      const location = editableSection(next, command.sectionId);
      next.pages[location.pageIndex].sections.splice(location.sectionIndex, 1);
      break;
    }
    case "toggleHidden": {
      const location = editableSection(next, command.sectionId);
      location.section.hidden = !location.section.hidden;
      break;
    }
    case "toggleLocked": {
      const location = sectionLocation(next, command.sectionId);
      const section = next.pages[location.pageIndex].sections[location.sectionIndex];
      section.locked = !section.locked;
      break;
    }
    case "insertBlock": {
      const { section } = editableSection(next, command.sectionId);
      if (blockIds(next).has(command.block.id)) throw new EditorCommandError(`Duplicate block id: ${command.block.id}`);
      section.blocks.splice(checkedIndex(command.index, section.blocks.length), 0, clone(command.block));
      break;
    }
    case "moveBlock": {
      const { section } = editableSection(next, command.sectionId);
      const from = section.blocks.findIndex((block) => block.id === command.blockId);
      if (from < 0) throw new EditorCommandError(`Block not found: ${command.blockId}`);
      const [moving] = section.blocks.splice(from, 1);
      let target = command.toIndex;
      if (from < target) target -= 1;
      section.blocks.splice(checkedIndex(target, section.blocks.length), 0, moving);
      break;
    }
    case "removeBlock": {
      const { section } = editableSection(next, command.sectionId);
      const index = section.blocks.findIndex((block) => block.id === command.blockId);
      if (index < 0) throw new EditorCommandError(`Block not found: ${command.blockId}`);
      section.blocks.splice(index, 1);
      break;
    }
  }
  return next;
}

export function invertCommand(document: EditorDocument, _command: EditorCommand): EditorCommand {
  return { type: "restoreDocument", document: clone(document) };
}

