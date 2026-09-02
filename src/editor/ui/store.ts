import type { EditorBreakpoint, EditorDocument } from "../document";
import type { EditorCommand } from "../commands";
import { createHistory, dispatch as dispatchHistory, redo as redoHistory, undo as undoHistory } from "../history";

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
  dispatch(command: EditorCommand): EditorState;
  undo(): EditorState;
  redo(): EditorState;
  subscribe(listener: (state: EditorState) => void): () => void;
};

export function createEditorStore(initial: EditorState): EditorStore {
  let state = structuredClone(initial);
  let history = createHistory(initial.document);
  const listeners = new Set<(state: EditorState) => void>();
  return {
    getState: () => state,
    setState(patch) {
      const changes = typeof patch === "function" ? patch(state) : patch;
      if (changes.document && changes.document !== state.document) history = createHistory(changes.document);
      state = { ...state, ...changes };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    dispatch(command) {
      history = dispatchHistory(history, command);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    undo() {
      history = undoHistory(history);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    redo() {
      history = redoHistory(history);
      state = { ...state, document: history.present, saveStatus: "modified" };
      listeners.forEach((listener) => listener(state));
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
