import type { CreditLedger, Membership, Page, ReferralAttribution, ShopifyConnection, User, WhopLink, Workspace } from "../types";
import type { CreateOnboardingDraftInput, OnboardingDraft, OnboardingDraftPatch } from "../onboarding/types";
import type { ImageGeneration } from "../studio/types";

export class PageVersionConflictError extends Error {
  constructor() {
    super("page version conflict");
    this.name = "PageVersionConflictError";
  }
}

export interface Store {
  createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace>;
  listWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
  updateWorkspace(id: string, patch: { name: string }): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  addMembership(input: Membership): Promise<void>;
  removeMembershipsForUser(userId: string): Promise<void>;
  assertMember(userId: string, workspaceId: string): Promise<Membership>;
  listPages(workspaceId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  createPage(input: Omit<Page, "id" | "updatedAt" | "documentVersion">): Promise<Page>;
  updatePage(
    id: string,
    patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">>,
    options?: { expectedVersion?: number },
  ): Promise<Page>;
  deletePage(id: string): Promise<void>;
  getCredits(workspaceId: string): Promise<CreditLedger>;
  saveCredits(ledger: CreditLedger): Promise<void>;
  getShopify(workspaceId: string): Promise<ShopifyConnection | null>;
  saveShopify(conn: ShopifyConnection): Promise<void>;
  clearShopify(workspaceId: string): Promise<void>;
  getWhop(workspaceId: string): Promise<WhopLink | null>;
  saveWhop(link: WhopLink): Promise<void>;
  getAttribution(refereeWorkspaceId: string): Promise<ReferralAttribution | null>;
  saveAttribution(row: ReferralAttribution): Promise<void>;
  getUserProfile(userId: string): Promise<User | null>;
  createOnboardingDraft(input: CreateOnboardingDraftInput): Promise<OnboardingDraft>;
  getOnboardingDraft(id: string): Promise<OnboardingDraft | null>;
  updateOnboardingDraft(id: string, patch: OnboardingDraftPatch): Promise<OnboardingDraft>;
  claimOnboardingDraft(id: string, claimTokenHash: string, userId: string, pageId: string): Promise<OnboardingDraft>;
  listImageGenerations(workspaceId: string): Promise<ImageGeneration[]>;
  saveImageGeneration(generation: ImageGeneration): Promise<void>;
}
