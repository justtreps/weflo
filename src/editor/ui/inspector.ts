import type { SettingValue, StyleValue } from "../document";
import { inspectorGroupsForSection, type InspectorScope } from "../section-schema";
import { inspectorControlMarkup } from "./controls";
import type { EditorState, EditorStore } from "./store";

export type InspectorChange = {
  scope: InspectorScope;
  key: string;
  value: SettingValue | StyleValue;
  breakpoint?: "desktop" | "tablet" | "mobile";
};

export function inspectorChangeFromControl(input: {
  scope: string;
  key: string;
  type: string;
  value: string;
  checked: boolean;
  breakpoint: "desktop" | "tablet" | "mobile";
}): InspectorChange | null {
  if (!(["settings", "style", "responsive"] as string[]).includes(input.scope) || !/^[a-z][a-z0-9_]*$/i.test(input.key)) return null;
  const value = input.type === "number" ? Number(input.value) : input.type === "toggle" ? input.checked : input.value;
  if (input.type === "number" && !Number.isFinite(value)) return null;
  return { scope: input.scope as InspectorScope, key: input.key, value: value as SettingValue | StyleValue, breakpoint: input.breakpoint };
}

function selectedSection(state: EditorState) {
  return state.document.pages.flatMap((page) => page.sections).find((section) => section.id === state.selectedId);
}

export function inspectorMarkup(state: EditorState): string {
  const section = selectedSection(state);
  if (!section) return `<div class="editor-inspector-empty"><strong>Sélectionne une section</strong><p>Clique dans la page ou dans la structure pour modifier son contenu et son style.</p></div>`;
  const groups = inspectorGroupsForSection(section.type);
  return `<div class="editor-inspector" data-inspector-section="${section.id}"><div class="editor-inspector-tabs">${groups.map((group) => `<button type="button" data-inspector-tab="${group.id}">${group.label}</button>`).join("")}</div>${groups.map((group, index) => `<section data-inspector-group="${group.id}"${index ? " hidden" : ""}><h3>${group.label}</h3>${group.controls.map((control) => inspectorControlMarkup(section, control, state.breakpoint)).join("")}</section>`).join("")}</div>`;
}

export function applyInspectorValue(store: EditorStore, change: InspectorChange): void {
  const sectionId = store.getState().selectedId;
  if (!sectionId) return;
  if (/color/i.test(change.key) && change.value !== null && (typeof change.value !== "string" || !/^#[0-9a-f]{6}$/i.test(change.value))) {
    throw new Error("Invalid color");
  }
  if (change.scope === "settings") store.dispatch({ type: "updateSetting", sectionId, key: change.key, value: change.value as SettingValue });
  if (change.scope === "style") store.dispatch({ type: "updateStyle", sectionId, key: change.key, value: change.value as StyleValue });
  if (change.scope === "responsive") store.dispatch({ type: "updateResponsiveStyle", sectionId, breakpoint: change.breakpoint ?? store.getState().breakpoint, key: change.key, value: change.value as StyleValue });
}

export function bindInspector(root: HTMLElement, store: EditorStore): () => void {
  const click = (event: Event) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>("[data-inspector-tab]");
    if (!tab) return;
    const inspector = tab.closest("[data-inspector-section]");
    inspector?.querySelectorAll<HTMLElement>("[data-inspector-group]").forEach((group) => { group.hidden = group.dataset.inspectorGroup !== tab.dataset.inspectorTab; });
  };
  const change = (event: Event) => {
    const control = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).closest<HTMLElement>("[data-inspector-control]") as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!control) return;
    const normalized = inspectorChangeFromControl({
      scope: control.dataset.inspectorScope ?? "",
      key: control.dataset.inspectorKey ?? "",
      type: control.dataset.inspectorControl ?? "text",
      value: control.value,
      checked: control instanceof HTMLInputElement ? control.checked : false,
      breakpoint: store.getState().breakpoint,
    });
    if (normalized) applyInspectorValue(store, normalized);
  };
  root.addEventListener("click", click);
  root.addEventListener("change", change);
  return () => { root.removeEventListener("click", click); root.removeEventListener("change", change); };
}
