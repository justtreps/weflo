import { Hono } from "hono";
import { encryptSecret } from "../lib/encrypt";
import { ensureWorkspace, requireUser } from "./pages";
import type { AppDeps } from "./app";

function normalizeShop(shop: string): string {
  return shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
}

async function requireMember(deps: AppDeps, userId: string, workspaceId: string) {
  try {
    await deps.store.assertMember(userId, workspaceId);
    return true;
  } catch {
    return false;
  }
}

export function shopifyRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/shopify", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    const conn = await deps.store.getShopify(workspace.id);
    return c.json({
      status: conn?.status ?? "none",
      shopDomain: conn?.shopDomain ?? null,
    });
  });

  app.post("/shopify/connect", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (!deps.shopify) return c.json({ error: "unavailable" }, 503);
    const body = await c.req
      .json<{ workspaceId?: unknown; shopDomain?: unknown; token?: unknown }>()
      .catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const shopDomain = typeof body.shopDomain === "string" ? normalizeShop(body.shopDomain) : "";
    const token = typeof body.token === "string" ? body.token : "";
    if (!workspaceId || !shopDomain || !token) return c.json({ error: "invalid" }, 400);
    if (!(await requireMember(deps, user.id, workspaceId))) {
      return c.json({ error: "forbidden" }, 403);
    }

    try {
      await deps.shopify.ping(shopDomain, token);
    } catch {
      await deps.store.saveShopify({
        workspaceId,
        shopDomain,
        tokenEncrypted: "",
        status: "invalid",
      });
      return c.json({ error: "invalid", status: "invalid" }, 400);
    }

    if (!deps.encryptionKey) return c.json({ error: "unavailable" }, 503);
    const tokenEncrypted = encryptSecret(token, deps.encryptionKey);
    await deps.store.saveShopify({
      workspaceId,
      shopDomain,
      tokenEncrypted,
      status: "connected",
    });
    return c.json({ status: "connected", shopDomain });
  });

  app.post("/shopify/disconnect", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{ workspaceId?: unknown }>().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    if (!workspaceId) return c.json({ error: "invalid" }, 400);
    if (!(await requireMember(deps, user.id, workspaceId))) {
      return c.json({ error: "forbidden" }, 403);
    }
    await deps.store.clearShopify(workspaceId);
    return c.json({ status: "none" });
  });

  return app;
}
