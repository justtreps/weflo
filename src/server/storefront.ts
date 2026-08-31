import { Hono } from "hono";
import { renderNotFound, renderPage } from "../lib/render-page";
import type { AppDeps } from "./app";

export function storefrontRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/s/:workspace/:page", async (c) => {
    const workspace = await deps.store.getWorkspaceBySlug(c.req.param("workspace"));
    if (!workspace) return c.html(renderNotFound(), 404);
    const page = (await deps.store.listPages(workspace.id)).find(
      (p) => p.slug === c.req.param("page"),
    );
    if (!page) return c.html(renderNotFound(), 404);
    return c.html(renderPage(page.document));
  });

  return app;
}
