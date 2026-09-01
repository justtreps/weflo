import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { assertReferralAllowed, checkoutRedirectUrl } from "../lib/whop";
import type { AffiliateStats } from "../types";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";

const REF_COOKIE = "weflo_ref";
const REF_MAX_AGE = 30 * 24 * 60 * 60;
const ZERO_STATS: AffiliateStats = { earningsUsd: "0.00", referrals: 0, clicks: 0 };

const lastStats = new Map<string, AffiliateStats>();

export function referralCodeFromRequest(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(/(?:^|;\s*)weflo_ref=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function isNonZero(stats: AffiliateStats): boolean {
  return Number(stats.earningsUsd) > 0 || stats.referrals > 0 || stats.clicks > 0;
}

function planId(): string {
  return process.env.WHOP_PLAN_PRO?.trim() || process.env.WHOP_PLAN_STARTER?.trim() || "plan_pro";
}

function withAffiliateQuery(url: string, code: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get("a")) parsed.searchParams.set("a", code);
    return parsed.toString();
  } catch {
    return url.includes("?") ? `${url}&a=${encodeURIComponent(code)}` : `${url}?a=${encodeURIComponent(code)}`;
  }
}

async function checkoutUrl(deps: AppDeps, affiliateCode: string): Promise<string> {
  const redirectUrl = checkoutRedirectUrl(deps.publicAppUrl) ?? "https://whop.com";
  if (deps.whop) {
    try {
      const { purchaseUrl } = await deps.whop.createCheckout({
        planId: planId(),
        redirectUrl,
        metadata: { workspace_id: "", user_id: "", kind: "subscription" },
        affiliateCode,
      });
      return withAffiliateQuery(purchaseUrl, affiliateCode);
    } catch {
      /* fall through to a constructed checkout URL */
    }
  }
  return `https://whop.com/checkout/${planId()}?a=${encodeURIComponent(affiliateCode)}`;
}

async function persistStats(
  deps: AppDeps,
  workspaceId: string,
  stats: AffiliateStats,
): Promise<void> {
  lastStats.set(workspaceId, stats);
  const prev = await deps.store.getWhop(workspaceId);
  if (!prev) return;
  await deps.store.saveWhop({ ...prev, lastAffiliateStats: stats });
}

function storedStats(
  workspaceId: string,
  link: { lastAffiliateStats?: AffiliateStats | null } | null,
): AffiliateStats | null {
  return lastStats.get(workspaceId) ?? link?.lastAffiliateStats ?? null;
}

export async function maybeClaimFromCookie(
  deps: AppDeps,
  req: Request,
  refereeWorkspaceId: string,
): Promise<void> {
  const code = referralCodeFromRequest(req);
  if (!code) return;
  const referrer = await deps.store.getWorkspaceBySlug(code);
  if (!referrer) return;
  try {
    assertReferralAllowed(referrer.id, refereeWorkspaceId);
  } catch {
    return;
  }
  if (await deps.store.getAttribution(refereeWorkspaceId)) return;
  await deps.store.saveAttribution({
    refereeWorkspaceId,
    referrerWorkspaceId: referrer.id,
    promoApplied: Boolean(process.env.WHOP_PROMO_REFERRAL?.trim()),
    createdAt: new Date().toISOString(),
  });
}

export function referralPublicRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/r/:code", async (c) => {
    const code = c.req.param("code");
    setCookie(c, REF_COOKIE, code, {
      path: "/",
      maxAge: REF_MAX_AGE,
      sameSite: "Lax",
    });
    const workspace = await deps.store.getWorkspaceBySlug(code);
    const link = workspace ? await deps.store.getWhop(workspace.id) : null;
    const affiliateCode = link?.affiliateId || code;
    return c.redirect(await checkoutUrl(deps, affiliateCode), 302);
  });

  return app;
}

export function referralApiRoutes(deps: AppDeps) {
  const app = new Hono();

  app.post("/referral/claim", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{ code?: unknown }>().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return c.json({ error: "invalid" }, 400);
    const referrer = await deps.store.getWorkspaceBySlug(code);
    if (!referrer) return c.json({ error: "not found" }, 404);
    const referee = await ensureWorkspace(deps.store, user.id, {
      whop: deps.whop,
      email: user.email,
    });
    try {
      assertReferralAllowed(referrer.id, referee.id);
    } catch {
      return c.json({ error: "self-referral" }, 400);
    }
    if (await deps.store.getAttribution(referee.id)) {
      return c.json({ error: "already attributed" }, 409);
    }
    await deps.store.saveAttribution({
      refereeWorkspaceId: referee.id,
      referrerWorkspaceId: referrer.id,
      promoApplied: Boolean(process.env.WHOP_PROMO_REFERRAL?.trim()),
      createdAt: new Date().toISOString(),
    });
    return c.json({ ok: true }, 200);
  });

  app.get("/referral", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id, {
      whop: deps.whop,
      email: user.email,
    });
    await maybeClaimFromCookie(deps, c.req.raw, workspace.id);
    const link = await deps.store.getWhop(workspace.id);
    const previous = storedStats(workspace.id, link);
    let stats = previous ?? ZERO_STATS;

    if (link?.affiliateId && deps.whop?.affiliateStats) {
      try {
        const fresh = await deps.whop.affiliateStats(link.affiliateId);
        const keepPrevious = previous && isNonZero(previous) && !isNonZero(fresh);
        stats = keepPrevious ? previous : fresh;
        await persistStats(deps, workspace.id, stats);
      } catch {
        stats = previous && isNonZero(previous) ? previous : (previous ?? ZERO_STATS);
      }
    }

    const origin = (deps.publicAppUrl ?? "").replace(/\/$/, "");
    return c.json({
      slug: workspace.slug,
      link: origin ? `${origin}/r/${workspace.slug}` : `/r/${workspace.slug}`,
      earningsUsd: stats.earningsUsd,
      referrals: stats.referrals,
      clicks: stats.clicks,
    });
  });

  return app;
}

export function promoFromReferralCookie(c: Context): {
  affiliateCode?: string;
  promoCode?: string;
} {
  const code = getCookie(c, REF_COOKIE) ?? referralCodeFromRequest(c.req.raw);
  if (!code) return {};
  const promo = process.env.WHOP_PROMO_REFERRAL?.trim();
  return { affiliateCode: code, promoCode: promo || undefined };
}
