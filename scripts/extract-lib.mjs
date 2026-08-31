export function extractTemplate(html) {
  const start = '<script type="__bundler/template">';
  const i = html.indexOf(start);
  if (i < 0) throw new Error("missing __bundler/template");
  const j = html.indexOf("</script>", i);
  return JSON.parse(html.slice(i + start.length, j));
}

export function stripShopifyOauth(html) {
  return html
    .replace(/<button[^>]*>[\s\S]*?Shopify[\s\S]*?<\/button>/gi, "")
    .replace(/<a[^>]*>[\s\S]*?Shopify[\s\S]*?<\/a>/gi, "")
    .replace(/<div[^>]*sc-camel-on-click[^>]*>[\s\S]*?Shopify[\s\S]*?<\/div>/gi, "");
}

export function injectHydrate(html, src) {
  const tag = `<script type="module" src="${src}"></script>\n`;
  if (html.includes("</body>")) return html.replace("</body>", `${tag}</body>`);
  return html + tag;
}
