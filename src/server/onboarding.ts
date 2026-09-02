import { Hono } from "hono";
import { importProduct } from "../import/product-extractor";
import { fallbackOnboardingAnalysis } from "../onboarding/fallback-analysis";
import { createBrandKit } from "../onboarding/brand-kit";
import { buildStoreDocument } from "../onboarding/compile-store";
import { createOnboardingDraftInput, initialBuildStages } from "../onboarding/schema";
import { claimTokenMatches, createClaimToken } from "../onboarding/token";
import type { OnboardingDraft, OnboardingDraftPatch } from "../onboarding/types";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";

function publicDraft(draft: OnboardingDraft): Omit<OnboardingDraft, "claimTokenHash"> {
  const { claimTokenHash: _private, ...safe } = draft;
  return safe;
}

function tokenFrom(req: Request): string {
  return req.headers.get("x-weflo-claim-token")?.trim() ?? "";
}

async function authorizedDraft(deps: AppDeps, id: string, req: Request): Promise<OnboardingDraft | null> {
  const token = tokenFrom(req);
  if (!token) return null;
  const draft = await deps.store.getOnboardingDraft(id);
  return draft && claimTokenMatches(token, draft.claimTokenHash) ? draft : null;
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "store";
}

async function uniqueSlug(deps: AppDeps, workspaceId: string, name: string): Promise<string> {
  const base = slugify(name);
  const used = new Set((await deps.store.listPages(workspaceId)).map((page) => page.slug));
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function onboardingRoutes(deps: AppDeps) {
  const app = new Hono();

  app.post("/onboarding/import", async (c) => {
    if (!deps.productFetch) return c.json({ error: "import_unavailable", message: "Product import is not configured." }, 503);
    const body = await c.req.json<{ sourceUrl?: unknown; language?: unknown }>().catch(() => ({} as { sourceUrl?: unknown; language?: unknown }));
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "en";
    const claim = createClaimToken();
    let draft = await deps.store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: claim.hash, sourceUrl }));
    try {
      const product = await importProduct(sourceUrl, deps.productFetch);
      draft = await deps.store.updateOnboardingDraft(draft.id, { product, status: "analysing", language });
      let analysis;
      try { analysis = deps.onboardingAi ? await deps.onboardingAi.analyse({ product, language }) : fallbackOnboardingAnalysis(product, language); }
      catch { analysis = fallbackOnboardingAnalysis(product, language); }
      draft = await deps.store.updateOnboardingDraft(draft.id, { ...analysis, brandName: analysis.brandNames[0], modelId: "proteo", status: "questions" });
      return c.json({ draft: publicDraft(draft), claimToken: claim.token }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The product could not be imported.";
      await deps.store.updateOnboardingDraft(draft.id, { status: "failed", error: message });
      return c.json({ error: "import_failed", message }, 422);
    }
  });

  app.get("/onboarding/:id", async (c) => {
    const draft = await authorizedDraft(deps, c.req.param("id"), c.req.raw);
    return draft ? c.json({ draft: publicDraft(draft) }) : c.json({ error: "unauthorized" }, 401);
  });

  app.patch("/onboarding/:id", async (c) => {
    const draft = await authorizedDraft(deps, c.req.param("id"), c.req.raw);
    if (!draft) return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
    const patch: OnboardingDraftPatch = {};
    if (typeof body.language === "string") patch.language = body.language.slice(0, 40);
    if (typeof body.modelId === "string") patch.modelId = body.modelId.slice(0, 60);
    if (typeof body.brandName === "string") patch.brandName = body.brandName.trim().slice(0, 60);
    if (Array.isArray(body.personas)) patch.personas = body.personas as OnboardingDraft["personas"];
    if (Array.isArray(body.angles)) patch.angles = body.angles as OnboardingDraft["angles"];
    const updated = await deps.store.updateOnboardingDraft(draft.id, patch);
    return c.json({ draft: publicDraft(updated) });
  });

  app.post("/onboarding/:id/build", async (c) => {
    const draft = await authorizedDraft(deps, c.req.param("id"), c.req.raw);
    if (!draft) return c.json({ error: "unauthorized" }, 401);
    if (!draft.product) return c.json({ error: "missing_product" }, 409);
    const stages = initialBuildStages().map((stage) => ({ ...stage, state: "complete" as const }));
    const brandName = draft.brandName || draft.brandNames[0] || draft.product.vendor || "Weflo Store";
    const modelId = draft.modelId || "proteo";
    const brandKit = draft.brandKit ?? createBrandKit(draft.product, modelId);
    const document = buildStoreDocument({ product: draft.product, language: draft.language, brandName, modelId, personas: draft.personas, angles: draft.angles, brandKit });
    const updated = await deps.store.updateOnboardingDraft(draft.id, { status: "ready", stages, brandKit, document, brandName, modelId, error: null });
    return c.json({ draft: publicDraft(updated) });
  });

  app.post("/onboarding/:id/claim", async (c) => {
    const draft = await authorizedDraft(deps, c.req.param("id"), c.req.raw);
    if (!draft) return c.json({ error: "unauthorized" }, 401);
    const user = await requireUser(deps, c.req.raw);
    if (!user) return c.json({ error: "sign_in_required" }, 401);
    if (!draft.document || draft.status !== "ready") return c.json({ error: "not_ready" }, 409);
    if (draft.claimedPageId) return c.json({ pageId: draft.claimedPageId, alreadyClaimed: true });
    const workspace = await ensureWorkspace(deps.store, user.id, { whop: deps.whop, email: user.email });
    const page = await deps.store.createPage({ workspaceId: workspace.id, name: draft.brandName, slug: await uniqueSlug(deps, workspace.id, draft.brandName), type: "sell", status: "draft", document: draft.document as never });
    await deps.store.claimOnboardingDraft(draft.id, draft.claimTokenHash, user.id, page.id);
    return c.json({ pageId: page.id }, 201);
  });

  return app;
}
