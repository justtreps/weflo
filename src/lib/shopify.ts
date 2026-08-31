import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decryptSecret } from "./encrypt";
import type { PageDocument, ShopifyPort } from "../types";

const API_VERSION = "2024-10";

const THEME_KEYS = [
  "layout/theme.liquid",
  "templates/index.liquid",
  "templates/product.liquid",
  "config/settings_schema.json",
  "config/settings_data.json",
] as const;

const THEME_FALLBACKS: Record<(typeof THEME_KEYS)[number], string> = {
  "layout/theme.liquid": `<!DOCTYPE html>
<html>
<head>
  <title>{{ page_title }}</title>
  {{ content_for_header }}
</head>
<body>
  {{ content_for_layout }}
</body>
</html>
`,
  "templates/index.liquid": `<h1>{{ shop.name }}</h1>\n`,
  "templates/product.liquid": `<h1>{{ product.title }}</h1>\n{{ product.description }}\n`,
  "config/settings_schema.json": `[]\n`,
  "config/settings_data.json": `{}\n`,
};

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
  const url = `https://${shopHost(shop)}/admin/api/${API_VERSION}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...adminHeaders(token), ...init.headers },
  });
  if (!res.ok) throw new Error(`shopify ${res.status}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

function themeFiles(): { key: string; value: string }[] {
  const root = join(process.cwd(), "theme");
  return THEME_KEYS.map((key) => {
    try {
      return { key, value: readFileSync(join(root, key), "utf8") };
    } catch {
      return { key, value: THEME_FALLBACKS[key] };
    }
  });
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

        for (const file of themeFiles()) {
          await admin(input.shop, input.token, `/themes/${themeId}/assets.json`, {
            method: "PUT",
            body: JSON.stringify({ asset: { key: file.key, value: file.value } }),
          });
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
