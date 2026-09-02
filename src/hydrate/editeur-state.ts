import { needsModelPicker } from "../lib/catalog";
import type { PageDocument } from "../types";

export function editorViewForDocument(doc: PageDocument): "gallery" | "preview" {
  return needsModelPicker(doc) ? "gallery" : "preview";
}

export function canardoControlState(busy: boolean) {
  return {
    inputDisabled: busy,
    ariaBusy: String(busy),
    ariaDisabled: String(busy),
    cursor: busy ? "wait" : "pointer",
  };
}

export function canardoErrorMessage(status: number, body: { error?: string; message?: string }): string {
  if (body.message?.trim()) return body.message.trim();
  if (status === 402 || body.error === "credits") return "Tu n’as plus assez de crédits Canardo pour cette génération.";
  if (status === 503 || body.error === "unavailable") return "Canardo n’est pas configuré sur cet environnement.";
  if (body.error === "catalog") return "La réponse était invalide. Ta page actuelle a été conservée.";
  if (status === 400 || body.error === "prompt") return "Décris la page ou la modification souhaitée.";
  if (status === 401) return "Ta session a expiré. Reconnecte-toi pour continuer.";
  return "La connexion à Canardo a échoué. Vérifie ta connexion puis réessaie.";
}
