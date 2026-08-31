import { Hono } from "hono";
import { applyWhopEvent, checkoutRedirectUrl } from "../lib/whop";
import { ensureWorkspace, requireUser } from "./pages";
import type { AppDeps } from "./app";

function requireMember(deps: AppDeps, userId: string, workspaceId: string) {
  return deps.store.assertMember(userId, workspaceId).then(
    () => true,
    () => false,
  );
}

export function billingRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/billing", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    const [credits, whop, shopify] = await Promise.all([
      deps.store.getCredits(workspace.id),
      deps.store.getWhop(workspace.id),
      deps.store.getShopify(workspace.id),
    ]);
    return c.json({
      plan: {
        status: whop?.status ?? "none",
        planId: whop?.planId ?? null,
      },
      credits: {
        monthlyRemaining: credits.monthlyRemaining,
        purchasedRemaining: credits.purchasedRemaining,
        monthlyResetAt: credits.monthlyResetAt,
      },
      manageUrl: whop?.manageUrl ?? null,
      shopify: {
        status: shopify?.status ?? "none",
        shopDomain: shopify?.shopDomain ?? null,
      },
      catalog: {
        starter: process.env.WHOP_PLAN_STARTER?.trim() || null,
        pro: process.env.WHOP_PLAN_PRO?.trim() || null,
        credits: process.env.WHOP_PLAN_CREDITS?.trim() || null,
      },
    });
  });

  app.post("/billing/checkout", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (!deps.whop) return c.json({ error: "unavailable" }, 503);
    const body = await c.req
      .json<{ workspaceId?: unknown; kind?: unknown; planId?: unknown }>()
      .catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const planId = typeof body.planId === "string" ? body.planId : "";
    const kind = body.kind === "subscription" || body.kind === "credits" ? body.kind : "";
    if (!workspaceId || !planId || !kind) return c.json({ error: "invalid" }, 400);
    if (!(await requireMember(deps, user.id, workspaceId))) {
      return c.json({ error: "forbidden" }, 403);
    }
    const redirectUrl = checkoutRedirectUrl(deps.publicAppUrl);
    if (!redirectUrl) return c.json({ error: "invalid" }, 400);

    const { purchaseUrl } = await deps.whop.createCheckout({
      planId,
      redirectUrl,
      metadata: { workspace_id: workspaceId, user_id: user.id, kind },
    });
    return c.json({ url: purchaseUrl });
  });

  app.post("/billing/whop/webhook", async (c) => {
    if (!deps.whop) return c.json({ error: "unavailable" }, 503);
    const raw = await c.req.text();
    try {
      const event = deps.whop.verifyWebhook(raw, c.req.raw.headers);
      await applyWhopEvent(deps.store, event);
      return c.text("OK", 200);
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
  });

  return app;
}
