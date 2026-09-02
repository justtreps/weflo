import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractTemplate,
  stripShopifyOauth,
  injectHydrate,
  applyDcDefaults,
  rewriteAssetUrls,
  dropRuntimeScripts,
  hideInactiveScIf,
  extractBundleAssets,
  sanitizeConnexionTalent,
  revealEditorToolbar,
  extractEditorPreviewAssets,
} from "./extract-lib.mjs";

const __dirname = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const map = {
  "connexion.html": "/hydrate/connexion.js",
  "dashboard.html": "/hydrate/dashboard.js",
  "editeur.html": "/hydrate/editeur.js",
  "facturation.html": "/hydrate/facturation.js",
  "parrainage.html": "/hydrate/parrainage.js",
  "direction-artistique.html": null,
  "mascottes.html": null,
};

const publicDir = path.join(root, "public");
const assetsDir = path.join(publicDir, "assets");
fs.mkdirSync(assetsDir, { recursive: true });

for (const [file, hydrate] of Object.entries(map)) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (file === "editeur.html") {
    const previews = extractEditorPreviewAssets(source, assetsDir);
    fs.writeFileSync(path.join(assetsDir, "editor-previews.json"), JSON.stringify(previews));
  }
  let html = extractTemplate(source);
  const urls = extractBundleAssets(source, assetsDir);
  html = rewriteAssetUrls(html, urls);
  html = dropRuntimeScripts(html);
  html = applyDcDefaults(html);
  html = hideInactiveScIf(html);
  if (file === "connexion.html") {
    html = stripShopifyOauth(html);
    html = sanitizeConnexionTalent(html);
    html = html.replace(/<body>/, '<body class="auth-mode-login">');
  }
  if (file === "editeur.html") html = revealEditorToolbar(html);
  if (hydrate) html = injectHydrate(html, hydrate);
  fs.writeFileSync(path.join(publicDir, file), html);
}

const hub = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.writeFileSync(path.join(publicDir, "maquettes.html"), hub);
