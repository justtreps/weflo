import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTemplate, stripShopifyOauth, injectHydrate } from "./extract-lib.mjs";

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

fs.mkdirSync(path.join(root, "public"), { recursive: true });
for (const [file, hydrate] of Object.entries(map)) {
  let html = extractTemplate(fs.readFileSync(path.join(root, file), "utf8"));
  if (file === "connexion.html") html = stripShopifyOauth(html);
  if (hydrate) html = injectHydrate(html, hydrate);
  fs.writeFileSync(path.join(root, "public", file), html);
}

const hub = fs.readFileSync(path.join(root, "index.html"), "utf8");
fs.writeFileSync(path.join(root, "public", "maquettes.html"), hub);
