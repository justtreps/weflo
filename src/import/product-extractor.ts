import { extractProductFromHtml } from "./html-product-parser";
import { assertPublicProductUrl } from "./url-policy";
import type { ImportedProduct } from "../onboarding/types";

export type ProductFetchPort = { fetch(url: URL): Promise<{ finalUrl: string; html: string }> };

type NativeProductFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

export function createNativeProductFetchPort(options: NativeProductFetchOptions = {}): ProductFetchPort {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRedirects = options.maxRedirects ?? 5;
  return {
    async fetch(initialUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        let currentUrl = initialUrl;
        for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
          const response = await fetchImpl(currentUrl, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "WefloProductImporter/1.0" } });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) throw new Error("La page produit redirige sans indiquer de destination.");
            if (redirectCount === maxRedirects) throw new Error("La page produit contient trop de redirections.");
            currentUrl = await assertPublicProductUrl(new URL(location, currentUrl).toString());
            continue;
          }
          if (!response.ok) throw new Error(`La page produit a répondu avec le statut ${response.status}.`);
          const length = Number(response.headers.get("content-length") ?? 0);
          if (length > 5_000_000) throw new Error("La page produit est trop volumineuse.");
          const html = await response.text();
          if (html.length > 5_000_000) throw new Error("La page produit est trop volumineuse.");
          return { finalUrl: response.url || currentUrl.toString(), html };
        }
        throw new Error("La page produit contient trop de redirections.");
      } catch (error) {
        if (controller.signal.aborted) throw new Error("L’importation a dépassé le temps autorisé. Réessaie ou importe une image.");
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export async function importProduct(rawUrl: string, port: ProductFetchPort): Promise<ImportedProduct> {
  const url = await assertPublicProductUrl(rawUrl);
  const result = await port.fetch(url);
  await assertPublicProductUrl(result.finalUrl);
  return extractProductFromHtml(result.html, result.finalUrl);
}
