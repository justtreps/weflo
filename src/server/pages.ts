import { Hono } from "hono";
import { migrateDocument } from "../editor/migrate";
import { applyCanardo, canardoCreditCost, refuseReferralHelp } from "../lib/canardo";
import { initialDocument } from "../lib/catalog";
import { spendCredits, totalCredits } from "../lib/credits";
import { publishAccessForBilling } from "../lib/publishing";
import { resolveShopifyToken } from "../lib/shopify";
import type { Store } from "../repos/types";
import { PageVersionConflictError } from "../repos/types";
import type { Page, PageStatus, PageType, User, WhopPort } from "../types";
import type { AppDeps } from "./app";
import type { EditorDocument } from "../editor/document";
import { buildCanardoContext } from "../canardo/context";
import { planCanardoLocally } from "../canardo/local-planner";
import { applyCanardoOperations } from "../canardo/apply";
import { validateCanardoResponse } from "../canardo/validate";
import type { CanardoResponse } from "../canardo/protocol";

const PAGE_TYPES: PageType[] = ["sell", "write", "blank"];
const PAGE_STATUSES: PageStatus[] = ["draft", "published_hosted", "published_shopify"];

export async function requireUser(deps: AppDeps, req: Request): Promise<User | null> {
  return deps.session(req);
}

export async function ensureWorkspace(
  store: Store,
  ownerUserId: string,
  opts?: { whop?: WhopPort; email?: string },
) {
  const existing = await store.listWorkspaces(ownerUserId);
  if (existing.length > 0) return existing[0];
  const ws = await store.createWorkspace({ name: "Espace", ownerUserId });
  if (opts?.whop?.createAffiliate) {
    try {
      const { affiliateId } = await opts.whop.createAffiliate({
        email: opts.email ?? "",
        workspaceId: ws.id,
      });
      const prev = await store.getWhop(ws.id);
      await store.saveWhop({
        workspaceId: ws.id,
        membershipId: prev?.membershipId ?? null,
        planId: prev?.planId ?? null,
        status: prev?.status ?? "none",
        manageUrl: prev?.manageUrl ?? null,
        affiliateId,
        lastAffiliateStats: prev?.lastAffiliateStats,
      });
    } catch {
      /* workspace stays usable without an affiliate id */
    }
  }
  return ws;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "page";
}

async function uniqueSlug(store: Store, workspaceId: string, base: string): Promise<string> {
  const taken = new Set((await store.listPages(workspaceId)).map((p) => p.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function isPageType(value: unknown): value is PageType {
  return typeof value === "string" && PAGE_TYPES.includes(value as PageType);
}

function isPageStatus(value: unknown): value is PageStatus {
  return typeof value === "string" && PAGE_STATUSES.includes(value as PageStatus);
}

async function loadOwnedPage(deps: AppDeps, userId: string, id: string) {
  const page = await deps.store.getPage(id);
  if (!page) return { error: "not found" as const, status: 404 as const };
  await deps.store.assertMember(userId, page.workspaceId);
  return { page };
}

export function pagesRoutes(deps: AppDeps) {
  const app = new Hono();

  app.get("/pages", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const workspace = await ensureWorkspace(deps.store, user.id);
    const workspaces = await deps.store.listWorkspaces(user.id);
    const pages = await deps.store.listPages(workspace.id);
    return c.json({ workspace, pages, workspaces });
  });

  app.get("/pages/:id", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    if (c.req.query("documentVersion") === "2") {
      return c.json({
        ...loaded.page,
        document: migrateDocument(loaded.page.document, loaded.page.type),
      });
    }
    return c.json(loaded.page);
  });

  app.post("/pages", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<{ type?: unknown; name?: unknown }>().catch(() => ({}));
    if (!isPageType(body.type)) return c.json({ error: "invalid type" }, 400);
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Page";
    const workspace = await ensureWorkspace(deps.store, user.id);
    const slug = await uniqueSlug(deps.store, workspace.id, slugify(name));
    const page = await deps.store.createPage({
      workspaceId: workspace.id,
      name,
      slug,
      type: body.type,
      status: "draft",
      document: initialDocument(name, body.type),
    });
    return c.json(page, 201);
  });

  app.patch("/pages/:id", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
    const patch: Partial<Pick<Page, "name" | "slug" | "status" | "document">> = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.slug === "string") patch.slug = slugify(body.slug);
    if (isPageStatus(body.status)) patch.status = body.status;
    if (body.document && typeof body.document === "object") {
      patch.document = body.document as Page["document"];
    }
    const expectedVersion = typeof body.expectedVersion === "number" && Number.isInteger(body.expectedVersion)
      ? body.expectedVersion
      : undefined;
    try {
      const updated = await deps.store.updatePage(loaded.page.id, patch, { expectedVersion });
      return c.json(updated);
    } catch (error) {
      if (!(error instanceof PageVersionConflictError)) throw error;
      const serverPage = await deps.store.getPage(loaded.page.id);
      return c.json({ error: "version_conflict", serverPage }, 409);
    }
  });

  app.post("/pages/:id/duplicate", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    const name = `${loaded.page.name} copy`;
    const slug = await uniqueSlug(deps.store, loaded.page.workspaceId, slugify(name));
    const copy = await deps.store.createPage({
      workspaceId: loaded.page.workspaceId,
      name,
      slug,
      type: loaded.page.type,
      status: "draft",
      document: loaded.page.document,
    });
    return c.json(copy, 201);
  });

  app.delete("/pages/:id", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    await deps.store.deletePage(loaded.page.id);
    return c.body(null, 204);
  });

  app.post("/pages/:id/publish", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    const workspace = await deps.store.getWorkspace(loaded.page.workspaceId);
    if (!workspace) return c.json({ error: "not found" }, 404);
    const subscription = await deps.store.getWhop(workspace.id);
    const access = publishAccessForBilling(
      { status: subscription?.status ?? "none", planId: subscription?.planId ?? null },
      process.env.WHOP_PLAN_PRO?.trim() || null,
    );
    if (!access.allowed) {
      return c.json({
        error: access.reason,
        message: "Passe à Weflo Pro pour publier ta page.",
        upgradeUrl: "/facturation",
      }, 402);
    }
    const updated = await deps.store.updatePage(loaded.page.id, { status: "published_hosted" });
    const previewUrl = `/s/${workspace.slug}/${updated.slug}`;
    const shopify = await deps.store.getShopify(workspace.id);
    if (!shopify || shopify.status !== "connected") {
      return c.json({
        status: "published_hosted",
        shopify: "skipped",
        previewUrl,
        message: "Page publiée sur l'aperçu hébergé.",
      });
    }
    if (!deps.shopify) {
      return c.json({
        status: "published_hosted",
        shopify: "connected",
        previewUrl,
        message: "Page publiée.",
      });
    }

    const token = resolveShopifyToken(shopify.tokenEncrypted, deps.encryptionKey);
    try {
      await deps.shopify.publish({
        shop: shopify.shopDomain,
        token,
        document: updated.document,
        pageName: updated.name,
      });
    } catch {
      await deps.shopify.rollback({ shop: shopify.shopDomain, token });
      return c.json({ shopify: "failed", status: "published_hosted", previewUrl }, 502);
    }

    const published = await deps.store.updatePage(loaded.page.id, { status: "published_shopify" });
    return c.json({
      status: published.status,
      shopify: "published",
      previewUrl,
      message: "Page publiée sur Shopify.",
    });
  });

  app.post("/pages/:id/canardo", async (c) => {
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const loaded = await loadOwnedPage(deps, user.id, c.req.param("id"));
    if ("error" in loaded) return c.json({ error: loaded.error }, loaded.status);
    const body: { prompt?: unknown; selectedId?: unknown; confirm?: unknown; response?: unknown } = await c.req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return c.json({ error: "prompt", message: "Décris la page ou la modification souhaitée." }, 400);
    }
    const refused = refuseReferralHelp(prompt, loaded.page.document);
    if (refused) {
      const ledger = await deps.store.getCredits(loaded.page.workspaceId);
      return c.json({ message: refused.message, document: loaded.page.document, credits: ledger });
    }
    const ledger = await deps.store.getCredits(loaded.page.workspaceId);
    if (totalCredits(ledger) === 0) {
      return c.json({ error: "credits", message: "Tu n’as plus assez de crédits Canardo.", cta: "Add Credits" }, 402);
    }
    const possibleEditor = loaded.page.document as unknown as Partial<EditorDocument>;
    if (possibleEditor.version === 2 && Array.isArray(possibleEditor.pages)) {
      const editorDocument = possibleEditor as EditorDocument;
      const selectedId = typeof body.selectedId === "string" ? body.selectedId : null;
      let proposal: unknown = body.confirm === true && body.response ? body.response : null;
      if (!proposal) {
        try {
          proposal = deps.llm?.completeEditor
            ? await deps.llm.completeEditor({ prompt, context: buildCanardoContext(editorDocument, selectedId, { connected: false }) })
            : planCanardoLocally(prompt, editorDocument, selectedId);
        } catch {
          return c.json({ error: "generation", message: "Canardo n’a pas pu terminer la génération. Ta page est conservée." }, 502);
        }
      }
      const validation = validateCanardoResponse(proposal, editorDocument);
      if (!validation.ok) return c.json({ error: "invalid_operations", message: "La proposition Canardo n’est pas sûre.", details: validation.errors }, 400);
      const response = validation.value as CanardoResponse;
      const consequential = response.commands.length > 5 || response.commands.some((command) => command.type === "removeSection" || (command.type === "insertSection" && command.section.type === "customCode") || (command.type === "updateSetting" && /product|collection|shopify/i.test(command.key)));
      const applied = applyCanardoOperations(editorDocument, response);
      if (consequential && body.confirm !== true) return c.json({ message: response.message, summary: response.summary, commands: response.commands, document: applied.document, requiresConfirmation: true });
      const cost = /\b(image|photo|visuel)\b/i.test(prompt) ? 3 : 1;
      let nextLedger;
      try { nextLedger = spendCredits(ledger, cost); } catch { return c.json({ error: "credits", cta: "Add Credits" }, 402); }
      const page = await deps.store.updatePage(loaded.page.id, { document: applied.document as never });
      await deps.store.saveCredits(nextLedger);
      return c.json({ message: response.message, summary: response.summary, commands: response.commands, document: page.document, credits: nextLedger, requiresConfirmation: false });
    }
    if (!deps.llm) {
      return c.json({ error: "unavailable", message: "Canardo n’est pas configuré sur cet environnement." }, 503);
    }
    let raw;
    try {
      raw = await deps.llm.complete({ prompt, document: loaded.page.document });
    } catch {
      return c.json({ error: "generation", message: "Canardo n’a pas pu terminer la génération. Ta page est conservée." }, 502);
    }
    let applied: { message: string; document: Page["document"] };
    try {
      applied = applyCanardo(loaded.page.document, raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "catalog";
      return c.json({ error: msg, message: "La réponse était invalide. Ta page actuelle a été conservée." }, 400);
    }
    const cost = canardoCreditCost(prompt, applied.document);
    let nextLedger;
    try {
      nextLedger = spendCredits(ledger, cost);
    } catch {
      return c.json({ error: "credits", cta: "Add Credits" }, 402);
    }
    const page = await deps.store.updatePage(loaded.page.id, { document: applied.document });
    await deps.store.saveCredits(nextLedger);
    return c.json({ message: applied.message, document: page.document, credits: nextLedger });
  });

  return app;
}
