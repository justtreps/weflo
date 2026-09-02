import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { SECTION_PREVIEW_MANIFESTS } from "../src/section-preview/manifests.ts";
import { sectionPreviewPage } from "./section-preview-page.ts";

const root = process.cwd();
const outputRoot = join(root, "public", "assets", "section-previews");
const manifestPath = join(outputRoot, "manifest.json");
const update = process.argv.includes("--update");
let previous = { entries: [] };
try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch {}
const previousByPath = new Map(previous.entries.map((entry) => [entry.path, entry]));
const entries = [];
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ locale:"fr-FR", timezoneId:"Europe/Paris", reducedMotion:"reduce", deviceScaleFactor:1 });
  const page = await context.newPage();
  for (const definition of SECTION_PREVIEW_MANIFESTS) {
    for (const viewport of ["desktop", "mobile"]) {
      const width = viewport === "desktop" ? 1440 : 390;
      await page.setViewportSize({ width, height: viewport === "desktop" ? 1000 : 844 });
      const html = sectionPreviewPage({ sectionType:definition.sectionType, variantId:definition.variantId, fixtureId:definition.defaultFixtureId, viewport });
      const assetPath = definition.preview[viewport];
      const hash = createHash("sha256").update(`${definition.previewVersion}:${html}`).digest("hex").slice(0,16);
      const existing = previousByPath.get(assetPath);
      const destination = join(root,"public",...assetPath.split("/").filter(Boolean));
      if (existing?.hash === hash) { entries.push(existing); continue; }
      if (existing && !update) throw new Error(`Visual reference changed: ${assetPath}. Run with --update after review.`);
      await page.setContent(html,{waitUntil:"networkidle",timeout:30000});
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map((image)=>image.complete?Promise.resolve():new Promise((resolve)=>{image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});})));});
      const qa = await page.evaluate(()=>({width:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,brokenImages:[...document.images].filter((image)=>!image.complete||image.naturalWidth===0).length,visibleText:document.body.innerText.trim().length,unnamedControls:[...document.querySelectorAll("button,a,input,select")].filter((node)=>!(node.textContent?.trim()||node.getAttribute("aria-label")||node.getAttribute("title")||node.closest("label")?.textContent?.trim())).length}));
      if (qa.width > qa.clientWidth + 1) throw new Error(`Horizontal overflow in ${assetPath}: ${qa.width}/${qa.clientWidth}`);
      if (qa.brokenImages) throw new Error(`Broken images in ${assetPath}: ${qa.brokenImages}`);
      if (qa.visibleText < 40) throw new Error(`Preview is effectively empty: ${assetPath}`);
      if (qa.unnamedControls) throw new Error(`Unnamed interactive controls in ${assetPath}: ${qa.unnamedControls}`);
      const target = page.locator('[data-wf-section-id="preview-focus"]');
      const box = await target.boundingBox();
      if (!box || box.width < 280 || box.height < 120) throw new Error(`Invalid section bounds: ${assetPath}`);
      const buffer = await target.screenshot({type:"webp",quality:86,animations:"disabled"});
      await mkdir(dirname(destination),{recursive:true});
      const temporary=`${destination}.tmp`;
      await writeFile(temporary,buffer);
      try { await unlink(destination); } catch {}
      await rename(temporary,destination);
      entries.push({path:assetPath,hash,width:Math.round(box.width),height:Math.round(box.height),bytes:buffer.length});
      process.stdout.write(`generated ${assetPath}\n`);
    }
  }
  await mkdir(outputRoot,{recursive:true});
  await writeFile(manifestPath,`${JSON.stringify({version:1,generatedAt:new Date().toISOString(),entries},null,2)}\n`);
  process.stdout.write(`${entries.length} section previews ready\n`);
} finally {
  await browser.close();
}
