import { Hono } from "hono";
import { encryptSecret } from "../lib/encrypt";
import { ensureWorkspace, requireUser } from "./pages";
import type { AppDeps } from "./app";
import { loadShopifyCatalog } from "./shopify-catalog";
import { buildCapabilityReport } from "../shopify/capability-report";
import { getSectionDefinition } from "../sections";

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

  app.post("/shopify/capabilities", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    const connection = await deps.store.getShopify(workspace.id);
    const body = await c.req.json<{ sections?: unknown }>().catch(() => ({}));
    const sections = Array.isArray(body.sections) ? body.sections.flatMap((item) => {
      if (!item || typeof item !== "object" || typeof (item as { type?: unknown }).type !== "string") return [];
      const type = (item as { type: string }).type;
      return getSectionDefinition(type) ? [{ type, settings: {} }] : [];
    }) : [];
    // App-installation metadata will be supplied by the Shopify webhook; absent
    // facts intentionally remain setup-required rather than being inferred from UI.
    const report = buildCapabilityReport({ sections, shopify: {
      connected: connection?.status === "connected",
      hasProductData: connection?.status === "connected",
      markets: connection?.status === "connected",
      localization: connection?.status === "connected",
    } });
    return c.json(report);
  });

  app.get("/shopify/products", async (c) => {
    const cursor = c.req.query("cursor")?.trim() || null;
    if (cursor && cursor.length > 1_000) return c.json({ error: "invalid_cursor", message: "Cette page de catalogue n’est plus valide. Recharge le catalogue." }, 400);
    const result = await loadShopifyCatalog(deps, c.req.raw, cursor);
    if (!result.ok) return c.json(result.body, result.status);
    return c.json({
      shopDomain: result.shopDomain,
      products: result.products.map((product) => ({
        id: product.id,
        title: product.title,
        vendor: product.vendor,
        price: product.price,
        currency: product.currency,
        image: product.images[0] ?? null,
      })),
      nextCursor: result.nextCursor,
      previousCursor: result.previousCursor,
    });
  });

  app.post("/shopify/connect", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (!deps.shopify) return c.json({ error: "unavailable" }, 503);
    const body = await c.req
      .json<{ workspaceId?: unknown; shopDomain?: unknown; token?: unknown }>()
      .catch(() => ({} as { workspaceId?: unknown; shopDomain?: unknown; token?: unknown }));
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
    const body = await c.req.json<{ workspaceId?: unknown }>()
      .catch(() => ({} as { workspaceId?: unknown }));
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
