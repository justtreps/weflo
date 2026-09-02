import { applyCommand, type EditorCommand } from "./commands";
import type { EditorDocument } from "./document";

export type EditorHistory = {
  past: EditorDocument[];
  present: EditorDocument;
  future: EditorDocument[];
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createHistory(initial: EditorDocument): EditorHistory {
  return { past: [], present: clone(initial), future: [] };
}

export function dispatch(history: EditorHistory, command: EditorCommand): EditorHistory {
  return {
    past: [...history.past, clone(history.present)].slice(-100),
    present: applyCommand(history.present, command),
    future: [],
  };
}

export function undo(history: EditorHistory): EditorHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: clone(previous),
    future: [clone(history.present), ...history.future].slice(0, 100),
  };
}

export function redo(history: EditorHistory): EditorHistory {
  if (history.future.length === 0) return history;
  const [next, ...future] = history.future;
  return {
    past: [...history.past, clone(history.present)].slice(-100),
    present: clone(next),
    future,
  };
}

