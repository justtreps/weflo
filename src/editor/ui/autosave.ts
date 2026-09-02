import type { EditorDocument } from "../document";
import type { EditorStore } from "./store";

export class AutosaveConflictError extends Error {
  constructor(public readonly serverPage: unknown) {
    super("editor save conflict");
    this.name = "AutosaveConflictError";
  }
}

type DraftStorage = Pick<Storage, "setItem" | "removeItem">;

export function createEditorAutosave(options: {
  store: EditorStore;
  pageId: string;
  initialVersion: number;
  save(document: EditorDocument, expectedVersion: number): Promise<{ documentVersion: number }>;
  draftStorage?: DraftStorage;
  delay?: number;
}) {
  const key = `weflo-editor-draft:${options.pageId}`;
  const storage = options.draftStorage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  const delay = options.delay ?? 600;
  let documentVersion = options.initialVersion;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saving = false;
  let queued = false;
  let serverConflict: unknown;

  const flush = async (): Promise<void> => {
    if (saving) { queued = true; return; }
    clearTimeout(timer);
    timer = undefined;
    saving = true;
    options.store.setState({ saveStatus: "saving" });
    const document = options.store.getState().document;
    try {
      const result = await options.save(document, documentVersion);
      documentVersion = result.documentVersion;
      serverConflict = undefined;
      storage?.removeItem(key);
      options.store.setState({ saveStatus: "saved" });
    } catch (error) {
      if (error instanceof AutosaveConflictError) {
        serverConflict = error.serverPage;
        options.store.setState({ saveStatus: "conflict" });
      } else {
        options.store.setState({ saveStatus: "error" });
      }
    } finally {
      saving = false;
      if (queued) {
        queued = false;
        timer = setTimeout(() => { void flush(); }, delay);
      }
    }
  };

  const unsubscribe = options.store.subscribe((state) => {
    if (state.saveStatus !== "modified") return;
    storage?.setItem(key, JSON.stringify(state.document));
    clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, delay);
  });

  return {
    flush,
    version: () => documentVersion,
    conflict: () => serverConflict as { name?: string } | undefined,
    destroy() { clearTimeout(timer); unsubscribe(); },
  };
}

