import { Hono } from "hono";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";
import { maybeClaimFromCookie } from "./referral";

export function meRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/me", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id, {
      whop: deps.whop,
      email: user.email,
    });
    await maybeClaimFromCookie(deps, c.req.raw, workspace.id);
    return c.json({ ...user, workspace });
  });

  return app;
}
