import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const MIME_EXT = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "font/woff2": "woff2",
  "font/woff": "woff",
};

export function extractTemplate(html) {
  const start = '<script type="__bundler/template">';
  const i = html.indexOf(start);
  if (i < 0) throw new Error("missing __bundler/template");
  const j = html.indexOf("</script>", i);
  return JSON.parse(html.slice(i + start.length, j));
}

export function parseManifest(html) {
  const start = '<script type="__bundler/manifest">';
  const i = html.indexOf(start);
  if (i < 0) return {};
  const j = html.indexOf("</script>", i);
  return JSON.parse(html.slice(i + start.length, j));
}

export function stripShopifyOauth(html) {
  return html
    .replace(/<button[^>]*>[\s\S]*?Shopify[\s\S]*?<\/button>/gi, "")
    .replace(/<a[^>]*>[\s\S]*?Shopify[\s\S]*?<\/a>/gi, "")
    .replace(/<div[^>]*sc-camel-on-click[^>]*>[\s\S]*?Shopify[\s\S]*?<\/div>/gi, "");
}

export function revealEditorToolbar(html) {
  return html
    .replace(
      /(position:absolute;top:16px;right:16px;z-index:40;)display:none/g,
      "$1display:flex",
    )
    .replace(
      /(<div style="position:absolute;top:16px;right:16px;z-index:40;)display:none"/g,
      '$1display:flex"',
    );
}

export function sanitizeConnexionTalent(html) {
  return html
    .replace(/placeholder="Amir Ben Ettaleb"/g, 'placeholder="Ton nom"')
    .replace(/placeholder="(?:l)?amir@acai\.studio"/gi, 'placeholder="toi@email.com"')
    .replace(/value="Amir Ben Ettaleb"/g, 'value=""')
    .replace(/value="(?:l)?amir@acai\.studio"/gi, 'value=""');
}

export function injectHydrate(html, src) {
  const tag = `<script type="module" src="${src}"></script>\n`;
  if (html.includes("</body>")) return html.replace("</body>", `${tag}</body>`);
  return html + tag;
}

class DCLogic {
  state = {};
  props = {};
  setState() {}
}

function reactAttrName(key) {
  if (key === "className") return "class";
  if (key === "viewBox") return "viewBox";
  if (key === "strokeWidth") return "stroke-width";
  if (key === "strokeLinecap") return "stroke-linecap";
  if (key === "strokeLinejoin") return "stroke-linejoin";
  return key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}

const ReactStub = {
  createElement(type, props, ...children) {
    if (typeof type !== "string") return "";
    const p = props && typeof props === "object" ? props : {};
    const nodes = [...children, p.children]
      .flat(Infinity)
      .filter((node) => node != null && node !== false && node !== true);
    const attrs = Object.entries(p)
      .filter(([key, value]) => value != null && key !== "children" && key !== "key" && typeof value !== "function")
      .map(([key, value]) => {
        if (key === "style" && typeof value === "object") {
          const css = Object.entries(value)
            .map(([sk, sv]) => `${sk.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}:${sv}`)
            .join(";");
          return `style="${css}"`;
        }
        if (typeof value === "boolean") return value ? reactAttrName(key) : "";
        return `${reactAttrName(key)}="${String(value).replace(/"/g, "&quot;")}"`;
      })
      .filter(Boolean)
      .join(" ");
    return `<${type}${attrs ? ` ${attrs}` : ""}>${nodes.join("")}</${type}>`;
  },
};

function imageAsset() {
  return "";
}

export function evalRenderVals(html) {
  const m = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  const fn = new Function(
    "DCLogic",
    "React",
    "IA",
    "window",
    `${m[1]}\nreturn typeof Component === "function" ? Component : null;`,
  );
  const Component = fn(DCLogic, ReactStub, imageAsset, { innerWidth: 1440, innerHeight: 900 });
  if (!Component) return null;
  const inst = new Component();
  if (typeof inst.renderVals !== "function") return null;
  return inst.renderVals();
}

function shouldKeepToken(full, offset) {
  const before = full.slice(Math.max(0, offset - 120), offset);
  const attr = before.match(/([a-zA-Z0-9-]+)=["']$/);
  if (!attr) return false;
  const name = attr[1];
  if (name.startsWith("sc-camel-") || name === "ref" || name === "list" || name === "hint-placeholder-val") {
    return true;
  }
  if (name === "value" && /<sc-if\b[^>]*$/.test(before)) return true;
  return false;
}

export function bakeDcDefaults(html, vals) {
  let resolved = vals;
  if (resolved == null) {
    try {
      resolved = evalRenderVals(html);
    } catch {
      return html;
    }
  }
  if (!resolved) return html;
  let out = html;
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const token = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    out = out.replace(token, (match, offset, full) => {
      if (shouldKeepToken(full, offset)) return match;
      return String(value);
    });
  }
  return out;
}

function bindAlias(inner, alias, row) {
  if (!row || typeof row !== "object") return inner;
  let chunk = inner;
  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const token = new RegExp(`\\{\\{\\s*${alias}\\.${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    chunk = chunk.replace(token, String(value));
  }
  return chunk;
}

export function expandScFor(html, vals) {
  if (!vals) return html;
  let out = html;
  for (let i = 0; i < 80; i += 1) {
    const match = [...out.matchAll(/<sc-for\b([^>]*)>((?:(?!<sc-for\b)[\s\S])*?)<\/sc-for>/g)].find(
      (hit) => !/\bdata-weflo-baked\b/.test(hit[1]),
    );
    if (!match) break;
    const attrs = match[1];
    const inner = match[2];
    const listKey = (attrs.match(/list="\{\{\s*(\w+)\s*\}\}"/) || [])[1];
    const alias = (attrs.match(/\bas="(\w+)"/) || [])[1] || "item";
    const list = listKey ? vals[listKey] : null;
    const body = Array.isArray(list) && list.length > 0
      ? list.map((row) => bindAlias(inner, alias, row)).join("")
      : inner;
    const replacement = `<sc-for${attrs} data-weflo-baked="1">${body}</sc-for>`;
    out = out.slice(0, match.index) + replacement + out.slice(match.index + match[0].length);
  }
  return out;
}

export function applyDcDefaults(html) {
  let vals = null;
  try {
    vals = evalRenderVals(html);
  } catch {
    vals = null;
  }
  return expandScFor(bakeDcDefaults(html, vals), vals);
}

export function rewriteAssetUrls(html, map) {
  let out = html;
  const srcRe = new RegExp(`(src|href)=["'](${UUID})["']`, "gi");
  out = out.replace(srcRe, (all, attr, uuid) => {
    const url = map[uuid.toLowerCase()] ?? map[uuid];
    return url ? `${attr}="${url}"` : all;
  });
  const urlRe = new RegExp(`url\\(["'](${UUID})["']\\)`, "gi");
  out = out.replace(urlRe, (all, uuid) => {
    const url = map[uuid.toLowerCase()] ?? map[uuid];
    return url ? `url("${url}")` : all;
  });
  return out;
}

export function dropRuntimeScripts(html) {
  return html.replace(new RegExp(`<script src="${UUID}"><\\/script>\\s*`, "gi"), "");
}

export function hideInactiveScIf(html) {
  const style = `<style>
sc-if[hint-placeholder-val="{{ false }}"],sc-if[hint-placeholder-val="false"],sc-if[value="false"]{display:none!important}
body.auth-mode-login sc-if[value="{{ isSignup }}"]{display:none!important}
body.auth-mode-signup sc-if[value="{{ isLogin }}"]{display:none!important}
</style>`;
  if (html.includes("</helmet>")) return html.replace("</helmet>", `${style}</helmet>`);
  if (html.includes("</head>")) return html.replace("</head>", `${style}</head>`);
  return style + html;
}

export function extractBundleAssets(sourceHtml, destDir) {
  const manifest = parseManifest(sourceHtml);
  fs.mkdirSync(destDir, { recursive: true });
  /** @type {Record<string, string>} */
  const map = {};
  for (const [uuid, entry] of Object.entries(manifest)) {
    if (!entry || typeof entry !== "object") continue;
    const mime = typeof entry.mime === "string" ? entry.mime : "";
    const ext = MIME_EXT[mime];
    if (!ext || typeof entry.data !== "string") continue;
    let buf = Buffer.from(entry.data, "base64");
    if (entry.compressed) buf = zlib.gunzipSync(buf);
    const filename = `${uuid}.${ext}`;
    fs.writeFileSync(path.join(destDir, filename), buf);
    map[uuid] = `/assets/${filename}`;
  }
  return map;
}

function previewSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function previewMapFromScript(source, globalName) {
  const match = source.match(new RegExp(`window\\.${globalName}\\s*=\\s*(\\{[\\s\\S]*?\\});`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractEditorPreviewAssets(sourceHtml, destDir) {
  const manifest = parseManifest(sourceHtml);
  fs.mkdirSync(destDir, { recursive: true });
  const found = { desktop: {}, mobile: {} };
  for (const entry of Object.values(manifest)) {
    if (!entry || typeof entry !== "object" || !String(entry.mime).includes("javascript") || typeof entry.data !== "string") continue;
    let buf = Buffer.from(entry.data, "base64");
    if (entry.compressed) buf = zlib.gunzipSync(buf);
    const source = buf.toString("utf8");
    for (const [globalName, viewport] of [["__BS_PREVIEWS", "desktop"], ["__BS_PREVIEWS_MB", "mobile"]]) {
      const previews = previewMapFromScript(source, globalName);
      if (!previews) continue;
      for (const [brand, dataUri] of Object.entries(previews)) {
        if (typeof dataUri !== "string") continue;
        const image = dataUri.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
        if (!image) continue;
        const ext = image[1] === "jpeg" ? "jpg" : image[1];
        const filename = `editor-preview-${previewSlug(brand)}-${viewport}.${ext}`;
        fs.writeFileSync(path.join(destDir, filename), Buffer.from(image[2], "base64"));
        found[viewport][brand] = `/assets/${filename}`;
      }
    }
  }
  return found;
}
