import type { EditorCommand } from "../editor/commands";
import type { CustomSectionSpecV1 } from "./custom-spec";

export type CanardoRequestContext = {
  prompt: string;
  page: { id: string; name: string; kind: string };
  selection: unknown;
  theme: unknown;
  availableSections: unknown[];
  catalog?: Array<{ type: string; variantId: string; title: string; family?: string; purpose: string; capabilities: Array<{ id: string; state: string }> }>;
  shopify?: { connected: boolean; productCount?: number; collectionCount?: number };
};

export type CanardoResponse = {
  message: string;
  summary: string;
  commands: EditorCommand[];
  /** Composition proposals are reviewed before a host decides to apply them. */
  requiresConfirmation?: boolean;
  /** Alias used by composition clients; commands remain the canonical protocol field. */
  operations?: EditorCommand[];
};

export type CanardoCustomValidation = { ok: boolean; errors: string[]; nodeCount: number; capabilityBlockers: string[] };

export type CanardoCustomProposal = {
  mode: "custom-section";
  message: string;
  summary: string;
  spec: CustomSectionSpecV1;
  checksum: string;
  validation: CanardoCustomValidation;
  preview: { desktop: string; mobile: string };
  requiresConfirmation: true;
};

export type CanardoProposal = CanardoResponse | CanardoCustomProposal;

export type CanardoValidationResult =
  | { ok: true; value: CanardoResponse }
  | { ok: false; errors: string[] };
