import postgres from "postgres";
import type {
  CreditLedger,
  Membership,
  Page,
  PageDocument,
  PageStatus,
  PageType,
  ReferralAttribution,
  ShopifyConnection,
  ShopifyStatus,
  User,
  WhopLink,
  Workspace,
  WorkspaceRole,
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

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

export class PostgresStore implements Store {
  private sql: postgres.Sql;

  constructor(url: string) {
    this.sql = postgres(url);
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }

  async createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace> {
    const ws: Workspace = {
      id: randomId("ws_"),
      name: input.name,
      slug: `${kebab(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
      ownerUserId: input.ownerUserId,
      createdAt: new Date().toISOString(),
    };
    await this.sql.begin(async (tx) => {
      await tx`
        insert into workspaces (id, name, slug, owner_user_id, created_at)
        values (${ws.id}, ${ws.name}, ${ws.slug}, ${ws.ownerUserId}, ${ws.createdAt})
      `;
      await tx`
        insert into memberships (user_id, workspace_id, role)
        values (${input.ownerUserId}, ${ws.id}, ${"owner"})
      `;
    });
    return ws;
  }

  async listWorkspaces(userId: string): Promise<Workspace[]> {
    const rows = await this.sql<
      { id: string; name: string; slug: string; ownerUserId: string; createdAt: Date | string }[]
    >`
      select w.id, w.name, w.slug, w.owner_user_id as "ownerUserId", w.created_at as "createdAt"
      from workspaces w
      join memberships m on m.workspace_id = w.id
      where m.user_id = ${userId}
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.ownerUserId,
      createdAt: iso(row.createdAt),
    }));
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const rows = await this.sql<
      { id: string; name: string; slug: string; ownerUserId: string; createdAt: Date | string }[]
    >`
      select id, name, slug, owner_user_id as "ownerUserId", created_at as "createdAt"
      from workspaces
      where id = ${id}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.ownerUserId,
      createdAt: iso(row.createdAt),
    };
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    const rows = await this.sql<
      { id: string; name: string; slug: string; ownerUserId: string; createdAt: Date | string }[]
    >`
      select id, name, slug, owner_user_id as "ownerUserId", created_at as "createdAt"
      from workspaces
      where slug = ${slug}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.ownerUserId,
      createdAt: iso(row.createdAt),
    };
  }

  async assertMember(userId: string, workspaceId: string): Promise<Membership> {
    const rows = await this.sql<{ userId: string; workspaceId: string; role: WorkspaceRole }[]>`
      select user_id as "userId", workspace_id as "workspaceId", role
      from memberships
      where user_id = ${userId} and workspace_id = ${workspaceId}
    `;
    const membership = rows[0];
    if (!membership) throw new Error("forbidden");
    return membership;
  }

  async listPages(workspaceId: string): Promise<Page[]> {
    const rows = await this.sql<PageRow[]>`
      select id, workspace_id as "workspaceId", name, slug, type, status, document, updated_at as "updatedAt"
      from pages
      where workspace_id = ${workspaceId}
    `;
    return rows.map(mapPage);
  }

  async getPage(id: string): Promise<Page | null> {
    const rows = await this.sql<PageRow[]>`
      select id, workspace_id as "workspaceId", name, slug, type, status, document, updated_at as "updatedAt"
      from pages
      where id = ${id}
    `;
    return rows[0] ? mapPage(rows[0]) : null;
  }

  async createPage(input: Omit<Page, "id" | "updatedAt">): Promise<Page> {
    const page: Page = {
      ...input,
      id: randomId("pg_"),
      updatedAt: new Date().toISOString(),
    };
    try {
      await this.sql`
        insert into pages (id, workspace_id, name, slug, type, status, document, updated_at)
        values (
          ${page.id},
          ${page.workspaceId},
          ${page.name},
          ${page.slug},
          ${page.type},
          ${page.status},
          ${this.sql.json(page.document)},
          ${page.updatedAt}
        )
      `;
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("slug already exists");
      throw err;
    }
    return page;
  }

  async updatePage(
    id: string,
    patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">>,
  ): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) throw new Error("page not found");
    const updated: Page = { ...page, ...patch, updatedAt: new Date().toISOString() };
    try {
      await this.sql`
        update pages
        set name = ${updated.name},
            slug = ${updated.slug},
            status = ${updated.status},
            document = ${this.sql.json(updated.document)},
            updated_at = ${updated.updatedAt}
        where id = ${id}
      `;
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("slug already exists");
      throw err;
    }
    return updated;
  }

  async deletePage(id: string): Promise<void> {
    await this.sql`delete from pages where id = ${id}`;
  }

  async getCredits(workspaceId: string): Promise<CreditLedger> {
    const existing = await this.sql<CreditRow[]>`
      select workspace_id as "workspaceId",
             monthly_remaining as "monthlyRemaining",
             monthly_reset_at as "monthlyResetAt",
             purchased_remaining as "purchasedRemaining"
      from credit_ledgers
      where workspace_id = ${workspaceId}
    `;
    if (existing[0]) return mapCredits(existing[0]);
    const ledger: CreditLedger = {
      workspaceId,
      monthlyRemaining: 40,
      monthlyResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      purchasedRemaining: 0,
    };
    await this.sql`
      insert into credit_ledgers (workspace_id, monthly_remaining, monthly_reset_at, purchased_remaining)
      values (
        ${ledger.workspaceId},
        ${ledger.monthlyRemaining},
        ${ledger.monthlyResetAt},
        ${ledger.purchasedRemaining}
      )
      on conflict (workspace_id) do nothing
    `;
    const again = await this.sql<CreditRow[]>`
      select workspace_id as "workspaceId",
             monthly_remaining as "monthlyRemaining",
             monthly_reset_at as "monthlyResetAt",
             purchased_remaining as "purchasedRemaining"
      from credit_ledgers
      where workspace_id = ${workspaceId}
    `;
    return again[0] ? mapCredits(again[0]) : ledger;
  }

  async saveCredits(ledger: CreditLedger): Promise<void> {
    await this.sql`
      insert into credit_ledgers (workspace_id, monthly_remaining, monthly_reset_at, purchased_remaining)
      values (
        ${ledger.workspaceId},
        ${ledger.monthlyRemaining},
        ${ledger.monthlyResetAt},
        ${ledger.purchasedRemaining}
      )
      on conflict (workspace_id) do update set
        monthly_remaining = excluded.monthly_remaining,
        monthly_reset_at = excluded.monthly_reset_at,
        purchased_remaining = excluded.purchased_remaining
    `;
  }

  async getShopify(workspaceId: string): Promise<ShopifyConnection | null> {
    const rows = await this.sql<
      { workspaceId: string; shopDomain: string; tokenEncrypted: string; status: ShopifyStatus }[]
    >`
      select workspace_id as "workspaceId",
             shop_domain as "shopDomain",
             token_encrypted as "tokenEncrypted",
             status
      from shopify_connections
      where workspace_id = ${workspaceId}
    `;
    return rows[0] ?? null;
  }

  async saveShopify(conn: ShopifyConnection): Promise<void> {
    await this.sql`
      insert into shopify_connections (workspace_id, shop_domain, token_encrypted, status)
      values (${conn.workspaceId}, ${conn.shopDomain}, ${conn.tokenEncrypted}, ${conn.status})
      on conflict (workspace_id) do update set
        shop_domain = excluded.shop_domain,
        token_encrypted = excluded.token_encrypted,
        status = excluded.status
    `;
  }

  async clearShopify(workspaceId: string): Promise<void> {
    await this.sql`delete from shopify_connections where workspace_id = ${workspaceId}`;
  }

  async getWhop(workspaceId: string): Promise<WhopLink | null> {
    const rows = await this.sql<WhopRow[]>`
      select workspace_id as "workspaceId",
             membership_id as "membershipId",
             plan_id as "planId",
             status,
             manage_url as "manageUrl",
             affiliate_id as "affiliateId"
      from whop_links
      where workspace_id = ${workspaceId}
    `;
    return rows[0] ?? null;
  }

  async saveWhop(link: WhopLink): Promise<void> {
    await this.sql`
      insert into whop_links (workspace_id, membership_id, plan_id, status, manage_url, affiliate_id)
      values (
        ${link.workspaceId},
        ${link.membershipId},
        ${link.planId},
        ${link.status},
        ${link.manageUrl},
        ${link.affiliateId}
      )
      on conflict (workspace_id) do update set
        membership_id = excluded.membership_id,
        plan_id = excluded.plan_id,
        status = excluded.status,
        manage_url = excluded.manage_url,
        affiliate_id = excluded.affiliate_id
    `;
  }

  async getAttribution(refereeWorkspaceId: string): Promise<ReferralAttribution | null> {
    const rows = await this.sql<
      {
        refereeWorkspaceId: string;
        referrerWorkspaceId: string;
        promoApplied: boolean;
        createdAt: Date | string;
      }[]
    >`
      select referee_workspace_id as "refereeWorkspaceId",
             referrer_workspace_id as "referrerWorkspaceId",
             promo_applied as "promoApplied",
             created_at as "createdAt"
      from referral_attributions
      where referee_workspace_id = ${refereeWorkspaceId}
    `;
    const row = rows[0];
    if (!row) return null;
    return { ...row, createdAt: iso(row.createdAt) };
  }

  async saveAttribution(row: ReferralAttribution): Promise<void> {
    await this.sql`
      insert into referral_attributions (referee_workspace_id, referrer_workspace_id, promo_applied, created_at)
      values (${row.refereeWorkspaceId}, ${row.referrerWorkspaceId}, ${row.promoApplied}, ${row.createdAt})
      on conflict (referee_workspace_id) do update set
        referrer_workspace_id = excluded.referrer_workspace_id,
        promo_applied = excluded.promo_applied,
        created_at = excluded.created_at
    `;
  }

  async getUserProfile(_userId: string): Promise<User | null> {
    return null;
  }
}

type PageRow = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  type: PageType;
  status: PageStatus;
  document: PageDocument;
  updatedAt: Date | string;
};

type CreditRow = {
  workspaceId: string;
  monthlyRemaining: number;
  monthlyResetAt: Date | string;
  purchasedRemaining: number;
};

type WhopRow = {
  workspaceId: string;
  membershipId: string | null;
  planId: string | null;
  status: WhopLink["status"];
  manageUrl: string | null;
  affiliateId: string | null;
};

function mapPage(row: PageRow): Page {
  return { ...row, updatedAt: iso(row.updatedAt) };
}

function mapCredits(row: CreditRow): CreditLedger {
  return { ...row, monthlyResetAt: iso(row.monthlyResetAt) };
}
