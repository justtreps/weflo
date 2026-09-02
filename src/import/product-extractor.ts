import { extractProductFromHtml } from "./html-product-parser";
import { assertPublicProductUrl } from "./url-policy";
import type { ImportedProduct } from "../onboarding/types";

export type ProductFetchPort = { fetch(url: URL): Promise<{ finalUrl: string; html: string }> };

export function createNativeProductFetchPort(): ProductFetchPort {
  return {
    async fetch(initialUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(initialUrl, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "WefloProductImporter/1.0" } });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) throw new Error("The product page redirected without a destination.");
          const redirected = await assertPublicProductUrl(new URL(location, initialUrl).toString());
          return this.fetch(redirected);
        }
        if (!response.ok) throw new Error(`The product page returned ${response.status}.`);
        const length = Number(response.headers.get("content-length") ?? 0);
        if (length > 5_000_000) throw new Error("The product page is too large.");
        const html = await response.text();
        if (html.length > 5_000_000) throw new Error("The product page is too large.");
        return { finalUrl: response.url || initialUrl.toString(), html };
      } finally { clearTimeout(timeout); }
    },
  };
}

export async function importProduct(rawUrl: string, port: ProductFetchPort): Promise<ImportedProduct> {
  const url = await assertPublicProductUrl(rawUrl);
  const result = await port.fetch(url);
  await assertPublicProductUrl(result.finalUrl);
  return extractProductFromHtml(result.html, result.finalUrl);
}
