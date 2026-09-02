export type CanvasBridgeAction =
  | { type: "select"; sectionId: string }
  | { type: "inlineEdit"; sectionId: string; key: string; value: string }
  | { type: "imageEdit"; sectionId: string; key: string }
  | { type: "move"; sectionId: string; toIndex: number }
  | { type: "action"; sectionId: string; action: "moveUp" | "moveDown" | "duplicate" | "hide" | "remove" };

export function parseCanvasBridgeMessage(value: unknown): CanvasBridgeAction | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.source !== "weflo-canvas") return null;
  if (typeof message.sectionId !== "string" || !/^[a-z0-9_-]+$/i.test(message.sectionId)) return null;
  if (message.type === "canvas:select") return { type: "select", sectionId: message.sectionId };
  if (message.type === "canvas:inline-edit" && typeof message.key === "string" && /^[a-z][a-z0-9_]*$/i.test(message.key) && typeof message.value === "string") {
    return { type: "inlineEdit", sectionId: message.sectionId, key: message.key, value: message.value };
  }
  if (message.type === "canvas:image-edit" && typeof message.key === "string" && /^[a-z][a-z0-9_]*$/i.test(message.key)) return { type: "imageEdit", sectionId: message.sectionId, key: message.key };
  if (message.type === "canvas:move" && typeof message.toIndex === "number" && Number.isInteger(message.toIndex) && message.toIndex >= 0) {
    return { type: "move", sectionId: message.sectionId, toIndex: message.toIndex };
  }
  const actions = ["moveUp", "moveDown", "duplicate", "hide", "remove"] as const;
  if (message.type === "canvas:action" && actions.includes(message.action as typeof actions[number])) {
    return { type: "action", sectionId: message.sectionId, action: message.action as typeof actions[number] };
  }
  return null;
}
