export type CanvasBridgeAction = { type: "select"; sectionId: string };

export function parseCanvasBridgeMessage(value: unknown): CanvasBridgeAction | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.source !== "weflo-canvas" || message.type !== "canvas:select") return null;
  if (typeof message.sectionId !== "string" || !/^[a-z0-9_-]+$/i.test(message.sectionId)) return null;
  return { type: "select", sectionId: message.sectionId };
}

