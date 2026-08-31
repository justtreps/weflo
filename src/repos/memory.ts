import type {
  CreditLedger,
  Membership,
  Page,
  ReferralAttribution,
  ShopifyConnection,
  User,
  WhopLink,
  Workspace,
} from "../types";
import type { Store } from "./types";

function randomId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

function kebab(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "workspace";
}

export class MemoryStore implements Store {
  private workspaces = new Map<string, Workspace>();
  private memberships: Membership[] = [];
  private pages = new Map<string, Page>();
  private credits = new Map<string, CreditLedger>();
  private shopify = new Map<string, ShopifyConnection>();
  private whop = new Map<string, WhopLink>();
  private attributions = new Map<string, ReferralAttribution>();
  private users = new Map<string, User>();

  async createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace> {
    const ws: Workspace = {
      id: randomId("ws_"),
      name: input.name,
      slug: `${kebab(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
      ownerUserId: input.ownerUserId,
      createdAt: new Date().toISOString(),
    };
    this.workspaces.set(ws.id, ws);
    this.memberships.push({ userId: input.ownerUserId, workspaceId: ws.id, role: "owner" });
    return ws;
  }

  async listWorkspaces(userId: string): Promise<Workspace[]> {
    const ids = new Set(
      this.memberships.filter((m) => m.userId === userId).map((m) => m.workspaceId),
    );
    return [...this.workspaces.values()].filter((ws) => ids.has(ws.id));
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    return [...this.workspaces.values()].find((ws) => ws.slug === slug) ?? null;
  }

  async assertMember(userId: string, workspaceId: string): Promise<Membership> {
    const membership = this.memberships.find(
      (m) => m.userId === userId && m.workspaceId === workspaceId,
    );
    if (!membership) throw new Error("forbidden");
    return membership;
  }

  async listPages(workspaceId: string): Promise<Page[]> {
    return [...this.pages.values()].filter((p) => p.workspaceId === workspaceId);
  }

  async getPage(id: string): Promise<Page | null> {
    return this.pages.get(id) ?? null;
  }

  async createPage(input: Omit<Page, "id" | "updatedAt">): Promise<Page> {
    const taken = [...this.pages.values()].some(
      (p) => p.workspaceId === input.workspaceId && p.slug === input.slug,
    );
    if (taken) throw new Error("slug already exists");
    const page: Page = {
      ...input,
      id: randomId("pg_"),
      updatedAt: new Date().toISOString(),
    };
    this.pages.set(page.id, page);
    return page;
  }

  async updatePage(
    id: string,
    patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">>,
  ): Promise<Page> {
    const page = this.pages.get(id);
    if (!page) throw new Error("page not found");
    if (patch.slug && patch.slug !== page.slug) {
      const taken = [...this.pages.values()].some(
        (p) => p.workspaceId === page.workspaceId && p.slug === patch.slug && p.id !== id,
      );
      if (taken) throw new Error("slug already exists");
    }
    const updated: Page = { ...page, ...patch, updatedAt: new Date().toISOString() };
    this.pages.set(id, updated);
    return updated;
  }

  async deletePage(id: string): Promise<void> {
    this.pages.delete(id);
  }

  async getCredits(workspaceId: string): Promise<CreditLedger> {
    const existing = this.credits.get(workspaceId);
    if (existing) return existing;
    const ledger: CreditLedger = {
      workspaceId,
      monthlyRemaining: 40,
      monthlyResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      purchasedRemaining: 0,
    };
    this.credits.set(workspaceId, ledger);
    return ledger;
  }

  async saveCredits(ledger: CreditLedger): Promise<void> {
    this.credits.set(ledger.workspaceId, ledger);
  }

  async getShopify(workspaceId: string): Promise<ShopifyConnection | null> {
    return this.shopify.get(workspaceId) ?? null;
  }

  async saveShopify(conn: ShopifyConnection): Promise<void> {
    this.shopify.set(conn.workspaceId, conn);
  }

  async clearShopify(workspaceId: string): Promise<void> {
    this.shopify.delete(workspaceId);
  }

  async getWhop(workspaceId: string): Promise<WhopLink | null> {
    return this.whop.get(workspaceId) ?? null;
  }

  async saveWhop(link: WhopLink): Promise<void> {
    this.whop.set(link.workspaceId, link);
  }

  async getAttribution(refereeWorkspaceId: string): Promise<ReferralAttribution | null> {
    return this.attributions.get(refereeWorkspaceId) ?? null;
  }

  async saveAttribution(row: ReferralAttribution): Promise<void> {
    this.attributions.set(row.refereeWorkspaceId, row);
  }

  async getUserProfile(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }
}
