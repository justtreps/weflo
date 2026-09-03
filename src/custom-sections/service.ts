import { compileCustomLiquid } from "../canardo/custom-compile-liquid";
import { customSectionChecksum } from "../canardo/custom-planner";
import type { CustomSectionSpecV1 } from "../canardo/custom-spec";
import type { CanardoCustomValidation } from "../canardo/protocol";
import { validateCustomSectionSpec } from "../canardo/custom-validate";
import type { CustomSectionRepository, StoredCustomSection } from "./repository";

export type SaveCustomSectionInput = { workspaceId: string; spec: CustomSectionSpecV1; checksum?: string; validation?: CanardoCustomValidation; authorUserId?: string | null };
export type CustomSectionPublication = { path: string; content: string; section: StoredCustomSection };

const defaultValidation = (spec: CustomSectionSpecV1): CanardoCustomValidation => ({ ok: true, errors: [], nodeCount: spec.nodes.length, capabilityBlockers: [] });
const handle = (id: string) => id.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "section";

export class CustomSectionService {
  constructor(private readonly repository: CustomSectionRepository, private readonly now: () => string = () => new Date().toISOString()) {}

  async save(input: SaveCustomSectionInput): Promise<StoredCustomSection> {
    const result = validateCustomSectionSpec(input.spec);
    if (!result.ok) throw new Error(result.errors.join(" "));
    const checksum = customSectionChecksum(result.value);
    if (input.checksum && input.checksum !== checksum) throw new Error("checksum de section invalide");
    const current = await this.repository.list(input.workspaceId, result.value.id);
    return this.repository.save({ workspaceId: input.workspaceId, id: result.value.id, version: (current[0]?.version ?? 0) + 1, spec: structuredClone(result.value), checksum, validation: input.validation ?? defaultValidation(result.value), authorUserId: input.authorUserId ?? null, createdAt: this.now() });
  }

  async list(workspaceId: string): Promise<StoredCustomSection[]> { return this.repository.list(workspaceId); }
  async get(workspaceId: string, id: string, version: number): Promise<StoredCustomSection | null> { return this.repository.get(workspaceId, id, version); }

  /** A rollback is an append-only new version; no audit record is erased. */
  async restore(input: { workspaceId: string; id: string; version: number; authorUserId?: string | null }): Promise<StoredCustomSection> {
    const historical = await this.repository.get(input.workspaceId, input.id, input.version);
    if (!historical) throw new Error("version de section introuvable");
    return this.save({ workspaceId: input.workspaceId, spec: historical.spec, checksum: historical.checksum, validation: historical.validation, authorUserId: input.authorUserId });
  }

  async compileForPublication(input: { workspaceId: string; id: string; version: number }): Promise<CustomSectionPublication> {
    const section = await this.repository.get(input.workspaceId, input.id, input.version);
    if (!section) throw new Error("version de section introuvable");
    const result = validateCustomSectionSpec(section.spec);
    if (!result.ok || customSectionChecksum(section.spec) !== section.checksum) throw new Error("section enregistrée invalide");
    // Capability availability is evaluated against the destination store at
    // publication time. A proposal made before Shopify is connected must not
    // permanently invalidate an otherwise safe, immutable specification.
    if (!section.validation.ok && section.validation.errors.length) throw new Error(section.validation.errors.join(" "));
    return { path: `sections/weflo-custom-${handle(section.id)}-v${section.version}.liquid`, content: compileCustomLiquid({ spec: section.spec }), section };
  }
}
