# Weflo Functional App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les maquettes HTML Weflo à un backend réel (auth, pages, Canardo, preview, Shopify par jeton, Whop, parrainage) sans changer le look.

**Architecture:** HTML extrait des bundles, servi en statique. JS d’hydratation (`src/hydrate/*`) appelle une API Hono (`src/server`). Postgres + Supabase Auth. Canardo = OpenAI sur un JSON de sections catalogue. Preview `/s/:workspace/:page`. Publish Shopify via jeton collé. Billing et affiliés = Whop.

**Tech Stack:** TypeScript, Hono (Vercel `api/index.ts`), Vitest, Supabase Auth, Postgres (`postgres` + SQL), OpenAI, Whop SDK, Admin API Shopify. Pas de React.

**Spec:** `docs/superpowers/specs/2026-08-31-weflo-functional-app-design.md`

---

## File structure

| Path | Responsibility |
|---|---|
| `scripts/extract-mockups.mjs` | Sort le HTML des bundles Claude vers `public/` |
| `public/*.html` | Maquettes extraites (seule source UI) |
| `src/types.ts` | Types partagés (Workspace, Page, PageDocument, …) |
| `src/lib/catalog.ts` | Catalogue de sections + documents initiaux |
| `src/lib/session.ts` | Résoudre l’user Supabase depuis le cookie |
| `src/lib/encrypt.ts` | Chiffrer / déchiffrer le jeton Shopify |
| `src/lib/credits.ts` | Débit crédits (mensuel d’abord, puis achetés) |
| `src/lib/canardo.ts` | Appel OpenAI → nouveau `PageDocument` |
| `src/lib/shopify.ts` | Test jeton + publish thème/produit (rollback) |
| `src/lib/whop.ts` | Checkout, webhooks, affiliés, promo |
| `src/lib/render-page.ts` | HTML storefront `/s/…` depuis le document |
| `src/repos/memory.ts` | Store in-memory pour les tests |
| `src/repos/postgres.ts` | Store Postgres prod |
| `src/repos/types.ts` | Interface `Store` |
| `src/server/app.ts` | App Hono, montage des routes |
| `src/server/routes/*.ts` | auth, pages, canardo, shopify, billing, referral |
| `src/hydrate/*.ts` | Liaison maquette ↔ API |
| `api/index.ts` | Entrée Vercel |
| `tests/*.test.ts` | Tests Vitest |
| `db/schema.sql` | Tables Postgres |
| `.env.example` | Noms des secrets, pas les valeurs |

Hors plan (plus tard, spec §8) : A/B réel, invitations d’équipe réelles.

---

## Tranche A — Extraire et servir les maquettes

### Task 1: Scaffold TypeScript + Vitest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/health.ts`
- Create: `tests/health.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing test**

```ts
// tests/health.test.ts
import { describe, it, expect } from "vitest";
import { health } from "../src/health";

describe("health", () => {
  it("returns ok", () => {
    expect(health()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/health.test.ts`
Expected: FAIL — `Cannot find module '../src/health'` (ou package.json absent).

- [ ] **Step 3: Write minimal implementation**

`package.json`:

```json
{
  "name": "weflo",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "dev": "tsx watch src/dev-server.ts",
    "extract": "node scripts/extract-mockups.mjs",
    "build:hydrate": "esbuild src/hydrate/connexion.ts src/hydrate/dashboard.ts src/hydrate/editeur.ts src/hydrate/facturation.ts src/hydrate/parrainage.ts src/hydrate/session-guard.ts --bundle --outdir=public/hydrate --format=esm"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  },
  "dependencies": {
    "@hono/node-server": "^1.19.0",
    "@supabase/supabase-js": "^2.57.0",
    "@whop/sdk": "^0.0.20",
    "hono": "^4.9.0",
    "openai": "^5.12.0",
    "postgres": "^3.4.7"
  }
}
```

`tsconfig.json`: `{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "strict": true, "skipLibCheck": true, "noEmit": true, "types": ["vitest/globals"] }, "include": ["src", "tests", "api"] }`

`vitest.config.ts`: `import { defineConfig } from "vitest"; export default defineConfig({ test: { environment: "node" } });`

`src/health.ts`: `export function health() { return { ok: true as const }; }`

`.gitignore` — ajouter : `.env`, `.dev.vars`, `dist/`, `public/hydrate/`

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npm install` puis `npm test`
Expected: PASS `health`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/health.ts tests/health.test.ts .gitignore
git commit -m "chore: scaffold TypeScript and Vitest"
```

---

### Task 2: Extraire le HTML des bundles

**Files:**
- Create: `scripts/extract-mockups.mjs`
- Create: `tests/extract-mockups.test.ts`
- Create: `public/` (généré, commité après extract)

Les fichiers racine `connexion.html` etc. restent les bundles sources. L’app sert `public/*.html`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/extract-mockups.test.ts
import { describe, it, expect } from "vitest";
import { extractTemplate, stripShopifyOauth, injectHydrate } from "../scripts/extract-lib.mjs";

const sample = `<script type="__bundler/template">"<!DOCTYPE html>\\n<html><body><button class=\\"oauth-shopify\\">avec Shopify</button><button class=\\"oauth-google\\">Google</button></body></html>"</script>`;

describe("extractTemplate", () => {
  it("parses the bundler template JSON string", () => {
    expect(extractTemplate(sample)).toContain("oauth-google");
  });
});

describe("stripShopifyOauth", () => {
  it("removes Shopify continue button, keeps Google", () => {
    const html = `<button>Continuer avec Shopify</button><button>Continuer avec Google</button>`;
    const out = stripShopifyOauth(html);
    expect(out).not.toMatch(/Shopify/i);
    expect(out).toMatch(/Google/);
  });
});

describe("injectHydrate", () => {
  it("appends a module script before </body>", () => {
    const out = injectHydrate("<html><body>x</body></html>", "/hydrate/connexion.js");
    expect(out).toContain('src="/hydrate/connexion.js"');
  });
});
```

Le test importe `scripts/extract-lib.mjs` — extraire la logique hors du CLI.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extract-mockups.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/extract-lib.mjs
export function extractTemplate(html) {
  const start = '<script type="__bundler/template">';
  const i = html.indexOf(start);
  if (i < 0) throw new Error("missing __bundler/template");
  const j = html.indexOf("</script>", i);
  return JSON.parse(html.slice(i + start.length, j));
}

export function stripShopifyOauth(html) {
  return html
    .replace(/<button[^>]*>[\s\S]*?Shopify[\s\S]*?<\/button>/gi, "")
    .replace(/<a[^>]*>[\s\S]*?Shopify[\s\S]*?<\/a>/gi, "");
}

export function injectHydrate(html, src) {
  const tag = `<script type="module" src="${src}"></script>\n`;
  if (html.includes("</body>")) return html.replace("</body>", `${tag}</body>`);
  return html + tag;
}
```

```js
// scripts/extract-mockups.mjs
import fs from "node:fs";
import path from "node:path";
import { extractTemplate, stripShopifyOauth, injectHydrate } from "./extract-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const map = {
  "connexion.html": "/hydrate/connexion.js",
  "dashboard.html": "/hydrate/dashboard.js",
  "editeur.html": "/hydrate/editeur.js",
  "facturation.html": "/hydrate/facturation.js",
  "parrainage.html": "/hydrate/parrainage.js",
  "direction-artistique.html": null,
  "mascottes.html": null,
};

fs.mkdirSync(path.join(root, "public"), { recursive: true });
for (const [file, hydrate] of Object.entries(map)) {
  let html = extractTemplate(fs.readFileSync(path.join(root, file), "utf8"));
  if (file === "connexion.html") html = stripShopifyOauth(html);
  if (hydrate) html = injectHydrate(html, hydrate);
  fs.writeFileSync(path.join(root, "public", file), html);
}

// Hub interne
const hub = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.writeFileSync(path.join(root, "public", "maquettes.html"), hub);
```

- [ ] **Step 4: Run tests and extract**

Run: `npx vitest run tests/extract-mockups.test.ts` puis `npm run extract`
Expected: PASS ; `public/connexion.html` existe et ne contient plus « Shopify » comme CTA login.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-lib.mjs scripts/extract-mockups.mjs tests/extract-mockups.test.ts public
git commit -m "feat: extract mockup HTML and drop Shopify login"
```

---

### Task 3: Serveur Hono + routes HTML + `/`

**Files:**
- Create: `src/server/app.ts`
- Create: `src/dev-server.ts`
- Create: `api/index.ts`
- Create: `tests/server-routes.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the failing test**

```ts
// tests/server-routes.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";

describe("static routes", () => {
  it("serves extracted connexion HTML", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/connexion");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/html/i);
    expect(body).not.toMatch(/Continuer avec Shopify/i);
  });

  it("redirects / to /connexion when logged out", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/connexion");
  });

  it("redirects / to /dashboard when logged in", async () => {
    const app = createApp({
      store: null as never,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/dashboard");
  });

  it("serves DA pages without session", async () => {
    const app = createApp({ store: null as never, session: async () => null });
    expect((await app.request("/mascottes")).status).toBe(200);
    expect((await app.request("/maquettes")).status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server-routes.test.ts`
Expected: FAIL — `createApp` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types.ts
export type User = { id: string; email: string; name?: string | null };

export type PageType = "sell" | "write" | "blank";
export type PageStatus = "draft" | "published_hosted" | "published_shopify";
export type SectionType =
  | "navigation" | "productHero" | "benefits" | "bundle" | "guarantees"
  | "reviews" | "faq" | "cta" | "footer" | "hero" | "collectionGrid"
  | "atelier" | "article";

export type Section = { id: string; type: SectionType; settings: Record<string, unknown> };
export type PageDocument = { name: string; path: string; sections: Section[] };

export type Workspace = { id: string; name: string; slug: string; ownerUserId: string; createdAt: string };
export type WorkspaceRole = "owner" | "member" | "viewer";
export type Membership = { userId: string; workspaceId: string; role: WorkspaceRole };

export type Page = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  type: PageType;
  status: PageStatus;
  document: PageDocument;
  updatedAt: string;
};

export type ShopifyStatus = "connected" | "invalid" | "none";
export type ShopifyConnection = {
  workspaceId: string;
  shopDomain: string;
  tokenEncrypted: string;
  status: ShopifyStatus;
};

export type CreditLedger = {
  workspaceId: string;
  monthlyRemaining: number;
  monthlyResetAt: string;
  purchasedRemaining: number;
};

export type WhopLink = {
  workspaceId: string;
  membershipId: string | null;
  planId: string | null;
  status: "none" | "active" | "inactive";
  manageUrl: string | null;
  affiliateId: string | null;
};

export type ReferralAttribution = {
  refereeWorkspaceId: string;
  referrerWorkspaceId: string;
  promoApplied: boolean;
  createdAt: string;
};

export type AppSession = User | null;
```

`AppDeps` vit dans `src/server/app.ts` et s’enrichit aux tasks suivantes (`auth`, `llm`, `shopify`, `encryptionKey`, `publicAppUrl`, `whop`) — toujours le même type, champs optionnels jusqu’à ce qu’ils soient exigés.

```ts
// src/server/app.ts
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppSession } from "../types";
import type { Store } from "../repos/types";

export type AppDeps = {
  store: Store;
  session: (req: Request) => Promise<AppSession>;
  auth?: AuthPort;
  llm?: LlmPort;
  shopify?: ShopifyPort;
  encryptionKey?: string;
  publicAppUrl?: string;
  whop?: WhopPort;
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
    const js = await readFile(join(process.cwd(), "public", "hydrate", name), "utf8");
    return c.body(js, 200, { "content-type": "application/javascript" });
  });

  return app;
}
```

Pour que le test compile, créer un `Store` minimal :

```ts
// src/repos/types.ts
import type { CreditLedger, Membership, Page, ReferralAttribution, ShopifyConnection, User, WhopLink, Workspace } from "../types";

export interface Store {
  createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace>;
  listWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  assertMember(userId: string, workspaceId: string): Promise<Membership>;
  listPages(workspaceId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  createPage(input: Omit<Page, "id" | "updatedAt">): Promise<Page>;
  updatePage(id: string, patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">>): Promise<Page>;
  deletePage(id: string): Promise<void>;
  getCredits(workspaceId: string): Promise<CreditLedger>;
  saveCredits(ledger: CreditLedger): Promise<void>;
  getShopify(workspaceId: string): Promise<ShopifyConnection | null>;
  saveShopify(conn: ShopifyConnection): Promise<void>;
  clearShopify(workspaceId: string): Promise<void>;
  getWhop(workspaceId: string): Promise<WhopLink | null>;
  saveWhop(link: WhopLink): Promise<void>;
  getAttribution(refereeWorkspaceId: string): Promise<ReferralAttribution | null>;
  saveAttribution(row: ReferralAttribution): Promise<void>;
  getUserProfile(userId: string): Promise<User | null>;
}
```

Implémenter `MemoryStore` vide qui throw `not implemented` sauf si un test de cette task n’appelle pas le store (`store: null as never` est OK tant que `/` et HTML n’y touchent pas).

`src/dev-server.ts` : `@hono/node-server` `serve({ fetch: createApp(prodDeps()).fetch, port: 3000 })`.

`api/index.ts` : `import { handle } from "hono/vercel"; import { createApp } from "../src/server/app"; import { prodDeps } from "../src/server/prod"; export default handle(createApp(prodDeps()));`

`src/server/prod.ts` peut attendre Task 5 ; pour Task 3, `prodDeps` avec `session: async () => null` et `MemoryStore`.

`vercel.json` :

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }]
}
```

Les pages HTML sont servies par Hono, pas par le static Vercel, pour `/` session-aware.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/server-routes.test.ts`
Expected: PASS (lancer `npm run extract` avant si `public/` manque).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/repos/types.ts src/server/app.ts src/server/prod.ts src/dev-server.ts api/index.ts tests/server-routes.test.ts vercel.json
git commit -m "feat: serve extracted screens and session-aware /"
```

---

## Tranche B — Auth + espaces + pages + dashboard

### Task 4: MemoryStore — workspaces et pages

**Files:**
- Create: `src/repos/memory.ts`
- Create: `tests/memory-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/memory-store.test.ts
import { describe, it, expect } from "vitest";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("MemoryStore pages", () => {
  it("creates a workspace for the owner and isolates pages", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    expect(ws.slug.length).toBeGreaterThan(0);
    const page = await store.createPage({
      workspaceId: ws.id,
      name: "Home",
      slug: "home",
      type: "sell",
      status: "draft",
      document: initialDocument("Home", "sell"),
    });
    expect((await store.listPages(ws.id)).map((p) => p.id)).toEqual([page.id]);
    await expect(store.assertMember("u2", ws.id)).rejects.toThrow(/forbidden/i);
  });

  it("duplicates by creating a second page with copied document", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const a = await store.createPage({
      workspaceId: ws.id, name: "A", slug: "a", type: "sell", status: "draft",
      document: initialDocument("A", "sell"),
    });
    const b = await store.createPage({
      workspaceId: ws.id, name: "A copy", slug: "a-copy", type: a.type, status: "draft",
      document: a.document,
    });
    expect(b.id).not.toBe(a.id);
    expect(b.document).toEqual(a.document);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/memory-store.test.ts`
Expected: FAIL — `MemoryStore` / `initialDocument` missing.

- [ ] **Step 3: Write catalog + MemoryStore**

```ts
// src/lib/catalog.ts
import type { PageDocument, PageType, SectionType } from "../types";

const SELL: SectionType[] = [
  "navigation", "productHero", "benefits", "bundle", "guarantees",
  "reviews", "faq", "cta", "footer",
];
const WRITE: SectionType[] = ["navigation", "article", "footer"];
const BLANK: SectionType[] = ["navigation", "hero", "footer"];

export function initialDocument(name: string, type: PageType): PageDocument {
  const types = type === "sell" ? SELL : type === "write" ? WRITE : BLANK;
  return {
    name,
    path: "/",
    sections: types.map((t, i) => ({
      id: `${t}-${i}`,
      type: t,
      settings: { title: name },
    })),
  };
}

export const SECTION_TYPES: SectionType[] = [
  "navigation", "productHero", "benefits", "bundle", "guarantees",
  "reviews", "faq", "cta", "footer", "hero", "collectionGrid", "atelier", "article",
];
```

`MemoryStore` : Map en mémoire, `createWorkspace` génère `id` (`ws_` + random) et `slug` (kebab du nom + suffixe). `assertMember` throw `Error("forbidden")` si pas owner/member. `getCredits` crée un ledger d’essai `{ monthlyRemaining: 40, monthlyResetAt: now+30d, purchasedRemaining: 0 }` à la première lecture.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/memory-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog.ts src/repos/memory.ts tests/memory-store.test.ts
git commit -m "feat: in-memory store for workspaces and pages"
```

---

### Task 5: Session helper + garde API

**Files:**
- Create: `src/lib/session.ts`
- Create: `tests/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/session.test.ts
import { describe, it, expect } from "vitest";
import { createSessionResolver } from "../src/lib/session";

describe("createSessionResolver", () => {
  it("returns null without cookie", async () => {
    const resolve = createSessionResolver({
      getUser: async () => { throw new Error("should not call"); },
    });
    expect(await resolve(new Request("http://x/"))).toBeNull();
  });

  it("returns user when getUser accepts the access token", async () => {
    const resolve = createSessionResolver({
      getUser: async (token) => token === "tok" ? { id: "u1", email: "a@b.c" } : null,
    });
    const req = new Request("http://x/", { headers: { cookie: "sb-access-token=tok" } });
    expect(await resolve(req)).toEqual({ id: "u1", email: "a@b.c" });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`createSessionResolver` missing)

- [ ] **Step 3: Implement**

```ts
// src/lib/session.ts
import type { AppSession, User } from "../types";

export function createSessionResolver(auth: {
  getUser: (accessToken: string) => Promise<User | null>;
}) {
  return async function session(req: Request): Promise<AppSession> {
    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    if (!match) return null;
    return auth.getUser(decodeURIComponent(match[1]));
  };
}
```

En prod, `getUser` = `supabase.auth.getUser(token)` puis map `{ id, email, name: user_metadata.name }`.

- [ ] **Step 4: `npx vitest run tests/session.test.ts` — PASS**

- [ ] **Step 5: Commit** `feat: resolve Supabase session from cookie`

---

### Task 6: Routes API pages + bootstrap workspace

**Files:**
- Create: `src/server/routes/pages.ts`
- Modify: `src/server/app.ts` — `app.route("/api", api)`
- Create: `tests/pages-api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/pages-api.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

function appAs(userId: string | null) {
  const store = new MemoryStore();
  const app = createApp({
    store,
    session: async () => (userId ? { id: userId, email: `${userId}@x.test` } : null),
  });
  return { app, store };
}

describe("pages API", () => {
  it("rejects anonymous", async () => {
    const { app } = appAs(null);
    expect((await app.request("/api/pages")).status).toBe(401);
  });

  it("bootstraps a workspace and creates a sell page", async () => {
    const { app } = appAs("u1");
    const created = await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "sell", name: "Produit" }),
    });
    expect(created.status).toBe(201);
    const page = await created.json();
    expect(page.type).toBe("sell");
    expect(page.document.sections.some((s: { type: string }) => s.type === "productHero")).toBe(true);

    const list = await app.request("/api/pages");
    const body = await list.json();
    expect(body.pages).toHaveLength(1);
    expect(body.workspace.name).toBeTruthy();
  });

  it("renames, duplicates, deletes", async () => {
    const { app } = appAs("u1");
    const page = await (await app.request("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "blank", name: "X" }),
    })).json();

    const renamed = await (await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Y" }),
    })).json();
    expect(renamed.name).toBe("Y");

    const dup = await app.request(`/api/pages/${page.id}/duplicate`, { method: "POST" });
    expect(dup.status).toBe(201);

    expect((await app.request(`/api/pages/${page.id}`, { method: "DELETE" })).status).toBe(204);
    const list = await (await app.request("/api/pages")).json();
    expect(list.pages).toHaveLength(1);
    expect(list.pages[0].name).toMatch(/copy|copie|Y/i);
  });
});
```

- [ ] **Step 2: FAIL — routes missing**

- [ ] **Step 3: Implement `src/server/routes/pages.ts`**

Comportement :

- `requireUser` : 401 `{ error: "unauthorized" }` si pas de session.
- `ensureWorkspace(store, user)` : si `listWorkspaces` vide, `createWorkspace({ name: "Espace", ownerUserId })`.
- `POST /api/pages` body `{ type, name? }` — slug unique, `initialDocument`.
- `GET /api/pages` — `{ workspace, pages, workspaces }`.
- `PATCH /api/pages/:id` — `{ name, slug, document, status }` après `assertMember`.
- `POST /api/pages/:id/duplicate` — même document, nom `"{name} copy"`, slug suffixé.
- `DELETE /api/pages/:id` — 204.

Monter dans `createApp` : `app.route("/api", pagesRoutes(deps))`.

- [ ] **Step 4: `npx vitest run tests/pages-api.test.ts` — PASS**

- [ ] **Step 5: Commit** `feat: persist pages and bootstrap workspace`

---

### Task 7: Auth e-mail + Google (API + hydrate connexion)

**Files:**
- Create: `src/server/routes/auth.ts`
- Create: `src/hydrate/connexion.ts`
- Create: `tests/auth-api.test.ts`
- Create: `.env.example`

Les appels Supabase sont injectés (`AuthPort`) pour rester testables.

```ts
export type AuthPort = {
  signInEmail(email: string, password: string): Promise<{ accessToken: string; user: User }>;
  signUpEmail(email: string, password: string, name: string): Promise<{ accessToken: string; user: User }>;
  signInGoogle(): Promise<{ url: string }>;
  signOut(): Promise<void>;
};
```

- [ ] **Step 1: Failing tests**

```ts
// tests/auth-api.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

const auth = {
  signInEmail: async (email: string, password: string) => {
    if (password !== "ok") throw new Error("invalid");
    return { accessToken: "tok", user: { id: "u1", email } };
  },
  signUpEmail: async (email: string, password: string, name: string) => ({
    accessToken: "tok", user: { id: "u2", email, name },
  }),
  signInGoogle: async () => ({ url: "https://accounts.google.com/x" }),
  signOut: async () => {},
};

describe("auth API", () => {
  it("sets cookie on email login and returns 401 on bad password", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null, auth });
    const bad = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "no" }),
    });
    expect(bad.status).toBe(401);

    const ok = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "ok" }),
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toMatch(/sb-access-token=tok/);
  });

  it("returns Google redirect URL", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null, auth });
    const res = await app.request("/api/auth/google", { method: "POST" });
    expect((await res.json()).url).toMatch(/google/);
  });
});
```

Étendre `AppDeps` avec `auth?: AuthPort` (requis en prod).

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement routes + cookie `sb-access-token` HttpOnly, Secure en prod, Path=/, SameSite=Lax.**

`POST /api/auth/signup` `{ email, password, name }`  
`POST /api/auth/login` `{ email, password }` — message d’erreur JSON `{ error: "invalid" }`  
`POST /api/auth/google` → `{ url }` (Supabase `signInWithOAuth({ provider: "google", redirectTo: PUBLIC_APP_URL + "/dashboard" })`)  
`POST /api/auth/logout` — clear cookie.

`src/hydrate/connexion.ts` : bind le formulaire existant (query `input[type=email]`, `input[type=password]`, bouton Google, CTA). `preventDefault`, fetch, en cas d’erreur écrire le texte dans le nœud d’erreur déjà présent (ou `[data-auth-error]`, ajouté discrètement si absent). Succès → `location.href = "/dashboard"`.

- [ ] **Step 4: tests PASS ; `npm run build:hydrate`**

- [ ] **Step 5: Commit** `feat: email and Google auth on connexion screen`

`.env.example` :

```
PUBLIC_APP_URL=https://example.com
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
OPENAI_API_KEY=
INTEGRATION_ENCRYPTION_KEY=
WHOP_API_KEY=
WHOP_WEBHOOK_SECRET=
WHOP_ACCOUNT_ID=
WHOP_PRODUCT_ID=
WHOP_PLAN_STARTER=
WHOP_PLAN_PRO=
WHOP_PLAN_CREDITS=
```

---

### Task 8: Hydrate dashboard + garde session

**Files:**
- Create: `src/hydrate/dashboard.ts`
- Create: `src/hydrate/session-guard.ts`
- Create: `src/server/routes/me.ts`
- Create: `tests/dashboard-hydrate.test.ts`

`session-guard.ts` (chargé aussi sur éditeur / facturation / parrainage) : `GET /api/me` — 401 → `/connexion`.

- [ ] **Step 1: Test API me + list shape**

```ts
// tests/dashboard-hydrate.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

describe("GET /api/me", () => {
  it("returns 401 then profile", async () => {
    const store = new MemoryStore();
    const loggedOut = createApp({ store, session: async () => null });
    expect((await loggedOut.request("/api/me")).status).toBe(401);

    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "amir@test.com", name: "Amir" }),
    });
    const me = await (await app.request("/api/me")).json();
    expect(me.email).toBe("amir@test.com");
    expect(me.workspace).toBeTruthy();
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:** `GET /api/me` = user + workspace bootstrap.  
`dashboard.ts` : GET `/api/pages`, remplacer le nom / e-mail affichés, rendre les lignes de pages dans le tableau existant, binder :

- Nouvelle page Vendre / Écrire / Zéro → POST puis `location = "/editeur?page=" + id`
- Ouvrir / Dupliquer / Renommer / Copier lien (`${origin}/s/${workspace.slug}/${page.slug}`) / Supprimer
- Déconnexion → POST `/api/auth/logout`
- Liens facturation / parrainage : `href` déjà dans la maquette, les laisser (chemins `/facturation`, `/parrainage`)

Ne pas recréer le layout. Remplir les nœuds existants ; si un nœud liste est un template `{{ row.name }}` encore brut après extract, remplacer le bloc liste par clonage de la première ligne.

- [ ] **Step 4: `npx vitest run tests/dashboard-hydrate.test.ts` PASS**

- [ ] **Step 5: Commit** `feat: hydrate dashboard with live pages`

---

### Task 9: Schema SQL + PostgresStore

**Files:**
- Create: `db/schema.sql`
- Create: `src/repos/postgres.ts`
- Create: `tests/postgres-store.test.ts` (skip si pas de `DATABASE_URL`)

- [ ] **Step 1: SQL**

```sql
-- db/schema.sql
create table if not exists workspaces (
  id text primary key,
  name text not null,
  slug text not null unique,
  owner_user_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id text not null,
  workspace_id text not null references workspaces(id) on delete cascade,
  role text not null,
  primary key (user_id, workspace_id)
);

create table if not exists pages (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null,
  status text not null,
  document jsonb not null,
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists credit_ledgers (
  workspace_id text primary key references workspaces(id) on delete cascade,
  monthly_remaining int not null,
  monthly_reset_at timestamptz not null,
  purchased_remaining int not null
);

create table if not exists shopify_connections (
  workspace_id text primary key references workspaces(id) on delete cascade,
  shop_domain text not null,
  token_encrypted text not null,
  status text not null
);

create table if not exists whop_links (
  workspace_id text primary key references workspaces(id) on delete cascade,
  membership_id text,
  plan_id text,
  status text not null,
  manage_url text,
  affiliate_id text
);

create table if not exists referral_attributions (
  referee_workspace_id text primary key references workspaces(id) on delete cascade,
  referrer_workspace_id text not null references workspaces(id),
  promo_applied boolean not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: `PostgresStore` implémente `Store` avec les mêmes comportements que `MemoryStore` (mêmes slugs, mêmes erreurs `forbidden`).**

Test : si `process.env.DATABASE_URL` absent, `it.skip`. Sinon create/list/delete page.

- [ ] **Step 3: `prodDeps()` utilise `PostgresStore` + session Supabase.**

- [ ] **Step 4: `npm test` — tout PASS (postgres skip OK en CI sans URL)**

- [ ] **Step 5: Commit** `feat: postgres schema for workspaces and pages`

---

## Tranche C — Éditeur, preview, Canardo

### Task 10: Render storefront `/s/:workspace/:page`

**Files:**
- Create: `src/lib/render-page.ts`
- Create: `src/server/routes/storefront.ts`
- Create: `tests/render-page.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/render-page.test.ts
import { describe, it, expect } from "vitest";
import { renderPage } from "../src/lib/render-page";
import { initialDocument } from "../src/lib/catalog";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

describe("renderPage", () => {
  it("renders known sections and never dumps raw JSON as the page", () => {
    const html = renderPage(initialDocument("Bougie", "sell"));
    expect(html).toMatch(/Bougie/);
    expect(html).toMatch(/<section/);
    expect(html).not.toMatch(/"sections":/);
  });
});

describe("GET /s/:workspace/:page", () => {
  it("404s unknown slugs", async () => {
    const store = new MemoryStore();
    const app = createApp({ store, session: async () => null });
    expect((await app.request("/s/nope/nope")).status).toBe(404);
    const body = await (await app.request("/s/nope/nope")).text();
    expect(body).toMatch(/canard|404|introuvable/i);
  });

  it("serves a hosted page without auth", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "published_hosted", document: initialDocument("Home", "sell"),
    });
    const app = createApp({ store, session: async () => null });
    const res = await app.request(`/s/${ws.slug}/home`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/Home/);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:** `renderPage` : HTML minimal propre (typo Syne / encre / papier comme la DA) — **un `<section data-type>` par bloc**. 404 : page courte + canard qui pleure (SVG déjà dans `mascottes` ou un inline simple), pas un nouvel écran app.

Draft : `/s/…` accessible quand même (lien d’aperçu éditeur). Status ne bloque pas la lecture du lien.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: hosted preview at /s/:workspace/:page`

---

### Task 11: Sauvegarde éditeur + hydrate

**Files:**
- Create: `src/hydrate/editeur.ts`
- Create: `tests/editor-api.test.ts`

- [ ] **Step 1:**

```ts
// tests/editor-api.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("PATCH page document", () => {
  it("persists section settings", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const doc = { ...page.document, name: "Home 2" };
    const res = await app.request(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: doc, name: "Home 2" }),
    });
    expect(res.status).toBe(200);
    expect((await store.getPage(page.id))!.document.name).toBe("Home 2");
  });
});
```

- [ ] **Step 2: FAIL si PATCH ne persiste pas le document — corriger Task 6 si besoin**

- [ ] **Step 3:** `editeur.ts` lit `?page=`, GET page, injecte le nom / slug / preview iframe `src=/s/{ws}/{slug}`. Bind champs panneaux → PATCH debounce 400ms. Boutons A/B et invite : `preventDefault` no-op. Copier lien aperçu = `/s/...`.

- [ ] **Step 4: PASS + build hydrate**

- [ ] **Step 5: Commit** `feat: editor saves page document`

---

### Task 12: Crédits — débit et blocage

**Files:**
- Create: `src/lib/credits.ts`
- Create: `tests/credits.test.ts`

- [ ] **Step 1:**

```ts
// tests/credits.test.ts
import { describe, it, expect } from "vitest";
import { spendCredits, totalCredits } from "../src/lib/credits";

const base = {
  workspaceId: "ws1",
  monthlyRemaining: 5,
  monthlyResetAt: new Date(Date.now() + 86400000).toISOString(),
  purchasedRemaining: 2,
};

describe("spendCredits", () => {
  it("spends monthly first then purchased", () => {
    const a = spendCredits(base, 6);
    expect(a.monthlyRemaining).toBe(0);
    expect(a.purchasedRemaining).toBe(1);
  });

  it("throws when not enough", () => {
    expect(() => spendCredits(base, 8)).toThrow(/credits/i);
  });

  it("totals both buckets", () => {
    expect(totalCredits(base)).toBe(7);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:**

```ts
// src/lib/credits.ts
import type { CreditLedger } from "../types";

export function totalCredits(l: CreditLedger) {
  return l.monthlyRemaining + l.purchasedRemaining;
}

export function spendCredits(l: CreditLedger, n: number): CreditLedger {
  if (n <= 0) return l;
  if (totalCredits(l) < n) throw new Error("credits");
  let left = n;
  const monthly = Math.max(0, l.monthlyRemaining - left);
  left -= l.monthlyRemaining - monthly;
  return {
    ...l,
    monthlyRemaining: monthly,
    purchasedRemaining: l.purchasedRemaining - left,
  };
}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: credit ledger spend rules`

---

### Task 13: Canardo — mutation JSON + persist + crédits

**Files:**
- Create: `src/lib/canardo.ts`
- Create: `src/server/routes/canardo.ts`
- Create: `tests/canardo.test.ts`

Port LLM injectable :

```ts
export type LlmPort = {
  complete(input: { prompt: string; document: PageDocument }): Promise<{ message: string; document: PageDocument }>;
};
```

- [ ] **Step 1:**

```ts
// tests/canardo.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";
import { applyCanardo } from "../src/lib/canardo";

describe("applyCanardo", () => {
  it("rejects unknown section types from the model", () => {
    const doc = initialDocument("Home", "sell");
    expect(() =>
      applyCanardo(doc, {
        message: "ok",
        document: { ...doc, sections: [{ id: "x", type: "magic" as never, settings: {} }] },
      }),
    ).toThrow(/catalog/i);
  });
});

describe("POST /api/pages/:id/canardo", () => {
  it("returns 402 when credits are empty", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveCredits({
      workspaceId: ws.id, monthlyRemaining: 0, purchasedRemaining: 0,
      monthlyResetAt: new Date().toISOString(),
    });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => { throw new Error("should not call"); } },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "change le titre" }),
    });
    expect(res.status).toBe(402);
  });

  it("saves the new document and decrements credits", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const next = initialDocument("Home", "sell");
    next.sections[1].settings.title = "Des bougies coulées à Nantes";
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      llm: { complete: async () => ({ message: "Fait.", document: next }) },
    });
    const res = await app.request(`/api/pages/${page.id}/canardo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "réécris le titre" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Fait.");
    expect((await store.getPage(page.id))!.document.sections[1].settings.title).toMatch(/Nantes/);
    expect((await store.getCredits(ws.id)).monthlyRemaining).toBeLessThan(40);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:** `applyCanardo` : chaque `section.type` ∈ `SECTION_TYPES`, sinon throw `catalog`. Coût : **1 crédit / message** (images : +2 si le document contient une nouvelle URL `settings` image générée — détecter `settings.image` commençant par `https://` nouveau vs ancien ; YAGNI v1 : 1 crédit texte, 3 si le prompt demande une image ou si le modèle ajoute `generatedImage: true`).

Prod `llm.complete` : OpenAI JSON mode, system prompt : *tu ne renvoies qu’un PageDocument dont les types sont dans la liste, tu remplis settings, tu ne génères pas de HTML*.

Route : 402 `{ error: "credits", cta: "Add Credits" }` ; 200 `{ message, document, credits }`.

Hydrate éditeur + dashboard : barre Canardo → POST, append le message dans le fil existant, refresh preview. 402 → toast maquette + lien `/facturation`.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: Canardo mutates catalog documents and spends credits`

---

### Task 14: Publish hébergé (sans Shopify)

**Files:**
- Modify: `src/server/routes/pages.ts`
- Create: `tests/publish-hosted.test.ts`

- [ ] **Step 1:**

```ts
// tests/publish-hosted.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("POST /api/pages/:id/publish", () => {
  it("marks published_hosted when Shopify is absent", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
    });
    const res = await app.request(`/api/pages/${page.id}/publish`, { method: "POST" });
    const body = await res.json();
    expect(body.status).toBe("published_hosted");
    expect(body.shopify).toBe("skipped");
    expect(body.previewUrl).toMatch(/\/s\//);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:** `POST /api/pages/:id/publish` → status `published_hosted`, `{ shopify: "skipped", previewUrl, message }` si pas de connexion `connected`. Hydrate bouton Publier : afficher le message maquette / toast.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: publish hosted preview without Shopify`

---

## Tranche D — Shopify (jeton)

### Task 15: Chiffrement jeton

**Files:**
- Create: `src/lib/encrypt.ts`
- Create: `tests/encrypt.test.ts`

- [ ] **Step 1:**

```ts
// tests/encrypt.test.ts
import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../src/lib/encrypt";

const key = "0".repeat(64); // 32 bytes hex

describe("encryptSecret", () => {
  it("roundtrips and does not contain the plaintext", () => {
    const enc = encryptSecret("shpat_secret", key);
    expect(enc).not.toContain("shpat_secret");
    expect(decryptSecret(enc, key)).toBe("shpat_secret");
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:** AES-256-GCM, `iv:tag:ciphertext` hex. Key = `INTEGRATION_ENCRYPTION_KEY` (64 hex chars).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: encrypt Shopify admin tokens`

---

### Task 16: Connect + publish Shopify avec rollback

**Files:**
- Create: `src/lib/shopify.ts`
- Create: `src/server/routes/shopify.ts`
- Create: `tests/shopify-publish.test.ts`

Port :

```ts
export type ShopifyPort = {
  ping(shop: string, token: string): Promise<void>;
  publish(input: {
    shop: string;
    token: string;
    document: PageDocument;
    pageName: string;
  }): Promise<{ themeId: string; productId: string }>;
  rollback(input: { shop: string; token: string; themeId?: string; productId?: string }): Promise<void>;
};
```

- [ ] **Step 1:**

```ts
// tests/shopify-publish.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { initialDocument } from "../src/lib/catalog";

describe("Shopify connect and publish", () => {
  it("stores connected without echoing the token", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      shopify: { ping: async () => {}, publish: async () => ({ themeId: "1", productId: "2" }), rollback: async () => {} },
      encryptionKey: "0".repeat(64),
    });
    const res = await app.request("/api/shopify/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", token: "shpat_abc" }),
    });
    const body = await res.json();
    expect(body.status).toBe("connected");
    expect(JSON.stringify(body)).not.toMatch(/shpat_/);
    expect((await store.getShopify(ws.id))!.tokenEncrypted).not.toContain("shpat_abc");
  });

  it("marks invalid and does not publish when ping fails", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      shopify: { ping: async () => { throw new Error("bad token"); }, publish: async () => { throw new Error("no"); }, rollback: async () => {} },
      encryptionKey: "0".repeat(64),
    });
    const res = await app.request("/api/shopify/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", token: "shpat_bad" }),
    });
    expect(res.status).toBe(400);
    expect((await store.getShopify(ws.id))!.status).toBe("invalid");
  });

  it("rolls back and stays hosted when publish throws mid-way", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveShopify({ workspaceId: ws.id, shopDomain: "x.myshopify.com", tokenEncrypted: "enc", status: "connected" });
    const page = await store.createPage({
      workspaceId: ws.id, name: "Home", slug: "home", type: "sell",
      status: "draft", document: initialDocument("Home", "sell"),
    });
    let rolled = false;
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      encryptionKey: "0".repeat(64),
      shopify: {
        ping: async () => {},
        publish: async () => { throw new Error("product failed"); },
        rollback: async () => { rolled = true; },
      },
    });
    const res = await app.request(`/api/pages/${page.id}/publish`, { method: "POST" });
    expect(res.status).toBe(502);
    expect(rolled).toBe(true);
    expect((await store.getPage(page.id))!.status).toBe("published_hosted");
    expect((await res.json()).shopify).toBe("failed");
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:**  
`POST /api/shopify/connect` — ping puis encrypt.  
`POST /api/shopify/disconnect` — `clearShopify`.  
`publish` : toujours hosted d’abord ; si `connected`, appeler port ; succès → `published_shopify` ; échec → rollback, status `published_hosted`, 502.

Prod `ShopifyPort.publish` : créer produit + images + thème unpublished « Weflo » (fichiers dans `theme/`), puis si une étape casse : supprimer produit / thème créé dans `rollback`. Pas d’écriture de PoC d’exploit — uniquement Admin API documentée avec le jeton du marchand.

Hydrate `facturation.ts` : champs domaine + jeton, badge connected/invalid, jamais réafficher le jeton.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: connect Shopify by token and publish with rollback`

---

## Tranche E — Whop

### Task 17: Checkout + webhook signature

**Files:**
- Create: `src/lib/whop.ts`
- Create: `src/server/routes/billing.ts`
- Create: `tests/whop-billing.test.ts`

```ts
export type WhopPort = {
  createCheckout(input: {
    planId: string;
    redirectUrl: string;
    metadata: { workspace_id: string; user_id: string; kind: "subscription" | "credits" };
    affiliateCode?: string;
    promoCode?: string;
  }): Promise<{ purchaseUrl: string }>;
  verifyWebhook(rawBody: string, headers: Headers): { type: string; data: Record<string, unknown> };
  createAffiliate(input: { email: string; workspaceId: string }): Promise<{ affiliateId: string }>;
  affiliateStats(affiliateId: string): Promise<{
    earningsUsd: string;
    referrals: number;
    clicks: number;
  }>;
};
```

- [ ] **Step 1:**

```ts
// tests/whop-billing.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { applyWhopEvent } from "../src/lib/whop";

describe("applyWhopEvent", () => {
  it("activates membership only on membership.activated", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await applyWhopEvent(store, {
      type: "payment.succeeded",
      data: { metadata: { workspace_id: ws.id, kind: "subscription" }, member: { id: "mem_1" } },
    });
    expect((await store.getWhop(ws.id))?.status).not.toBe("active");

    await applyWhopEvent(store, {
      type: "membership.activated",
      data: {
        id: "mber_1",
        plan_id: "plan_pro",
        manage_url: "https://whop.com/billing/manage/mber_1",
        metadata: { workspace_id: ws.id, kind: "subscription" },
      },
    });
    expect((await store.getWhop(ws.id))?.status).toBe("active");
  });

  it("adds purchased credits on one-time payment and ignores unsigned-equivalent bad events", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const before = await store.getCredits(ws.id);
    await applyWhopEvent(store, {
      type: "payment.succeeded",
      data: { metadata: { workspace_id: ws.id, kind: "credits", credits: 100 } },
    });
    expect((await store.getCredits(ws.id)).purchasedRemaining).toBe(before.purchasedRemaining + 100);
  });
});

describe("billing routes", () => {
  it("does not activate a plan on checkout click", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "a@b.c" }),
      publicAppUrl: "https://weflo.example",
      whop: {
        createCheckout: async () => ({ purchaseUrl: "https://whop.com/checkout/ch_1" }),
        verifyWebhook: () => { throw new Error("bad sig"); },
      },
    });
    const res = await app.request("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, kind: "subscription", planId: "plan_pro" }),
    });
    expect((await res.json()).url).toMatch(/whop.com/);
    expect((await store.getWhop(ws.id))?.status ?? "none").not.toBe("active");
  });

  it("rejects webhook with bad signature and does not change credits", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    const before = await store.getCredits(ws.id);
    const app = createApp({
      store,
      session: async () => null,
      whop: { createCheckout: async () => ({ purchaseUrl: "x" }), verifyWebhook: () => { throw new Error("bad sig"); } },
    });
    const res = await app.request("/api/billing/whop/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "payment.succeeded", data: { metadata: { workspace_id: ws.id, kind: "credits", credits: 50 } } }),
    });
    expect(res.status).toBe(400);
    expect((await store.getCredits(ws.id)).purchasedRemaining).toBe(before.purchasedRemaining);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:**  
`POST /api/billing/checkout` — exige session + member ; `redirectUrl = PUBLIC_APP_URL + "/facturation"` ; **refuser** si `PUBLIC_APP_URL` n’est pas `https://` (sauf hostname localhost **et** env `WHOP_ALLOW_HTTP=1` pour sandbox).  
`POST /api/billing/whop/webhook` — **pas** de session ; raw body ; `verifyWebhook` ; 200 `OK` après `applyWhopEvent`.  
`payment.failed` / membership inactive → `whop.status = inactive`.  
`GET /api/billing` — plan, crédits, `manageUrl`, shopify status **sans** jeton.

Hydrate facturation : CTA plans / Add Credits → checkout redirect. Manage → `manageUrl`.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: Whop checkout and signed webhooks`

---

## Tranche F — Parrainage

### Task 18: Attribution + promo + écran

**Files:**
- Create: `src/server/routes/referral.ts`
- Create: `src/hydrate/parrainage.ts`
- Create: `tests/referral.test.ts`

- [ ] **Step 1:**

```ts
// tests/referral.test.ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { assertReferralAllowed } from "../src/lib/whop";

describe("assertReferralAllowed", () => {
  it("blocks self-referral", () => {
    expect(() => assertReferralAllowed("ws1", "ws1")).toThrow(/self/i);
  });
});

describe("GET /r/:code", () => {
  it("redirects to Whop checkout with affiliate query", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "u1" });
    await store.saveWhop({
      workspaceId: ws.id, membershipId: null, planId: null, status: "none",
      manageUrl: null, affiliateId: "aff_1",
    });
    const app = createApp({
      store,
      session: async () => null,
      publicAppUrl: "https://weflo.example",
      whop: {
        createCheckout: async ({ affiliateCode }) => ({
          purchaseUrl: `https://whop.com/checkout/plan_pro?a=${affiliateCode ?? ""}`,
        }),
        verifyWebhook: () => ({ type: "noop", data: {} }),
        createAffiliate: async () => ({ affiliateId: "aff_1" }),
        affiliateStats: async () => ({ earningsUsd: "0.00", referrals: 0, clicks: 0 }),
      },
    });
    const res = await app.request(`/r/${ws.slug}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/[?&]a=/);
  });
});

describe("attribution", () => {
  it("stores a single attribution and rejects a second", async () => {
    const store = new MemoryStore();
    const a = await store.createWorkspace({ name: "A", ownerUserId: "u1" });
    const b = await store.createWorkspace({ name: "B", ownerUserId: "u2" });
    const app = createApp({
      store,
      session: async () => ({ id: "u2", email: "b@x.test" }),
    });
    const first = await app.request("/api/referral/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: a.slug }),
    });
    expect(first.status).toBe(200);
    const second = await app.request("/api/referral/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: a.slug }),
    });
    expect(second.status).toBe(409);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3:**  
À `createWorkspace` : si `WhopPort.createAffiliate` existe, créer affilié + override 20 % `all_payments`. Stocker `affiliateId`.  
`GET /r/:code` → redirect checkout + `?a=`. Cookie `weflo_ref=code` 30j.  
Signup / premier workspace : si cookie et pas self → `saveAttribution` une fois.  
`GET /api/referral` : totaux depuis `WhopPort.affiliateStats(affiliateId)` (`total_referral_earnings_usd`, counts). Si Whop down : dernière valeur stockée, **pas** forcer 0.  
Hydrate parrainage : lien `{PUBLIC_APP_URL}/r/{slug}`, copy, chiffres.

Promo 20 % / 3 mois : appliquée au `createCheckout` du filleul (`promoCode` Whop configuré en env `WHOP_PROMO_REFERRAL`).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: Whop referral links and one-time attribution`

---

### Task 19: Compte — update profil, delete, membres

**Files:**
- Create: `src/server/routes/settings.ts`
- Create: `tests/settings.test.ts`

- [ ] **Step 1:** Tests `PATCH /api/workspace` (nom), `POST /api/workspace/members` (invite e-mail — port `inviteEmail`), `DELETE /api/workspace` (owner only, cascade), `DELETE /api/me` (supprime memberships + user via Supabase admin). 403 si pas owner.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement + bind danger zone / Save sur facturation.html**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: workspace and account settings`

---

### Task 20: Vérification visuelle + acceptation

**Files:**
- Modify: none required beyond fixes
- Create: `tests/acceptance-checklist.md` (checklist manuelle, pas un placeholder de code)

- [ ] **Step 1: Lancer `npm test`** — tous les tests unitaires / API verts.

- [ ] **Step 2: `npm run extract && npm run build:hydrate && npm run dev`**

- [ ] **Step 3: Checklist manuelle (cocher dans le PR / session) :**

1. Inscription e-mail + Google, reload, logout.
2. Créer / renommer / dupliquer / supprimer une page ; reload dashboard.
3. Canardo change une section ; reload éditeur ; crédits baissent ; 0 crédit → 402 + Add Credits.
4. Publish sans jeton → `/s/…` ; jeton faux → invalid, rien sur Shopify ; jeton OK → thème+produit.
5. Checkout Whop sandbox + webhook → plan / crédits ; Manage ouvre le portail.
6. `/r/{slug}` attribut ; self-ref refusé.
7. Connexion / dashboard / éditeur / facturation / parrainage vs maquettes (layout, couleurs, barre Canardo). Pas de bouton Shopify login.

- [ ] **Step 4: Corriger tout écart visuel ou fonctionnel trouvé.**

- [ ] **Step 5: Commit** `test: record acceptance checklist for Weflo app`

---

## Self-review (plan vs spec)

| Spec | Task |
|---|---|
| Extraire HTML, même look, retirer login Shopify | 2, 3 |
| `/` session-aware, hub `/maquettes`, DA statiques | 3, 10 (404) |
| E-mail + Google, pas Shopify login | 7 |
| Espaces, pages, dashboard, 3 types | 4, 6, 8 |
| Catalogue, pas de HTML IA | 4, 13 |
| Preview `/s/…` | 10 |
| Canardo réel + persist + crédits | 12, 13 |
| Allotment essai avant Whop | 4 (`getCredits` 40) |
| Publish hosted puis Shopify jeton, rollback | 14, 15, 16 |
| Whop checkout / webhooks / pas d’activation au clic | 17 |
| Crédits packs one-time | 17 |
| Parrainage Whop, 20 % all_payments, promo 3 mois, pas d’auto | 18 |
| Settings / danger zone | 19 |
| A/B et invite team réels | hors plan (spec §8) |
| Tests d’acceptation | 20 |
| Secrets hors git | Task 7 `.env.example` + gitignore |

Noms stables : `Store`, `PageDocument`, `spendCredits`, `applyCanardo`, `applyWhopEvent`, cookie `sb-access-token`, crédits 402.

Pas de Stripe. Pas de « similar to Task N » sans code.
