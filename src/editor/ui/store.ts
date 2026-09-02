import type { EditorBreakpoint, EditorDocument } from "../document";

export type EditorPanel = "structure" | "add" | "layers" | "pages" | "media" | "commerce";
export type EditorSaveStatus = "modified" | "saving" | "saved" | "error" | "conflict";

export type EditorState = {
  document: EditorDocument;
  pageId: string;
  selectedId: string | null;
  activePanel: EditorPanel;
  breakpoint: EditorBreakpoint;
  mode: "edit" | "preview";
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  saveStatus: EditorSaveStatus;
};

export type EditorStore = {
  getState(): EditorState;
  setState(patch: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)): EditorState;
  subscribe(listener: (state: EditorState) => void): () => void;
};

export function createEditorStore(initial: EditorState): EditorStore {
  let state = structuredClone(initial);
  const listeners = new Set<(state: EditorState) => void>();
  return {
    getState: () => state,
    setState(patch) {
      const changes = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...changes };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

