import { Hono } from "hono";
import { ensureWorkspace, requireUser } from "./pages";
import type { AppDeps } from "./app";
import { isImageAspectRatio, isImageModel } from "../studio/models";
import type { ImageGeneration } from "../studio/types";

function id() { return `img_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`; }

export function studioRoutes(deps: AppDeps) {
  const app = new Hono();
  app.get("/studio/generations", async (c) => {
    const user = await requireUser(deps, c.req.raw); if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    return c.json({ generations: await deps.store.listImageGenerations(workspace.id) });
  });
  app.post("/studio/generate", async (c) => {
    const user = await requireUser(deps, c.req.raw); if (!user) return c.json({ error: "unauthorized" }, 401);
    const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const numImages = typeof body.numImages === "number" ? Math.floor(body.numImages) : 1;
    if (!prompt || prompt.length > 3000 || !isImageModel(body.model) || !isImageAspectRatio(body.aspectRatio) || numImages < 1 || numImages > 4) return c.json({ error: "invalid_request", message: "Choisis un modèle, un format et décris l’image à générer." }, 400);
    if (!deps.imageStudio) return c.json({ error: "unavailable", message: "Le Studio images n’est pas configuré sur cet environnement." }, 503);
    const referenceUrl = typeof body.referenceUrl === "string" && /^(https:\/\/|data:image\/)/.test(body.referenceUrl) ? body.referenceUrl : null;
    const workspace = await ensureWorkspace(deps.store, user.id);
    try {
      const result = await deps.imageStudio.generate({ model: body.model, prompt, aspectRatio: body.aspectRatio, numImages, referenceUrl });
      const row: ImageGeneration = { id: id(), workspaceId: workspace.id, userId: user.id, model: body.model, prompt, aspectRatio: body.aspectRatio, referenceUrl, images: result.images, status: "completed", createdAt: new Date().toISOString() };
      await deps.store.saveImageGeneration(row);
      return c.json(row, 201);
    } catch (error) {
      console.error("studio generation failed", error instanceof Error ? error.message : error);
      return c.json({ error: "generation_failed", message: "La génération n’a pas abouti. Réessaie dans un instant." }, 502);
    }
  });
  return app;
}
