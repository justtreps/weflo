import type { EditorSection } from "../document";
import { renderKnownSection } from "./render-section";
import { getSectionDefinition } from "../../sections/index";

export type SectionRenderer = (section: EditorSection, pageName: string) => string;

const renderers = new Map<string, SectionRenderer>();

export function registerEditorSectionRenderer(type: string, renderer: SectionRenderer): void {
  renderers.set(type, renderer);
}

export function rendererForSection(type: string): SectionRenderer {
  const definition = getSectionDefinition(type);
  return renderers.get(type) ?? (definition ? (section, pageName) => definition.renderWeb({ section, pageName }) : renderKnownSection);
}
