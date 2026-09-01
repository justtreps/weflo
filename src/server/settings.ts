import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import type { Store } from "../repos/types";
import type { User } from "../types";
import type { AppDeps } from "./app";
import { requireUser } from "./pages";

const COOKIE = "sb-access-token";

async function currentWorkspace(store: Store, user: User) {
  const workspaces = await store.listWorkspaces(user.id);
  const workspace = workspaces[0];
  if (!workspace) return null;
  const membership = await store.assertMember(user.id, workspace.id);
  return { workspace, membership };
}

function isOwner(role: string): boolean {
  return role === "owner";
}

export function settingsRoutes(deps: AppDeps) {
  const app = new Hono();

  app.patch("/workspace", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const current = await currentWorkspace(deps.store, user);
    if (!current) return c.json({ error: "not found" }, 404);
    if (!isOwner(current.membership.role)) return c.json({ error: "forbidden" }, 403);
    const body = (await c.req.json().catch(() => ({}))) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return c.json({ error: "invalid name" }, 400);
    const updated = await deps.store.updateWorkspace(current.workspace.id, { name });
    return c.json(updated);
  });

  app.post("/workspace/members", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const current = await currentWorkspace(deps.store, user);
    if (!current) return c.json({ error: "not found" }, 404);
    if (!isOwner(current.membership.role)) return c.json({ error: "forbidden" }, 403);
    const body = (await c.req.json().catch(() => ({}))) as { email?: unknown; role?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "member";
    if (!email) return c.json({ error: "invalid email" }, 400);
    if (deps.inviteEmail) {
      await deps.inviteEmail({ email, workspaceId: current.workspace.id, role });
    }
    return c.json({ ok: true });
  });

  app.delete("/workspace", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const current = await currentWorkspace(deps.store, user);
    if (!current) return c.json({ error: "not found" }, 404);
    if (!isOwner(current.membership.role)) return c.json({ error: "forbidden" }, 403);
    await deps.store.deleteWorkspace(current.workspace.id);
    return c.body(null, 204);
  });

  app.delete("/me", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    await deps.store.removeMembershipsForUser(user.id);
    if (deps.deleteUser) await deps.deleteUser(user.id);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  return app;
}
