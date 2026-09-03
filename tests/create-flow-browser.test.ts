import { serve, type ServerType } from "@hono/node-server";
import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright";
import { expect as playwrightExpect } from "playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateEditorDocument } from "../src/editor/schema";
import { MemoryStore } from "../src/repos/memory";
import { createApp } from "../src/server/app";

const sessionCookie = "weflo-browser-session=authenticated";
const user = { id: "browser-user", email: "browser@weflo.test", name: "Camille" };
const expectedHomepageSections = [
  "announcement", "navigation", "hero", "imageText", "collectionGrid",
  "testimonials", "newsletter", "footer",
];
const homepageAnswers = {
  brand: "Maison Aube",
  activity: "Objets durables pour la maison",
  promise: "Habiter plus doucement",
  collections: "Lumière\nTextile",
  story: "Une maison indépendante née à Lyon.",
};
const shopifyProduct = {
  id: "gid://shopify/Product/731",
  sourceUrl: "https://atelier-aube.myshopify.com/products/lampe-magnetique",
  title: "Lampe magnétique Aube",
  description: "Une lampe murale sans perçage.",
  vendor: "Atelier Aube",
  currency: "EUR",
  price: 49,
  compareAtPrice: 69,
  images: ["https://cdn.example/lampe-aube.webp"],
  variants: [{ id: "gid://shopify/ProductVariant/991", title: "Sable", price: 49 }],
  rating: null,
  reviewCount: null,
  reviews: [],
};
const linkedProduct = {
  ...shopifyProduct,
  sourceUrl: "https://example.com/products/lampe-du-lien",
  title: "Lampe héritée du lien",
  vendor: "Marchand du lien",
};
const laterShopifyProduct = {
  ...shopifyProduct,
  id: "gid://shopify/Product/955",
  sourceUrl: "https://atelier-aube.myshopify.com/products/produit-55",
  title: "Produit Shopify 55",
};
const firstShopifyPage = [
  shopifyProduct,
  ...Array.from({ length: 49 }, (_, index) => ({
    ...shopifyProduct,
    id: `gid://shopify/Product/${800 + index}`,
    sourceUrl: `https://atelier-aube.myshopify.com/products/produit-${index + 2}`,
    title: `Produit Shopify ${index + 2}`,
  })),
];

let browser: Browser;
let server: ServerType;
let origin = "";

async function closeServer(instance: ServerType): Promise<void> {
  await new Promise<void>((resolve, reject) => instance.close((error) => error ? reject(error) : resolve()));
}

async function authenticatedPage(viewport = { width: 1440, height: 1000 }): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  await context.addCookies([{ name: "weflo-browser-session", value: "authenticated", url: origin }]);
  const page = await context.newPage();
  return { context, page };
}

async function openFormat(page: Page, format: "home" | "product" | "blank"): Promise<void> {
  await page.goto(`${origin}/dashboard`);
  await page.locator("[data-new-page]").click();
  const dialog = page.locator("[data-format-dialog]");
  await playwrightExpect(dialog).toHaveJSProperty("open", true);
  const link = dialog.locator(`a[href^="/creer?format=${format}"]`);
  await playwrightExpect(link).toHaveAttribute("href", `/creer?format=${format}&new=1`);
  await link.click();
  await page.waitForURL(new RegExp(`/creer\\?format=${format}`));
}

async function chooseTemplate(page: Page, templateId: string): Promise<void> {
  const link = page.locator(`[data-template-select="${templateId}"]`);
  await playwrightExpect(link).toHaveAttribute("href", new RegExp(`template=${templateId}`));
  await link.click();
  await page.waitForURL(new RegExp(`template=${templateId}`));
}

async function fillHomepageIntake(page: Page): Promise<void> {
  for (const [field, value] of Object.entries(homepageAnswers)) {
    await page.locator(`[name="answers[${field}]"]`).fill(value);
  }
}

async function fillProductIntake(page: Page): Promise<void> {
  for (const [field, value] of Object.entries({
    benefits: "Installation sans perçage",
    objections: "Autonomie de la batterie",
    offer: "49 € avec garantie 30 jours",
    variants: "Sable",
  })) {
    await page.locator(`[name="answers[${field}]"]`).fill(value);
  }
}

describe("format-specific creation browser journeys", () => {
  beforeAll(async () => {
    const store = new MemoryStore();
    const workspace = await store.createWorkspace({ name: "Atelier Aube", ownerUserId: user.id });
    await store.saveShopify({ workspaceId: workspace.id, shopDomain: "atelier-aube.myshopify.com", tokenEncrypted: "catalog-token", status: "connected" });
    const app = createApp({
      store,
      session: async (request) => request.headers.get("cookie")?.includes(sessionCookie) ? user : null,
      productFetch: {
        fetch: async () => ({
          finalUrl: linkedProduct.sourceUrl,
          html: `<script type="application/ld+json">${JSON.stringify({
            "@type": "Product",
            name: linkedProduct.title,
            description: linkedProduct.description,
            brand: { name: linkedProduct.vendor },
            image: linkedProduct.images,
            offers: { price: linkedProduct.price, priceCurrency: linkedProduct.currency },
          })}</script>`,
        }),
      },
      shopify: {
        ping: async () => {},
        publish: async () => ({ themeId: "theme-1", productId: "product-1" }),
        rollback: async () => {},
        listProducts: async ({ cursor }) => cursor === "catalog-page-2"
          ? { products: [laterShopifyProduct], nextCursor: null, previousCursor: "catalog-page-1" }
          : { products: firstShopifyPage, nextCursor: "catalog-page-2", previousCursor: null },
        getProduct: async ({ productId }) => [...firstShopifyPage, laterShopifyProduct].find((product) => product.id === productId) ?? null,
      },
    });
    server = await new Promise<ServerType>((resolve) => {
      const instance = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => {
        origin = `http://127.0.0.1:${info.port}`;
        resolve(instance);
      });
    });
    browser = await chromium.launch({ headless: true });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
    if (server) await closeServer(server);
  });

  it("moves from the authenticated dashboard to the homepage gallery and brand intake only", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await page.goto(`${origin}/dashboard`);
      await playwrightExpect(page.locator("[data-new-page]")).toBeVisible();
      await page.locator("[data-new-page]").click();
      const dialog = page.locator("[data-format-dialog]");
      await playwrightExpect(dialog).toHaveJSProperty("open", true);
      await dialog.locator("[data-format-dialog-close]").click();
      await playwrightExpect(dialog).toHaveJSProperty("open", false);
      await playwrightExpect(page.locator("[data-new-page]")).toBeFocused();

      await openFormat(page, "home");
      await playwrightExpect(page.locator("[data-template-card]")).toHaveCount(3);
      await playwrightExpect(page.locator('[data-template-card="home-brand-editorial"]')).toBeVisible();
      await playwrightExpect(page.locator('[data-template-card^="product-"]')).toHaveCount(0);
      const desktopPreview = page.locator('[data-template-card="home-brand-editorial"] [data-preview-image="desktop"]');
      await playwrightExpect.poll(() => desktopPreview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

      await chooseTemplate(page, "home-brand-editorial");
      await playwrightExpect(page.locator('[name="answers[brand]"]')).toBeVisible();
      await playwrightExpect(page.locator('[name="answers[collections]"]')).toBeVisible();
      await playwrightExpect(page.getByText("Amazon", { exact: false })).toHaveCount(0);
      await playwrightExpect(page.locator("[data-create-image]")).toHaveCount(0);
    } finally {
      await context.close();
    }
  }, 20_000);

  it("does not send a product-led template to the answers-only endpoint without a product source", async () => {
    const { context, page } = await authenticatedPage();
    let startRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/onboarding/start")) startRequests += 1;
    });
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await fillProductIntake(page);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());

      await playwrightExpect(page.getByRole("alert")).toContainText("Choisis un lien, une image ou un produit Shopify avant de continuer.");
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toHaveCount(0);
      expect(startRequests).toBe(0);
    } finally {
      await context.close();
    }
  }, 20_000);

  it("selects a real connected Shopify catalog product before entering product strategy", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "product");
      await playwrightExpect(page.locator("[data-template-card]")).toHaveCount(3);
      await playwrightExpect(page.locator('[data-template-card="product-bundle-first"]')).toBeVisible();
      await playwrightExpect(page.locator('[data-template-card^="home-"]')).toHaveCount(0);

      await chooseTemplate(page, "product-bundle-first");
      await playwrightExpect(page.locator('button[data-create-source="link"]')).toContainText("Importer un lien");
      await playwrightExpect(page.locator('label[data-create-source="image"]')).toContainText("Ajouter une image");
      const shopify = page.locator('button[data-create-source="shopify"]');
      await playwrightExpect(shopify).toContainText("Depuis Shopify");
      await shopify.click();
      await playwrightExpect(page.getByRole("heading", { name: "Choisis un produit Shopify" })).toBeVisible();
      const catalogProduct = page.locator(`[data-shopify-product="${shopifyProduct.id}"]`);
      await playwrightExpect(catalogProduct).toContainText(shopifyProduct.title);
      await catalogProduct.click();
      await playwrightExpect(page.getByText(`${shopifyProduct.title} est prêt à être utilisé.`)).toBeVisible();

      await fillProductIntake(page);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.getByText("Atelier Aube", { exact: false })).toBeVisible();
    } finally {
      await context.close();
    }
  }, 20_000);

  it("reaches and imports an active Shopify product after the first catalog page", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-bundle-first");
      await page.locator('button[data-create-source="shopify"]').click();
      await playwrightExpect(page.locator("[data-shopify-product]")).toHaveCount(50);
      await page.locator("[data-shopify-next]").click();
      await playwrightExpect(page.locator(`[data-shopify-product="${laterShopifyProduct.id}"]`)).toContainText(laterShopifyProduct.title);
      await playwrightExpect(page.locator("[data-shopify-page]")).toContainText("Page 2");

      await fillProductIntake(page);
      await page.locator(`[data-shopify-product="${laterShopifyProduct.id}"]`).click();
      await playwrightExpect(page.getByText(`${laterShopifyProduct.title} est prêt à être utilisé.`)).toBeVisible();
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.getByText(laterShopifyProduct.title, { exact: false }).first()).toBeVisible();
    } finally {
      await context.close();
    }
  }, 25_000);

  it("does not reuse a link draft after switching to Shopify without selecting a catalog product", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-bundle-first");
      await page.locator('button[data-create-source="link"]').click();
      for (const [field, value] of Object.entries({
        benefits: "Installation sans perçage",
        objections: "Autonomie de la batterie",
        offer: "49 € avec garantie 30 jours",
        variants: "Sable",
      })) {
        await page.locator(`[name="answers[${field}]"]`).fill(value);
      }
      await page.locator('[name="prompt"]').fill(linkedProduct.sourceUrl);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.getByText(linkedProduct.title, { exact: false }).first()).toBeVisible();

      await page.locator("[data-back-strategy]").click();
      await page.locator('button[data-create-source="shopify"]').click();
      const catalogProduct = page.locator(`[data-shopify-product="${shopifyProduct.id}"]`);
      await playwrightExpect(catalogProduct).toBeVisible();

      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("alert")).toContainText("Choisis un produit du catalogue Shopify avant de continuer.");
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toHaveCount(0);

      await catalogProduct.click();
      await playwrightExpect(page.getByText(`${shopifyProduct.title} est prêt à être utilisé.`)).toBeVisible();
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.getByText(shopifyProduct.title, { exact: false }).first()).toBeVisible();
      await playwrightExpect(page.getByText(linkedProduct.title, { exact: false })).toHaveCount(0);
    } finally {
      await context.close();
    }
  }, 25_000);

  it("renders a retryable French alert when link import fails", async () => {
    const { context, page } = await authenticatedPage();
    await page.route("**/api/onboarding/import", (route) => route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "import_failed", message: "Ce lien produit n’a pas pu être importé." }),
    }));
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await page.locator('button[data-create-source="link"]').click();
      await fillProductIntake(page);
      await page.locator('[name="prompt"]').fill(linkedProduct.sourceUrl);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());

      await playwrightExpect(page.getByRole("alert")).toContainText("Ce lien produit n’a pas pu être importé.");
      await playwrightExpect(page.locator("[data-intake-retry]")).toHaveText("Réessayer");
    } finally {
      await context.close();
    }
  }, 20_000);

  it("renders an image recovery action when image analysis fails", async () => {
    const { context, page } = await authenticatedPage();
    await page.route("**/api/onboarding/import-image", (route) => route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "image_import_failed", message: "Cette image n’a pas pu être analysée." }),
    }));
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await fillProductIntake(page);
      await page.locator("[data-create-image]").setInputFiles({ name: "produit.png", mimeType: "image/png", buffer: Buffer.from("image") });

      await playwrightExpect(page.getByRole("alert")).toContainText("Cette image n’a pas pu être analysée.");
      await playwrightExpect(page.locator("[data-image-retry]")).toHaveText("Choisir une autre image");
    } finally {
      await context.close();
    }
  }, 20_000);

  it("renders a retryable French alert when answers-only strategy preparation fails", async () => {
    const { context, page } = await authenticatedPage();
    await page.route("**/api/onboarding/start", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "start_failed", message: "La stratégie n’a pas pu être préparée." }),
    }));
    try {
      await openFormat(page, "home");
      await chooseTemplate(page, "home-brand-editorial");
      await page.locator('button[data-create-source="description"]').click();
      await fillHomepageIntake(page);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());

      await playwrightExpect(page.getByRole("alert")).toContainText("La stratégie n’a pas pu être préparée.");
      await playwrightExpect(page.locator("[data-intake-retry]")).toHaveText("Réessayer");
    } finally {
      await context.close();
    }
  }, 20_000);

  it("renders Shopify import recovery without leaving the intake", async () => {
    const { context, page } = await authenticatedPage();
    await page.route("**/api/onboarding/import-shopify", (route) => route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "shopify_import_failed", message: "Ce produit Shopify n’a pas pu être importé." }),
    }));
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await page.locator('button[data-create-source="shopify"]').click();
      await page.locator(`[data-shopify-product="${shopifyProduct.id}"]`).click();

      await playwrightExpect(page.getByRole("alert")).toContainText("Ce produit Shopify n’a pas pu être importé.");
      await playwrightExpect(page.locator("[data-shopify-load]")).toHaveText("Réessayer");
      await playwrightExpect(page.locator("[data-source-form]")).toBeVisible();
    } finally {
      await context.close();
    }
  }, 20_000);

  it("enables construction immediately after a successful image import", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await fillProductIntake(page);
      await page.locator("[data-create-image]").setInputFiles({ name: "lampe.png", mimeType: "image/png", buffer: Buffer.from("image") });

      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.locator("[data-build]")).toBeEnabled();
      await playwrightExpect(page.locator("[data-build]")).toHaveText("Construire la page");
    } finally {
      await context.close();
    }
  }, 20_000);

  it("locks duplicate image uploads and ignores an image response after switching source", async () => {
    const { context, page } = await authenticatedPage();
    const heldImageRoutes: Route[] = [];
    let imageRequests = 0;
    await page.route("**/api/onboarding/import-image", async (route) => {
      imageRequests += 1;
      heldImageRoutes.push(route);
    });
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-buybox-premium");
      await fillProductIntake(page);
      const image = page.locator("[data-create-image]");
      await image.setInputFiles({ name: "image-obsolete.png", mimeType: "image/png", buffer: Buffer.from("first") });
      await playwrightExpect.poll(() => imageRequests).toBe(1);
      await image.setInputFiles({ name: "image-double.png", mimeType: "image/png", buffer: Buffer.from("second") });
      await page.waitForTimeout(100);
      expect(imageRequests).toBe(1);

      await page.locator('button[data-create-source="link"]').click();
      await page.locator('[name="prompt"]').fill(linkedProduct.sourceUrl);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => form.requestSubmit());
      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      await playwrightExpect(page.getByText(linkedProduct.title, { exact: false }).first()).toBeVisible();

      await Promise.all(heldImageRoutes.map((route) => route.continue()));
      await page.waitForTimeout(300);
      await playwrightExpect(page.getByText(linkedProduct.title, { exact: false }).first()).toBeVisible();
      await playwrightExpect(page.getByText(/image obsolete|image double/i)).toHaveCount(0);
    } finally {
      for (const route of heldImageRoutes) await route.abort().catch(() => undefined);
      await context.close();
    }
  }, 25_000);

  it("shows a bounded reconnect action when the Shopify catalog is unavailable", async () => {
    const { context, page } = await authenticatedPage();
    await page.route("**/api/shopify/products", (route) => route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: "shopify_not_connected",
        message: "Aucun catalogue Shopify n’est connecté à cet espace.",
        actionUrl: "/boutique",
      }),
    }));
    try {
      await openFormat(page, "product");
      await chooseTemplate(page, "product-bundle-first");
      await page.locator('button[data-create-source="shopify"]').click();
      await playwrightExpect(page.getByRole("alert")).toContainText("Aucun catalogue Shopify n’est connecté à cet espace.");
      await playwrightExpect(page.getByRole("link", { name: "Reconnecter Shopify" })).toHaveAttribute("href", "/boutique");
      await playwrightExpect(page.locator("[data-shopify-catalog]")).toBeVisible();
    } finally {
      await context.close();
    }
  }, 20_000);

  it("recovers from a failed direct blank startup and opens a valid empty document on retry", async () => {
    const { context, page } = await authenticatedPage();
    let createRequests = 0;
    await page.route("**/api/pages", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      createRequests += 1;
      if (createRequests === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "blank_failed", message: "La page vierge n’a pas pu être créée." }),
        });
        return;
      }
      await route.continue();
    });
    try {
      await openFormat(page, "blank");
      await playwrightExpect(page.getByRole("heading", { name: "Impossible de créer la page vierge" })).toBeVisible();
      await playwrightExpect(page.getByRole("alert")).toContainText("La page vierge n’a pas pu être créée.");
      await page.locator("[data-blank-retry]").click();
      await page.waitForURL(/\/editeur\?page=/);
      await playwrightExpect(page.locator("[data-editor-shell]")).toBeVisible();
      await playwrightExpect(page.locator("[data-source-form]")).toHaveCount(0);
      expect(createRequests).toBe(2);

      const pageId = new URL(page.url()).searchParams.get("page");
      expect(pageId).toBeTruthy();
      const savedPage = await page.evaluate(async (id) => {
        const response = await fetch(`/api/pages/${encodeURIComponent(id!)}?documentVersion=2`);
        return response.json();
      }, pageId);
      expect(savedPage.document.pages[0].sections).toEqual([]);
      expect(savedPage.document.templateId).toBeNull();
      expect(validateEditorDocument(savedPage.document)).toMatchObject({ ok: true });
    } finally {
      await context.close();
    }
  }, 20_000);

  it("prevents double submission, recovers from a failed homepage build, and opens the structured editor on retry", async () => {
    const { context, page } = await authenticatedPage();
    let startRequests = 0;
    let buildRequests = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/onboarding/start")) startRequests += 1;
    });
    await page.route(/\/api\/onboarding\/[^/]+\/build$/, async (route) => {
      buildRequests += 1;
      if (buildRequests === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "build_failed", message: "La construction a échoué. Réessaie." }),
        });
        return;
      }
      await route.continue();
    });

    try {
      await openFormat(page, "home");
      await chooseTemplate(page, "home-brand-editorial");
      await page.locator('button[data-create-source="description"]').click();
      await fillHomepageIntake(page);
      await page.locator("[data-source-form]").evaluate((form: HTMLFormElement) => {
        form.requestSubmit();
        form.requestSubmit();
      });

      await playwrightExpect(page.getByRole("heading", { name: "À qui doit parler cette page ?" })).toBeVisible();
      expect(startRequests).toBe(1);
      await page.locator("[data-build]").click();
      await playwrightExpect(page.locator("[data-build-preview]")).toBeVisible();
      await playwrightExpect(page.locator("aside")).toContainText("Informations");
      await playwrightExpect(page.locator("aside")).not.toContainText("Produit");
      await playwrightExpect(page.getByText("La construction a échoué. Réessaie.")).toBeVisible({ timeout: 5_000 });
      await playwrightExpect(page.locator("[data-build]")).toHaveText("Construire la page");

      await page.locator("[data-build]").click();
      await page.waitForURL(/\/editeur\?page=/, { timeout: 15_000 });
      await playwrightExpect(page.locator("[data-editor-shell]")).toBeVisible();
      expect(buildRequests).toBe(2);

      const pageId = new URL(page.url()).searchParams.get("page");
      const savedPage = await page.evaluate(async (id) => {
        const response = await fetch(`/api/pages/${encodeURIComponent(id!)}?documentVersion=2`);
        return response.json();
      }, pageId);
      expect(savedPage.document.templateId).toBe("home-brand-editorial");
      expect(savedPage.document.templateVersion).toBe(1);
      expect(savedPage.document.pages[0].sections.map((section: { type: string }) => section.type)).toEqual(expectedHomepageSections);
      expect(validateEditorDocument(savedPage.document)).toMatchObject({ ok: true });
      expect(JSON.stringify(savedPage.document)).not.toMatch(/previewOnly|previewFixtureId|template-preview-fixture|demo\.weflo\.app|Atelier fictif/i);
      expect(JSON.stringify(savedPage.document)).toContain("Maison Aube");

      await openFormat(page, "home");
      await playwrightExpect(page.locator('[data-template-card="home-brand-editorial"]')).toBeVisible();
      await playwrightExpect(page.locator("[data-source-form]")).toHaveCount(0);
      await playwrightExpect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("weflo-create-draft-v2") ?? "null")?.answers)).toEqual({});
    } finally {
      await context.close();
    }
  }, 30_000);

  it("closes the native preview dialog cleanly and preserves intake through browser back and forward", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "home");
      const previewButton = page.locator('[data-template-open="home-brand-editorial"]');
      await previewButton.click();
      const dialog = page.locator("[data-template-dialog]");
      await playwrightExpect(dialog).toHaveJSProperty("open", true);
      await dialog.locator('[data-template-dialog-device="mobile"]').click();
      await playwrightExpect(dialog.locator("[data-template-dialog-stage]")).toHaveAttribute("data-preview-device", "mobile");
      await page.keyboard.press("Escape");
      await playwrightExpect(dialog).toHaveJSProperty("open", false);
      await playwrightExpect(previewButton).toBeFocused();

      await chooseTemplate(page, "home-brand-editorial");
      await fillHomepageIntake(page);
      await playwrightExpect(page.locator('[name="answers[brand]"]')).toHaveValue("Maison Aube");
      await page.goBack();
      await playwrightExpect(page.locator('[data-template-card="home-brand-editorial"]')).toBeVisible();
      await playwrightExpect(page.locator("[data-source-form]")).toHaveCount(0);
      await page.goForward();
      await playwrightExpect(page.locator('[name="answers[brand]"]')).toHaveValue("Maison Aube");
      await playwrightExpect(page.locator('[name="answers[story]"]')).toHaveValue("Une maison indépendante née à Lyon.");
      await playwrightExpect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("weflo-create-draft-v2") ?? "null")?.templateId)).toBe("home-brand-editorial");
    } finally {
      await context.close();
    }
  }, 20_000);
});
