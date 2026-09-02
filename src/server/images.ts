import { Hono } from "hono";
import type { AppDeps } from "./app";
import { requireUser } from "./pages";

export function imageRoutes(deps: AppDeps) {
  const app = new Hono();
  app.post("/images/edit", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (!deps.imageEdit) return c.json({ error: "unavailable", message: "AI image editing is not configured." }, 503);
    const body = await c.req.json<{ sourceUrl?: unknown; prompt?: unknown }>().catch(() => ({} as { sourceUrl?: unknown; prompt?: unknown }));
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1000) : "";
    if ((!sourceUrl.startsWith("https://") && !sourceUrl.startsWith("data:image/")) || !prompt) return c.json({ error: "invalid_request" }, 400);
    try { return c.json(await deps.imageEdit.edit({ sourceUrl, prompt })); }
    catch (error) { return c.json({ error: "image_edit_failed", message: error instanceof Error ? error.message : "Image edit failed." }, 502); }
  });
  return app;
}
