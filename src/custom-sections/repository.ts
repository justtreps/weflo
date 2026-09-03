import type { CustomSectionSpecV1 } from "../canardo/custom-spec";
import type { CanardoCustomValidation } from "../canardo/protocol";
import type { Store } from "../repos/types";

export type StoredCustomSection = {
  workspaceId: string;
  id: string;
  version: number;
  spec: CustomSectionSpecV1;
  checksum: string;
  validation: CanardoCustomValidation;
  authorUserId: string | null;
  createdAt: string;
};

/** Persistence boundary kept intentionally independent from the application Store. */
export interface CustomSectionRepository {
  save(row: StoredCustomSection): Promise<StoredCustomSection>;
  list(workspaceId: string, id?: string): Promise<StoredCustomSection[]>;
  get(workspaceId: string, id: string, version: number): Promise<StoredCustomSection | null>;
}

export class MemoryCustomSectionRepository implements CustomSectionRepository {
  private readonly rows = new Map<string, StoredCustomSection>();
  private key(workspaceId: string, id: string, version: number): string { return `${workspaceId}:${id}:${version}`; }
  async save(row: StoredCustomSection): Promise<StoredCustomSection> { const copy = structuredClone(row); const key = this.key(copy.workspaceId, copy.id, copy.version); if (this.rows.has(key)) throw new Error("custom section version already exists"); this.rows.set(key, copy); return structuredClone(copy); }
  async list(workspaceId: string, id?: string): Promise<StoredCustomSection[]> { return [...this.rows.values()].filter((row) => row.workspaceId === workspaceId && (!id || row.id === id)).sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt)).map((row) => structuredClone(row)); }
  async get(workspaceId: string, id: string, version: number): Promise<StoredCustomSection | null> { const row = this.rows.get(this.key(workspaceId, id, version)); return row ? structuredClone(row) : null; }
}

/** Adapts the application Store so custom sections follow the selected persistence backend. */
export class StoreCustomSectionRepository implements CustomSectionRepository {
  constructor(private readonly store: Pick<Store, "saveCustomSection" | "listCustomSections" | "getCustomSection">) {}

  save(row: StoredCustomSection): Promise<StoredCustomSection> { return this.store.saveCustomSection(row); }
  list(workspaceId: string, id?: string): Promise<StoredCustomSection[]> { return this.store.listCustomSections(workspaceId, id); }
  get(workspaceId: string, id: string, version: number): Promise<StoredCustomSection | null> { return this.store.getCustomSection(workspaceId, id, version); }
}
