import type { CreditLedger, Membership, Page, ReferralAttribution, ShopifyConnection, User, WhopLink, Workspace } from "../types";

export interface Store {
  createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace>;
  listWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
  assertMember(userId: string, workspaceId: string): Promise<Membership>;
  listPages(workspaceId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  createPage(input: Omit<Page, "id" | "updatedAt">): Promise<Page>;
  updatePage(id: string, patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">>): Promise<Page>;
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
}
