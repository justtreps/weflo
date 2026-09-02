import postgres from "postgres";
import type {
  AffiliateStats,
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
import { PageVersionConflictError, type Store } from "./types";
import type { CreateOnboardingDraftInput, OnboardingDraft, OnboardingDraftPatch } from "../onboarding/types";
import type { ImageGeneration } from "../studio/types";

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

const ONBOARDING_WORKSPACE_ID = "ws_weflo_onboarding";
const ONBOARDING_WORKSPACE_SLUG = "weflo-system-onboarding";

export class PostgresStore implements Store {
  private sql: postgres.Sql;
  private imageGenerationsReady: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { prepare: false });
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

  async updateWorkspace(id: string, patch: { name: string }): Promise<Workspace> {
    const rows = await this.sql<
      { id: string; name: string; slug: string; ownerUserId: string; createdAt: Date | string }[]
    >`
      update workspaces
      set name = ${patch.name}
      where id = ${id}
      returning id, name, slug, owner_user_id as "ownerUserId", created_at as "createdAt"
    `;
    const row = rows[0];
    if (!row) throw new Error("workspace not found");
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.ownerUserId,
      createdAt: iso(row.createdAt),
    };
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.sql`delete from referral_attributions where referrer_workspace_id = ${id}`;
    await this.sql`delete from workspaces where id = ${id}`;
  }

  async addMembership(input: Membership): Promise<void> {
    await this.sql`
      insert into memberships (user_id, workspace_id, role)
      values (${input.userId}, ${input.workspaceId}, ${input.role})
      on conflict (user_id, workspace_id) do update set role = excluded.role
    `;
  }

  async removeMembershipsForUser(userId: string): Promise<void> {
    await this.sql`delete from memberships where user_id = ${userId}`;
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

  async createPage(input: Omit<Page, "id" | "updatedAt" | "documentVersion">): Promise<Page> {
    const page: Page = {
      ...input,
      id: randomId("pg_"),
      documentVersion: 1,
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
          ${this.sql.json(storedPageDocument(page.document, page.documentVersion) as never)},
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
    options: { expectedVersion?: number } = {},
  ): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) throw new Error("page not found");
    if (options.expectedVersion !== undefined && options.expectedVersion !== page.documentVersion) {
      throw new PageVersionConflictError();
    }
    const updated: Page = {
      ...page,
      ...patch,
      documentVersion: page.documentVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    try {
      const rows = await this.sql<{ id: string }[]>`
        update pages
        set name = ${updated.name},
            slug = ${updated.slug},
            status = ${updated.status},
            document = ${this.sql.json(storedPageDocument(updated.document, updated.documentVersion) as never)},
            updated_at = ${updated.updatedAt}
        where id = ${id}
          ${options.expectedVersion === undefined ? this.sql`` : this.sql`and coalesce((document ->> '__wefloDocumentVersion')::int, 1) = ${options.expectedVersion}`}
        returning id
      `;
      if (rows.length === 0) throw new PageVersionConflictError();
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
             affiliate_id as "affiliateId",
             last_affiliate_stats as "lastAffiliateStats"
      from whop_links
      where workspace_id = ${workspaceId}
    `;
    const row = rows[0];
    if (!row) return null;
    return { ...row, lastAffiliateStats: row.lastAffiliateStats ?? null };
  }

  async saveWhop(link: WhopLink): Promise<void> {
    const stats = link.lastAffiliateStats ? this.sql.json(link.lastAffiliateStats) : null;
    await this.sql`
      insert into whop_links (workspace_id, membership_id, plan_id, status, manage_url, affiliate_id, last_affiliate_stats)
      values (
        ${link.workspaceId},
        ${link.membershipId},
        ${link.planId},
        ${link.status},
        ${link.manageUrl},
        ${link.affiliateId},
        ${stats}
      )
      on conflict (workspace_id) do update set
        membership_id = excluded.membership_id,
        plan_id = excluded.plan_id,
        status = excluded.status,
        manage_url = excluded.manage_url,
        affiliate_id = excluded.affiliate_id,
        last_affiliate_stats = excluded.last_affiliate_stats
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

  private ensureImageGenerations(): Promise<void> {
    if (!this.imageGenerationsReady) this.imageGenerationsReady = (async () => {
      await this.sql`
        create table if not exists image_generations (
          id text primary key,
          workspace_id text not null,
          user_id text not null,
          model text not null,
          prompt text not null,
          aspect_ratio text not null,
          reference_url text,
          images jsonb not null,
          status text not null,
          created_at timestamptz not null
        )
      `;
      await this.sql`create index if not exists image_generations_workspace_created_idx on image_generations (workspace_id, created_at desc)`;
    })();
    return this.imageGenerationsReady;
  }

  private async ensureOnboardingWorkspace(): Promise<void> {
    await this.sql`
      insert into workspaces (id, name, slug, owner_user_id, created_at)
      values (${ONBOARDING_WORKSPACE_ID}, ${"Weflo Onboarding"}, ${ONBOARDING_WORKSPACE_SLUG}, ${"system:weflo"}, ${new Date().toISOString()})
      on conflict (id) do nothing
    `;
  }

  async createOnboardingDraft(input: CreateOnboardingDraftInput): Promise<OnboardingDraft> {
    const now = new Date().toISOString();
    const draft: OnboardingDraft = { ...structuredClone(input), id: randomId("ob_"), createdAt: now, updatedAt: now };
    await this.ensureOnboardingWorkspace();
    await this.sql`
      insert into pages (id, workspace_id, name, slug, type, status, document, updated_at)
      values (${draft.id}, ${ONBOARDING_WORKSPACE_ID}, ${"Brouillon d’onboarding"}, ${draft.id}, ${"onboarding"}, ${draft.status}, ${this.sql.json(draft as never)}, ${draft.updatedAt})
    `;
    return draft;
  }

  async getOnboardingDraft(id: string): Promise<OnboardingDraft | null> {
    const rows = await this.sql<{ payload: OnboardingDraft }[]>`
      select document as payload
      from pages
      where id = ${id} and workspace_id = ${ONBOARDING_WORKSPACE_ID} and type = ${"onboarding"}
    `;
    return rows[0]?.payload ? structuredClone(rows[0].payload) : null;
  }

  async updateOnboardingDraft(id: string, patch: OnboardingDraftPatch): Promise<OnboardingDraft> {
    const draft = await this.getOnboardingDraft(id);
    if (!draft) throw new Error("onboarding draft not found");
    const updated: OnboardingDraft = { ...draft, ...structuredClone(patch), updatedAt: new Date().toISOString() };
    const rows = await this.sql<{ id: string }[]>`
      update pages
      set status = ${updated.status}, document = ${this.sql.json(updated as never)}, updated_at = ${updated.updatedAt}
      where id = ${id} and workspace_id = ${ONBOARDING_WORKSPACE_ID} and type = ${"onboarding"}
      returning id
    `;
    if (!rows.length) throw new Error("onboarding draft not found");
    return updated;
  }

  async claimOnboardingDraft(id: string, claimTokenHash: string, userId: string, pageId: string): Promise<OnboardingDraft> {
    const draft = await this.getOnboardingDraft(id);
    if (!draft) throw new Error("onboarding draft not found");
    if (draft.claimTokenHash !== claimTokenHash) throw new Error("invalid claim token");
    if (draft.claimedPageId) return draft;
    return this.updateOnboardingDraft(id, { status: "claimed", claimedUserId: userId, claimedPageId: pageId });
  }

  async listImageGenerations(workspaceId: string): Promise<ImageGeneration[]> {
    await this.ensureImageGenerations();
    const rows = await this.sql<ImageGenerationRow[]>`
      select id, workspace_id as "workspaceId", user_id as "userId", model, prompt,
             aspect_ratio as "aspectRatio", reference_url as "referenceUrl", images, status,
             created_at as "createdAt"
      from image_generations where workspace_id = ${workspaceId}
      order by created_at desc limit 100
    `;
    return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
  }

  async saveImageGeneration(generation: ImageGeneration): Promise<void> {
    await this.ensureImageGenerations();
    await this.sql`
      insert into image_generations (id, workspace_id, user_id, model, prompt, aspect_ratio, reference_url, images, status, created_at)
      values (${generation.id}, ${generation.workspaceId}, ${generation.userId}, ${generation.model}, ${generation.prompt}, ${generation.aspectRatio}, ${generation.referenceUrl}, ${this.sql.json(generation.images as never)}, ${generation.status}, ${generation.createdAt})
      on conflict (id) do nothing
    `;
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
  lastAffiliateStats: AffiliateStats | null;
};

type ImageGenerationRow = Omit<ImageGeneration, "createdAt"> & { createdAt: Date | string };

function mapPage(row: PageRow): Page {
  const stored = row.document as PageDocument & { __wefloDocumentVersion?: unknown };
  const documentVersion = typeof stored.__wefloDocumentVersion === "number" ? stored.__wefloDocumentVersion : 1;
  const { __wefloDocumentVersion: _version, ...document } = stored;
  return { ...row, document: document as PageDocument, documentVersion, updatedAt: iso(row.updatedAt) };
}

function storedPageDocument(document: PageDocument, version: number): PageDocument & { __wefloDocumentVersion: number } {
  return { ...document, __wefloDocumentVersion: version };
}

function mapCredits(row: CreditRow): CreditLedger {
  return { ...row, monthlyResetAt: iso(row.monthlyResetAt) };
}
