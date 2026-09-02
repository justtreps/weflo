import type { EditorSection } from "../document";
import { renderKnownSection } from "./render-section";

export type SectionRenderer = (section: EditorSection, pageName: string) => string;

const renderers = new Map<string, SectionRenderer>();

export function registerEditorSectionRenderer(type: string, renderer: SectionRenderer): void {
  renderers.set(type, renderer);
}

export function rendererForSection(type: string): SectionRenderer {
  return renderers.get(type) ?? renderKnownSection;
}

