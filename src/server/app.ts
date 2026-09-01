import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import type { AppSession, AuthPort, LlmPort, ShopifyPort, WhopPort } from "../types";
import type { Store } from "../repos/types";
import { authRoutes } from "./auth";
import { billingRoutes } from "./billing";
import { meRoutes } from "./me";
import { pagesRoutes } from "./pages";
import { referralApiRoutes, referralPublicRoutes } from "./referral";
import { shopifyRoutes } from "./shopify";
import { storefrontRoutes } from "./storefront";

export type { ShopifyPort, WhopPort };

export type AppDeps = {
  store: Store;
  session: (req: Request) => Promise<AppSession>;
  auth?: AuthPort;
  llm?: LlmPort;
  shopify?: ShopifyPort;
  encryptionKey?: string;
  whop?: WhopPort;
  publicAppUrl?: string;
};

const htmlRoutes: Record<string, string> = {
  "/connexion": "connexion.html",
  "/dashboard": "dashboard.html",
  "/editeur": "editeur.html",
  "/facturation": "facturation.html",
  "/parrainage": "parrainage.html",
  "/direction-artistique": "direction-artistique.html",
  "/mascottes": "mascottes.html",
  "/maquettes": "maquettes.html",
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.get("/", async (c) => {
    const user = await deps.session(c.req.raw);
    return c.redirect(user ? "/dashboard" : "/connexion");
  });

  for (const [route, file] of Object.entries(htmlRoutes)) {
    app.get(route, async (c) => {
      const html = await readFile(join(process.cwd(), "public", file), "utf8");
      return c.html(html);
    });
  }

  app.get("/hydrate/*", async (c) => {
    const name = c.req.path.replace("/hydrate/", "");
    const root = join(process.cwd(), "public", "hydrate");
    const target = normalize(join(root, name));
    const rootWithSep = root.endsWith(sep) ? root : root + sep;
    if (name.includes("..") || (!target.startsWith(rootWithSep) && target !== root)) {
      return c.body("Not found", 404);
    }
    try {
      const js = await readFile(target, "utf8");
      return c.body(js, 200, { "content-type": "application/javascript" });
    } catch {
      return c.body("Not found", 404);
    }
  });

  app.route("/api", authRoutes(deps));
  app.route("/api", meRoutes(deps));
  app.route("/api", pagesRoutes(deps));
  app.route("/api", shopifyRoutes(deps));
  app.route("/api", billingRoutes(deps));
  app.route("/api", referralApiRoutes(deps));
  app.route("/", referralPublicRoutes(deps));
  app.route("/", storefrontRoutes(deps));

  return app;
}
