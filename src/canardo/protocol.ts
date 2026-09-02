import type { EditorCommand } from "../editor/commands";

export type CanardoRequestContext = {
  prompt: string;
  page: { id: string; name: string; kind: string };
  selection: unknown;
  theme: unknown;
  availableSections: unknown[];
  shopify?: { connected: boolean; productCount?: number; collectionCount?: number };
};

export type CanardoResponse = {
  message: string;
  summary: string;
  commands: EditorCommand[];
};

export type CanardoValidationResult =
  | { ok: true; value: CanardoResponse }
  | { ok: false; errors: string[] };
