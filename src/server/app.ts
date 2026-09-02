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
import { settingsRoutes } from "./settings";
import { shopifyRoutes } from "./shopify";
import { storefrontRoutes } from "./storefront";
import type { ProductFetchPort } from "../import/product-extractor";
import type { OnboardingAiPort } from "../onboarding/analyser";

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
  inviteEmail?: (input: { email: string; workspaceId: string; role: string }) => Promise<void>;
  deleteUser?: (userId: string) => Promise<void>;
  productFetch?: ProductFetchPort;
  onboardingAi?: OnboardingAiPort;
};

function assetType(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".woff2")) return "font/woff2";
  if (name.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

const htmlRoutes: Record<string, string> = {
  "/": "accueil.html",
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
      const content = await readFile(target, "utf8");
      const contentType = name.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8";
      return c.body(content, 200, { "content-type": contentType });
    } catch {
      return c.body("Not found", 404);
    }
  });

  app.get("/assets/*", async (c) => {
    const name = c.req.path.replace("/assets/", "");
    const root = join(process.cwd(), "public", "assets");
    const target = normalize(join(root, name));
    const rootWithSep = root.endsWith(sep) ? root : root + sep;
    if (name.includes("..") || (!target.startsWith(rootWithSep) && target !== root)) {
      return c.body("Not found", 404);
    }
    try {
      const data = await readFile(target);
      return c.body(data, 200, { "content-type": assetType(name) });
    } catch {
      return c.body("Not found", 404);
    }
  });

  app.route("/api", authRoutes(deps));
  app.route("/api", meRoutes(deps));
  app.route("/api", settingsRoutes(deps));
  app.route("/api", pagesRoutes(deps));
  app.route("/api", shopifyRoutes(deps));
  app.route("/api", billingRoutes(deps));
  app.route("/api", referralApiRoutes(deps));
  app.route("/", referralPublicRoutes(deps));
  app.route("/", storefrontRoutes(deps));

  return app;
}
