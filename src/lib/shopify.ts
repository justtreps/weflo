import { decryptSecret } from "./encrypt";
import { shopifyThemeAssets } from "./theme-files";
import type { PageDocument, ShopifyPort } from "../types";
import type { EditorDocument } from "../editor/document";
import { compileShopifyPage } from "../shopify/compiler";
import { publishToShopify } from "../shopify/publisher";
import type { ShopifyTheme } from "../shopify/themes";
import { bindingForDocument } from "../shopify/page-binding";

export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";

export function resolveShopifyToken(tokenEncrypted: string, encryptionKey?: string): string {
  if (encryptionKey) {
    try {
      return decryptSecret(tokenEncrypted, encryptionKey);
    } catch {
      /* injected test port: value may not be valid ciphertext */
    }
  }
  return tokenEncrypted || "test";
}

function shopHost(shop: string): string {
  return shop.replace(/^https?:\/\//, "").replace(/\/+$/, "").trim();
}

function adminHeaders(token: string): HeadersInit {
  return {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function admin(
  shop: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown> | null> {
  const url = `https://${shopHost(shop)}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...adminHeaders(token), ...init.headers },
  });
  if (!res.ok) throw new Error(`shopify ${res.status}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

async function graphql(shop: string, token: string, query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
  const payload = await admin(shop, token, "/graphql.json", { method: "POST", body: JSON.stringify({ query, variables }) });
  if (!payload || Array.isArray(payload.errors)) throw new Error("shopify graphql");
  return (payload.data ?? {}) as Record<string, unknown>;
}

function themeFiles(document: PageDocument): { key: string; value: string }[] {
  return shopifyThemeAssets(document);
}

function productPayload(document: PageDocument, pageName: string) {
  const images: { src: string }[] = [];
  for (const section of document.sections) {
    for (const value of Object.values(section.settings)) {
      if (typeof value === "string" && /^https?:\/\//.test(value) && images.length < 5) {
        images.push({ src: value });
      }
    }
  }
  const hero = document.sections.find((section) => section.type === "productHero");
  const price = hero && typeof hero.settings.price === "string" ? hero.settings.price : undefined;
  return {
    product: {
      title: pageName,
      body_html: `<p>${document.name}</p>`,
      status: "draft",
      ...(images.length ? { images } : {}),
      ...(price ? { variants: [{ price }] } : {}),
    },
  };
}

export function createShopifyPort(): ShopifyPort {
  const port: ShopifyPort = {
    async ping(shop, token) {
      await admin(shop, token, "/shop.json");
    },

    async listThemes({ shop, token }) {
      const payload = await admin(shop, token, "/themes.json");
      const themes = Array.isArray(payload?.themes) ? payload.themes : [];
      return themes.flatMap((raw) => {
        const theme = raw as { id?: unknown; name?: unknown; role?: unknown };
        return theme.id != null && typeof theme.name === "string" && ["main", "unpublished", "development", "demo"].includes(String(theme.role))
          ? [{ id: String(theme.id), name: theme.name, role: theme.role as ShopifyTheme["role"] }]
          : [];
      });
    },

    async publishEditor(input) {
      const document = input.document as EditorDocument;
      const resource = document.kind === "product" ? "product" : document.kind === "collection" ? "collection" : document.kind === "home" ? "home" : "page";
      const files = compileShopifyPage(document, { resource, replaceGlobalTemplate: input.replaceGlobalTemplate });
      const suffix = files.find((file) => file.key.startsWith(`templates/${resource}.`))?.key.match(/\.([^/.]+)\.json$/)?.[1] ?? `weflo-${document.modelId ?? "page"}`;
      const transport = {
        listThemes: () => port.listThemes!({ shop: input.shop, token: input.token }),
        createTheme: async (name: string) => {
          const payload = await admin(input.shop, input.token, "/themes.json", { method: "POST", body: JSON.stringify({ theme: { name, role: "unpublished" } }) });
          const theme = payload?.theme as { id?: unknown; name?: unknown; role?: unknown } | undefined;
          if (theme?.id == null) throw new Error("shopify theme");
          return { id: String(theme.id), name: String(theme.name ?? name), role: "unpublished" as const };
        },
        duplicateTheme: async (themeId: string, name: string) => {
          const data = await graphql(input.shop, input.token, "mutation Duplicate($id: ID!, $name: String) { themeDuplicate(id: $id, name: $name) { newTheme { id name role } userErrors { message } } }", { id: `gid://shopify/OnlineStoreTheme/${themeId}`, name });
          const result = data.themeDuplicate as { newTheme?: { id?: string; name?: string; role?: string }; userErrors?: unknown[] } | undefined;
          if (!result?.newTheme?.id || result.userErrors?.length) throw new Error("shopify theme duplicate");
          return { id: result.newTheme.id.split("/").at(-1)!, name: result.newTheme.name ?? name, role: "unpublished" as const };
        },
        readFile: async (themeId: string, key: string) => {
          try { const payload = await admin(input.shop, input.token, `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`); const asset = payload?.asset as { value?: unknown } | undefined; return typeof asset?.value === "string" ? asset.value : null; } catch { return null; }
        },
        writeFile: async (themeId: string, key: string, value: string) => { await admin(input.shop, input.token, `/themes/${themeId}/assets.json`, { method: "PUT", body: JSON.stringify({ asset: { key, value } }) }); },
        deleteFile: async (themeId: string, key: string) => { await admin(input.shop, input.token, `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`, { method: "DELETE" }); },
        bindResource: async (_themeId: string, templateSuffix: string) => {
          const binding = bindingForDocument(document, templateSuffix);
          if (!binding.create && binding.resourceId) {
            await admin(input.shop, input.token, `/${binding.resource}s/${binding.resourceId}.json`, { method: "PUT", body: JSON.stringify({ [binding.resource]: { id: binding.resourceId, template_suffix: templateSuffix } }) });
            return { resourceId: binding.resourceId };
          }
          const payload = await admin(input.shop, input.token, "/pages.json", { method: "POST", body: JSON.stringify({ page: { title: input.pageName, body_html: `<div data-wf-page="${document.modelId ?? "page"}"></div>`, published: true, template_suffix: templateSuffix } }) });
          const page = payload?.page as { id?: unknown } | undefined;
          return { resourceId: page?.id == null ? undefined : String(page.id) };
        },
      };
      const result = await publishToShopify({ strategy: input.strategy, themeId: input.themeId, files, templateSuffix: suffix, transport, shopDomain: input.shop });
      return { themeId: result.themeId, previewUrl: result.previewUrl };
    },

    async publish(input) {
      let productId: string | undefined;
      let themeId: string | undefined;
      try {
        const created = await admin(input.shop, input.token, "/products.json", {
          method: "POST",
          body: JSON.stringify(productPayload(input.document, input.pageName)),
        });
        const product = created?.product as { id?: unknown } | undefined;
        if (product?.id == null) throw new Error("shopify product");
        productId = String(product.id);

        const theme = await admin(input.shop, input.token, "/themes.json", {
          method: "POST",
          body: JSON.stringify({ theme: { name: "Weflo", role: "unpublished" } }),
        });
        const themeObj = theme?.theme as { id?: unknown } | undefined;
        if (themeObj?.id == null) throw new Error("shopify theme");
        themeId = String(themeObj.id);

        for (const file of themeFiles(input.document)) {
          await admin(input.shop, input.token, `/themes/${themeId}/assets.json`, {
            method: "PUT",
            body: JSON.stringify({ asset: { key: file.key, value: file.value } }),
          });
        }

        try {
          await admin(input.shop, input.token, "/pages.json", {
            method: "POST",
            body: JSON.stringify({
              page: {
                title: input.pageName,
                body_html: `<p>${input.document.name}</p>`,
                published: true,
                template_suffix: "weflo",
              },
            }),
          });
        } catch {
          /* write_content scope optional — theme + product already exist */
        }

        return { themeId, productId };
      } catch (err) {
        await port.rollback({ shop: input.shop, token: input.token, themeId, productId });
        throw err;
      }
    },

    async rollback(input) {
      if (input.productId) {
        try {
          await admin(input.shop, input.token, `/products/${input.productId}.json`, {
            method: "DELETE",
          });
        } catch {
          /* already removed */
        }
      }
      if (input.themeId) {
        try {
          await admin(input.shop, input.token, `/themes/${input.themeId}.json`, {
            method: "DELETE",
          });
        } catch {
          /* already removed */
        }
      }
    },
  };
  return port;
}
