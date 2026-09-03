import { Hono } from "hono";
import { importProduct } from "../import/product-extractor";
import { fallbackOnboardingAnalysis } from "../onboarding/fallback-analysis";
import { createBrandKit } from "../onboarding/brand-kit";
import { buildStoreDocument } from "../onboarding/compile-store";
import { createOnboardingDraftInput, initialBuildStages } from "../onboarding/schema";
import { claimTokenMatches, createClaimToken } from "../onboarding/token";
import type { ImportedProduct, OnboardingDraft, OnboardingDraftPatch } from "../onboarding/types";
import type { AppDeps } from "./app";
import { isCreationFormat, isProductLedCreationFormat } from "../onboarding/creation-recipe";
import { recipeForTemplate } from "../onboarding/template-recipe";
import { flowForFormat } from "../create/format-flow";
import { ensureWorkspace, requireUser } from "./pages";
import { loadShopifyProduct } from "./shopify-catalog";

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

function intakeAnswers(format: OnboardingDraft["creationFormat"], value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const allowed = new Set(flowForFormat(format).intake.map((field) => field.id));
  return Object.fromEntries(Object.entries(raw).flatMap(([key, answer]) => allowed.has(key) && typeof answer === "string" ? [[key, answer.trim().slice(0, 4_000)] as const] : []));
}

function neutralBrandKit() {
  return {
    palette: ["#ffffff", "#111111", "#f4f1ec", "#ffffff"],
    headingFont: "Inter",
    bodyFont: "Inter",
    schemes: [{ name: "Default", background: "#ffffff", text: "#111111", accent: "#111111" }],
  };
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

  app.post("/onboarding/start", async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
    if (!isCreationFormat(body.creationFormat) || body.creationFormat === "blank") {
      return c.json({ error: "invalid_creation_format", message: "Choisis un format compatible avant de continuer." }, 400);
    }
    const creationFormat = body.creationFormat;
    if (isProductLedCreationFormat(creationFormat)) {
      return c.json({ error: "product_source_required", message: "Importe un lien, une image ou un produit Shopify pour créer ce format." }, 400);
    }
    if (typeof body.templateId !== "string") {
      return c.json({ error: "invalid_template", message: "Choisis un modèle avant de continuer." }, 400);
    }
    let templateId: string;
    try {
      const recipe = recipeForTemplate(body.templateId);
      if (recipe.format !== creationFormat) throw new Error("incompatible template");
      templateId = recipe.id;
    } catch {
      return c.json({ error: "invalid_template", message: "Ce modèle n’est pas compatible avec le format choisi." }, 400);
    }
    const answers = intakeAnswers(creationFormat, body.answers);
    const missing = flowForFormat(creationFormat).intake.filter((field) => field.required && !answers[field.id]).map((field) => field.id);
    if (missing.length) {
      return c.json({ error: "missing_answers", message: "Complète les informations obligatoires avant de continuer.", fields: missing }, 400);
    }
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4_000) : "";
    const brandName = answers.brand || answers.topic || answers.campaign || answers.author || answers.objective || flowForFormat(creationFormat).title;
    const audience = answers.audience || answers.activity || answers.segments || answers.intent || "Audience à préciser";
    const promise = answers.promise || answers.objective || answers.angle || prompt || "Direction à préciser";
    const claim = createClaimToken();
    let draft = await deps.store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: claim.hash, sourceUrl: "" }));
    draft = await deps.store.updateOnboardingDraft(draft.id, {
      status: "questions",
      language: typeof body.language === "string" && body.language.trim() ? body.language.trim().slice(0, 40) : "fr",
      creationFormat,
      templateId,
      answers,
      brandName,
      brandNames: [brandName],
      modelId: "template",
      personas: [{ id: "submitted-audience", title: audience, insight: promise, icon: "◎", tags: [], selected: true }],
      angles: [{ id: "submitted-direction", title: promise, description: prompt || answers.story || answers.result || "Direction issue des informations fournies.", icon: "↗", tags: [], selected: true }],
    });
    return c.json({ draft: publicDraft(draft), claimToken: claim.token }, 201);
  });

  app.post("/onboarding/import", async (c) => {
    if (!deps.productFetch) return c.json({ error: "import_unavailable", message: "L’importation de produits n’est pas configurée." }, 503);
    const body = await c.req.json<{ sourceUrl?: unknown; language?: unknown }>().catch(() => ({} as { sourceUrl?: unknown; language?: unknown }));
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "fr";
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

  app.post("/onboarding/import-shopify", async (c) => {
    const body = await c.req.json<{ productId?: unknown; language?: unknown }>().catch(() => ({} as { productId?: unknown; language?: unknown }));
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) return c.json({ error: "invalid_product", message: "Choisis un produit Shopify avant de continuer." }, 400);
    const catalog = await loadShopifyProduct(deps, c.req.raw, productId);
    if (!catalog.ok) return c.json(catalog.body, catalog.status);
    const selected = catalog.product;
    if (!selected) return c.json({ error: "product_not_found", message: "Ce produit n’est plus disponible dans le catalogue Shopify. Actualise la liste." }, 404);
    const { id: _shopifyId, ...product } = selected;
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim().slice(0, 40) : "fr";
    const claim = createClaimToken();
    let draft = await deps.store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: claim.hash, sourceUrl: product.sourceUrl }));
    const analysis = deps.onboardingAi
      ? await deps.onboardingAi.analyse({ product, language }).catch(() => fallbackOnboardingAnalysis(product, language))
      : fallbackOnboardingAnalysis(product, language);
    draft = await deps.store.updateOnboardingDraft(draft.id, {
      product,
      ...analysis,
      brandName: analysis.brandNames[0],
      modelId: "proteo",
      status: "questions",
      language,
    });
    return c.json({ draft: publicDraft(draft), claimToken: claim.token }, 201);
  });

  app.post("/onboarding/import-image", async (c) => {
    const body = await c.req.json<{ imageDataUrl?: unknown; fileName?: unknown; language?: unknown }>().catch(() => ({} as { imageDataUrl?: unknown; fileName?: unknown; language?: unknown }));
    if (!validImageDataUrl(body.imageDataUrl)) {
      return c.json({ error: "invalid_image", message: "Choisis une image PNG, JPG ou WebP. Weflo doit pouvoir l’optimiser sous 450 Ko." }, 400);
    }
    const fileName = typeof body.fileName === "string" ? body.fileName.trim().slice(0, 120) : "produit.jpg";
    const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "fr";
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
    const nextFormat = isCreationFormat(body.creationFormat) ? body.creationFormat : draft.creationFormat;
    if (isCreationFormat(body.creationFormat)) patch.creationFormat = body.creationFormat;
    if (body.templateId === null) patch.templateId = null;
    else if (typeof body.templateId === "string") {
      try {
        const recipe = recipeForTemplate(body.templateId);
        if (recipe.format !== nextFormat) return c.json({ error: "invalid_template" }, 400);
        patch.templateId = recipe.id;
      } catch {
        return c.json({ error: "invalid_template" }, 400);
      }
    } else if (patch.creationFormat && draft.templateId) {
      try {
        if (recipeForTemplate(draft.templateId).format !== nextFormat) patch.templateId = null;
      } catch { patch.templateId = null; }
    }
    if (body.answers !== undefined) patch.answers = intakeAnswers(nextFormat, body.answers);
    if (typeof body.brandName === "string") patch.brandName = body.brandName.trim().slice(0, 60);
    if (Array.isArray(body.personas)) patch.personas = body.personas as OnboardingDraft["personas"];
    if (Array.isArray(body.angles)) patch.angles = body.angles as OnboardingDraft["angles"];
    const updated = await deps.store.updateOnboardingDraft(draft.id, patch);
    return c.json({ draft: publicDraft(updated) });
  });

  app.post("/onboarding/:id/build", async (c) => {
    const draft = await authorizedDraft(deps, c.req.param("id"), c.req.raw);
    if (!draft) return c.json({ error: "unauthorized" }, 401);
    if (isProductLedCreationFormat(draft.creationFormat) && !draft.product) return c.json({ error: "missing_product" }, 409);
    const stages = initialBuildStages().map((stage) => ({ ...stage, state: "complete" as const }));
    const brandName = draft.brandName || draft.brandNames[0] || draft.answers?.brand || draft.answers?.topic || draft.product?.vendor || "Nouvelle page";
    const modelId = draft.modelId || "proteo";
    const brandKit = draft.brandKit ?? (draft.product ? createBrandKit(draft.product, modelId) : neutralBrandKit());
    const buildInput = {
      language: draft.language,
      brandName,
      modelId,
      personas: draft.personas,
      angles: draft.angles,
      brandKit,
      creationFormat: draft.creationFormat,
      templateId: draft.templateId ?? null,
      answers: draft.answers ?? {},
    };
    const document = isProductLedCreationFormat(draft.creationFormat)
      ? buildStoreDocument({ ...buildInput, creationFormat: draft.creationFormat, product: draft.product! })
      : buildStoreDocument({ ...buildInput, creationFormat: draft.creationFormat });
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
    const pageType = draft.creationFormat === "blog" ? "write" : draft.creationFormat === "blank" ? "blank" : "sell";
    const page = await deps.store.createPage({ workspaceId: workspace.id, name: draft.brandName, slug: await uniqueSlug(deps, workspace.id, draft.brandName), type: pageType, status: "draft", document: draft.document });
    await deps.store.claimOnboardingDraft(draft.id, draft.claimTokenHash, user.id, page.id);
    return c.json({ pageId: page.id }, 201);
  });

  return app;
}
