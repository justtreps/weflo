import { Hono } from "hono";
import { ensureWorkspace, requireUser } from "./pages";
import type { AppDeps } from "./app";

export function meRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/me", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    return c.json({ ...user, workspace });
  });

  return app;
}
