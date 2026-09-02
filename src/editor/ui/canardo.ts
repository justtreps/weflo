import type { CanardoResponse } from "../../canardo/protocol";
import type { EditorDocument } from "../document";
import type { EditorStore } from "./store";
import { canardoReviewMarkup } from "./canardo-review";

type ApiResponse = Partial<CanardoResponse> & { document?: EditorDocument; requiresConfirmation?: boolean; error?: string };

export function canardoRequest(prompt: string, selectedId: string | null, extra: Record<string, unknown> = {}): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, selectedId, ...extra }) };
}

export function isConsequentialCanardoResponse(response: { requiresConfirmation?: boolean }): boolean { return response.requiresConfirmation === true; }

export function applyCanardoDocument(store: EditorStore, document: EditorDocument): void {
  store.dispatch({ type: "restoreDocument", document });
}

export function mountCanardo(root: HTMLElement, store: EditorStore, pageId: string): () => void {
  const dock = root.querySelector<HTMLElement>("[data-editor-canardo]");
  const input = dock?.querySelector<HTMLInputElement>("input");
  const send = dock?.querySelector<HTMLButtonElement>("[data-canardo-send]");
  if (!dock || !input || !send) return () => {};
  const log = document.createElement("div");
  log.className = "editor-canardo-log";
  log.setAttribute("aria-live", "polite");
  dock.prepend(log);
  let proposal: CanardoResponse | null = null;
  let lastPrompt = "";

  const note = (message: string, kind: "user" | "assistant" | "error" = "assistant") => {
    const entry = document.createElement("p"); entry.dataset.canardoMessage = kind; entry.textContent = message; log.appendChild(entry); log.scrollTop = log.scrollHeight;
  };
  const apply = (response: ApiResponse) => {
    if (response.document?.version === 2) applyCanardoDocument(store, response.document);
    note(response.message || "Modification appliquée.");
    const undo = document.createElement("button"); undo.type = "button"; undo.dataset.canardoUndo = ""; undo.textContent = "Annuler cette génération"; log.appendChild(undo);
  };
  const request = async (confirm = false) => {
    const prompt = confirm ? lastPrompt : input.value.trim();
    if (!prompt) return;
    if (!confirm) { lastPrompt = prompt; note(prompt, "user"); }
    send.disabled = true; send.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}/canardo`, canardoRequest(prompt, store.getState().selectedId, confirm && proposal ? { confirm: true, response: proposal } : {}));
      const body = await response.json().catch(() => ({})) as ApiResponse;
      if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Canardo n’a pas pu appliquer cette demande.");
      if (isConsequentialCanardoResponse(body)) {
        proposal = { message: body.message || "Proposition", summary: body.summary || "Modification", commands: body.commands || [] };
        log.insertAdjacentHTML("beforeend", canardoReviewMarkup(proposal));
      } else { apply(body); input.value = ""; proposal = null; }
    } catch (error) { note(error instanceof Error ? error.message : "Erreur Canardo", "error"); input.value = lastPrompt; }
    finally { send.disabled = false; send.removeAttribute("aria-busy"); }
  };
  const click = (event: Event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button");
    if (!target) return;
    if (target === send) void request();
    if (target.matches("[data-canardo-accept]")) { target.closest("[data-canardo-review]")?.remove(); void request(true); }
    if (target.matches("[data-canardo-reject]")) { target.closest("[data-canardo-review]")?.remove(); proposal = null; note("Proposition annulée."); }
    if (target.matches("[data-canardo-undo]")) { store.undo(); target.remove(); note("Génération annulée."); }
  };
  const keydown = (event: KeyboardEvent) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void request(); } };
  dock.addEventListener("click", click); input.addEventListener("keydown", keydown);
  return () => { dock.removeEventListener("click", click); input.removeEventListener("keydown", keydown); };
}
