import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { FORMAT_FLOWS } from "../src/create/format-flow.ts";
import { renderTemplatePreview } from "../src/create/template-preview.ts";
import { fixtureById } from "../src/section-preview/fixtures.ts";

const root = process.cwd();
const outputRoot = join(root, "public", "template-previews");
const sizes = { desktop: { width: 1440, height: 1100 }, mobile: { width: 390, height: 844 } };
const templates = FORMAT_FLOWS.flatMap((flow) => flow.templates);

function pathFor(templateId, viewport) { return `/template-previews/${templateId}-${viewport}.webp`; }
function hash(content) { return createHash("sha256").update(content).digest("hex").slice(0, 16); }

async function assertPreview(page, templateId, viewport) {
  const qa = await page.evaluate(() => ({
    fixture: document.body.dataset.previewFixture,
    duplicateIds: [...document.querySelectorAll("[id]")].map((node) => node.id).filter((id, index, all) => all.indexOf(id) !== index),
    brokenImages: [...document.images].filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc || image.getAttribute("src") || "(empty)"),
    consoleErrors: window.__templatePreviewConsoleErrors ?? [],
    visibleText: document.body.innerText.trim().length,
  }));
  if (qa.fixture !== "true") throw new Error(`Missing fixture stamp for ${templateId}:${viewport}`);
  if (qa.duplicateIds.length) throw new Error(`Duplicate ids in ${templateId}:${viewport}: ${qa.duplicateIds.join(", ")}`);
  if (qa.brokenImages.length) throw new Error(`Broken images in ${templateId}:${viewport}: ${qa.brokenImages.join(", ")}`);
  if (qa.consoleErrors.length) throw new Error(`Console errors in ${templateId}:${viewport}: ${qa.consoleErrors.join(" | ")}`);
  if (qa.visibleText < 80) throw new Error(`Blank preview in ${templateId}:${viewport}`);
}

function overviewHtml(sectionBuffers, viewport) {
  const columns = viewport === "desktop" ? 3 : 2;
  return `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#10100f}.grid{height:calc(100vh - 36px);display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));grid-auto-rows:1fr;gap:10px}.frame{min-width:0;min-height:0;overflow:hidden;background:#f7f6f1;border:1px solid #3e3d37}.frame img{width:100%;height:100%;display:block;object-fit:contain;object-position:top}</style></head><body><main class="grid">${sectionBuffers.map((buffer) => `<div class="frame"><img src="data:image/png;base64,${buffer.toString("base64")}" alt="Section de modèle fictif"></div>`).join("")}</main></body></html>`;
}

function contactSheetHtml(cards) {
  return `<!doctype html><html><head><style>body{margin:0;padding:38px;background:#10100f;color:#f6f4ee;font-family:Inter,Arial,sans-serif}.head{display:flex;justify-content:space-between;align-items:end;margin:0 auto 28px;max-width:1760px}.head h1{margin:0;font:600 34px/1 Georgia,serif}.head p{margin:0;color:#bbb7ac;font-size:14px}.format{max-width:1760px;margin:0 auto 36px}.format>h2{margin:0 0 12px;font-size:15px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{padding:10px;background:#1c1c1a;border:1px solid #3d3c37}.card h3{margin:0 0 9px;font-size:13px}.shots{display:grid;grid-template-columns:1fr 92px;gap:8px;align-items:start}.shots img{width:100%;display:block;background:#eee}.shots img.mobile{aspect-ratio:390/844;object-fit:cover}</style></head><body><header class="head"><h1>Weflo · Aperçus de modèles</h1><p>Fixtures fictives · bureau + mobile · 21 compositions</p></header>${cards.join("")}</body></html>`;
}

function fixtureIllustration(url) {
  const match = new URL(url).pathname.match(/^\/([a-z0-9-]+)-(\d+)\.svg$/);
  if (!match) throw new Error(`Unknown deterministic fixture image: ${url}`);
  const fixture = fixtureById(match[1]);
  const index = Number(match[2]);
  const [background, surface, ink, accent] = fixture.brand.palette;
  const label = `${fixture.brand.name} · Exemple fictif`.replace(/[&<>]/g, "");
  const title = fixture.product.title.replace(/[&<>]/g, "");
  const shape = `<rect x="388" y="190" width="254" height="690" rx="120" fill="${surface}" stroke="${ink}" stroke-width="12"/><rect x="438" y="146" width="154" height="90" rx="28" fill="${accent}"/><circle cx="515" cy="450" r="${44 + index * 8}" fill="${accent}" opacity=".75"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${background}"/><circle cx="880" cy="170" r="180" fill="${accent}" opacity=".24"/>${shape}<text x="72" y="916" fill="${ink}" font-family="Arial, sans-serif" font-size="28">${label}</text><text x="72" y="962" fill="${ink}" font-family="Georgia, serif" font-size="42">${title}</text></svg>`;
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const entries = {};
const contactCards = new Map();
try {
  const context = await browser.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris", reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await context.newPage();
  await context.route("https://template-preview-fixture.local/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: fixtureIllustration(route.request().url()) }));
  page.on("console", (message) => { if (message.type() === "error") void page.evaluate((text) => { (window.__templatePreviewConsoleErrors ??= []).push(text); }, message.text()).catch(() => {}); });
  for (const template of templates) {
    const assets = {};
    for (const viewport of ["desktop", "mobile"]) {
      const size = sizes[viewport];
      const html = renderTemplatePreview(template.id, viewport);
      await page.setViewportSize(size);
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.evaluate(() => document.querySelectorAll("img").forEach((image) => { image.loading = "eager"; image.decoding = "sync"; }));
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.complete || image.naturalWidth > 0 ? Promise.resolve() : new Promise((resolve) => {
          const timeout = window.setTimeout(resolve, 12_000);
          image.addEventListener("load", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          image.addEventListener("error", () => { window.clearTimeout(timeout); resolve(); }, { once: true });
        })));
      });
      await assertPreview(page, template.id, viewport);
      const sections = page.locator("[data-wf-section-id]");
      const sectionBuffers = [];
      for (let index = 0; index < await sections.count(); index += 1) sectionBuffers.push(await sections.nth(index).screenshot({ type: "png", animations: "disabled" }));
      const overview = await context.newPage();
      await overview.setViewportSize(size);
      await overview.setContent(overviewHtml(sectionBuffers, viewport), { waitUntil: "domcontentloaded" });
      const buffer = await overview.screenshot({ type: "webp", quality: 86, animations: "disabled" });
      await overview.close();
      const assetPath = pathFor(template.id, viewport);
      await writeFile(join(root, "public", ...assetPath.split("/").filter(Boolean)), buffer);
      assets[viewport] = { path: assetPath, buffer, hash: hash(buffer) };
    }
    entries[template.id] = {
      desktop: assets.desktop.path, mobile: assets.mobile.path,
      desktopHash: assets.desktop.hash, mobileHash: assets.mobile.hash,
      dimensions: { desktop: sizes.desktop, mobile: sizes.mobile },
    };
    const card = `<article class="card"><h3>${template.name}</h3><div class="shots"><img src="data:image/webp;base64,${assets.desktop.buffer.toString("base64")}" alt="${template.name} sur ordinateur"><img class="mobile" src="data:image/webp;base64,${assets.mobile.buffer.toString("base64")}" alt="${template.name} sur mobile"></div></article>`;
    const cards = contactCards.get(template.format) ?? [];
    cards.push(card); contactCards.set(template.format, cards);
  }
  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(entries, null, 2)}\n`);
  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 1840, height: 1200 });
  await sheet.setContent(contactSheetHtml([...contactCards].map(([format, cards]) => `<section class="format"><h2>${format}</h2><div class="grid">${cards.join("")}</div></section>`)), { waitUntil: "domcontentloaded" });
  await sheet.screenshot({ path: join(outputRoot, "contact-sheet.png"), fullPage: true, animations: "disabled" });
  process.stdout.write(`generated ${templates.length * 2} template previews and contact sheet\n`);
} finally {
  await browser.close();
}
