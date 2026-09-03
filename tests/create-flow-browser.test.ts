import { serve, type ServerType } from "@hono/node-server";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
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
  const link = dialog.locator(`a[href="/creer?format=${format}"]`);
  await playwrightExpect(link).toHaveAttribute("href", `/creer?format=${format}`);
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

describe("format-specific creation browser journeys", () => {
  beforeAll(async () => {
    const store = new MemoryStore();
    const app = createApp({
      store,
      session: async (request) => request.headers.get("cookie")?.includes(sessionCookie) ? user : null,
      productFetch: { fetch: async () => { throw new Error("Aucun import produit attendu dans ce parcours."); } },
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

  it("moves from the dashboard to the bundle-first product intake with all product sources", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "product");
      await playwrightExpect(page.locator("[data-template-card]")).toHaveCount(3);
      await playwrightExpect(page.locator('[data-template-card="product-bundle-first"]')).toBeVisible();
      await playwrightExpect(page.locator('[data-template-card^="home-"]')).toHaveCount(0);

      await chooseTemplate(page, "product-bundle-first");
      await playwrightExpect(page.locator('button[data-create-source="link"]')).toContainText("Importer un lien");
      await playwrightExpect(page.locator('label[data-create-source="image"]')).toContainText("Ajouter une image");
      await playwrightExpect(page.locator('button[data-create-source="shopify"]')).toContainText("Depuis Shopify");
    } finally {
      await context.close();
    }
  }, 20_000);

  it("opens a blank page directly in the editor with a valid empty document", async () => {
    const { context, page } = await authenticatedPage();
    try {
      await openFormat(page, "blank");
      await page.waitForURL(/\/editeur\?page=/);
      await playwrightExpect(page.locator("[data-editor-shell]")).toBeVisible();
      await playwrightExpect(page.locator("[data-source-form]")).toHaveCount(0);

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
