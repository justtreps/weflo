import { Hono } from "hono";
import { importProduct } from "../import/product-extractor";
import { fallbackOnboardingAnalysis } from "../onboarding/fallback-analysis";
import { createBrandKit } from "../onboarding/brand-kit";
import { buildStoreDocument } from "../onboarding/compile-store";
import { createOnboardingDraftInput, initialBuildStages } from "../onboarding/schema";
import { claimTokenMatches, createClaimToken } from "../onboarding/token";
import type { ImportedProduct, OnboardingDraft, OnboardingDraftPatch } from "../onboarding/types";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";

function publicDraft(draft: OnboardingDraft): Omit<OnboardingDraft, "claimTokenHash"> {
  const { claimTokenHash: _private, ...safe } = draft;
  return safe;
}

function tokenFrom(req: Request): string {
  return req.headers.get("x-weflo-claim-token")?.trim() ?? "";
}

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function imageProduct(imageDataUrl: string, fileName: string): ImportedProduct {
  const title = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || "Produit importé";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "produit.jpg";
  return {
    sourceUrl: `https://image.weflo.local/${encodeURIComponent(safeName)}`,
    title,
    description: "Produit importé à partir d’une image.",
    vendor: "",
    currency: "EUR",
    price: null,
    compareAtPrice: null,
    images: [imageDataUrl],
    variants: [],
    rating: null,
    reviewCount: null,
    reviews: [],
  };
}

function validImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^data:image\/(?:png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/);
  if (!match) return false;
  return Buffer.byteLength(match[1], "base64") <= 450_000;
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
    if (!deps.productFetch) return c.json({ error: "import_unavailable", message: "L’importation de produits n’est pas configurée." }, 503);
    const body = await c.req.json<{ sourceUrl?: unknown; language?: unknown }>().catch(() => ({} as { sourceUrl?: unknown; language?: unknown }));
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "en";
    const claim = createClaimToken();
    let draft = await deps.store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: claim.hash, sourceUrl }));
    try {
      const product = await withDeadline(
        importProduct(sourceUrl, deps.productFetch),
        deps.onboardingImportTimeoutMs ?? 17_000,
        "L’importation a dépassé le temps autorisé. Réessaie ou importe une image.",
      );
      draft = await deps.store.updateOnboardingDraft(draft.id, { product, status: "analysing", language });
      let analysis;
      try {
        analysis = deps.onboardingAi
          ? await withDeadline(deps.onboardingAi.analyse({ product, language }), deps.onboardingAiTimeoutMs ?? 15_000, "L’analyse IA a dépassé le temps autorisé.")
          : fallbackOnboardingAnalysis(product, language);
      }
      catch { analysis = fallbackOnboardingAnalysis(product, language); }
      draft = await deps.store.updateOnboardingDraft(draft.id, { ...analysis, brandName: analysis.brandNames[0], modelId: "proteo", status: "questions" });
      return c.json({ draft: publicDraft(draft), claimToken: claim.token }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’importer ce produit.";
      await deps.store.updateOnboardingDraft(draft.id, { status: "failed", error: message });
      return c.json({ error: "import_failed", message }, 422);
    }
  });

  app.post("/onboarding/import-image", async (c) => {
    const body = await c.req.json<{ imageDataUrl?: unknown; fileName?: unknown; language?: unknown }>().catch(() => ({} as { imageDataUrl?: unknown; fileName?: unknown; language?: unknown }));
    if (!validImageDataUrl(body.imageDataUrl)) {
      return c.json({ error: "invalid_image", message: "Choisis une image PNG, JPG ou WebP. Weflo doit pouvoir l’optimiser sous 450 Ko." }, 400);
    }
    const fileName = typeof body.fileName === "string" ? body.fileName.trim().slice(0, 120) : "produit.jpg";
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "en";
    const claim = createClaimToken();
    let product = imageProduct(body.imageDataUrl, fileName);
    let analysis = fallbackOnboardingAnalysis(product, language);
    let draft = await deps.store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: claim.hash, sourceUrl: product.sourceUrl }));
    try {
      if (deps.onboardingAi?.analyseImage) {
        try {
          const result = await withDeadline(
            deps.onboardingAi.analyseImage({ imageDataUrl: body.imageDataUrl, fileName, language }),
            deps.onboardingAiTimeoutMs ?? 15_000,
            "L’analyse de l’image a dépassé le temps autorisé.",
          );
          product = result.product;
          analysis = result.analysis;
        } catch {
          analysis = fallbackOnboardingAnalysis(product, language);
        }
      }
      draft = await deps.store.updateOnboardingDraft(draft.id, {
        product,
        ...analysis,
        brandName: analysis.brandNames[0],
        modelId: "proteo",
        status: "questions",
        language,
      });
      return c.json({ draft: publicDraft(draft), claimToken: claim.token }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’analyser cette image.";
      await deps.store.updateOnboardingDraft(draft.id, { status: "failed", error: message });
      return c.json({ error: "image_import_failed", message }, 422);
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
    if (typeof body.language === "string") {
      patch.language = body.language.slice(0, 40);
      if (draft.product && patch.language !== draft.language) {
        try {
          const analysis = deps.onboardingAi ? await deps.onboardingAi.analyse({ product: draft.product, language: patch.language }) : fallbackOnboardingAnalysis(draft.product, patch.language);
          Object.assign(patch, analysis, { brandName: analysis.brandNames[0] });
        } catch {
          const analysis = fallbackOnboardingAnalysis(draft.product, patch.language);
          Object.assign(patch, analysis, { brandName: analysis.brandNames[0] });
        }
      }
    }
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
