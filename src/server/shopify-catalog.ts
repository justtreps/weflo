import { resolveShopifyToken } from "../lib/shopify";
import type { ShopifyCatalogProduct } from "../onboarding/types";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";

export type ShopifyCatalogResult =
  | { ok: true; shopDomain: string; products: ShopifyCatalogProduct[]; nextCursor: string | null; previousCursor: string | null }
  | { ok: false; status: 401 | 409 | 502 | 503; body: { error: string; message: string; actionUrl?: string } };

type CatalogAccess =
  | { ok: true; shopDomain: string; token: string }
  | Extract<ShopifyCatalogResult, { ok: false }>;

async function catalogAccess(deps: AppDeps, request: Request): Promise<CatalogAccess> {
  const user = await requireUser(deps, request);
  if (!user) return { ok: false, status: 401, body: { error: "unauthorized", message: "Reconnecte-toi pour accéder à Shopify." } };
  const workspace = await ensureWorkspace(deps.store, user.id);
  const connection = await deps.store.getShopify(workspace.id);
  if (!connection || connection.status !== "connected") {
    return { ok: false, status: 409, body: { error: "shopify_not_connected", message: "Aucun catalogue Shopify n’est connecté à cet espace.", actionUrl: "/boutique" } };
  }
  if (!deps.shopify?.listProducts) {
    return { ok: false, status: 503, body: { error: "shopify_catalog_unavailable", message: "Le catalogue Shopify n’est pas disponible sur cet environnement.", actionUrl: "/boutique" } };
  }
  return {
    ok: true,
    shopDomain: connection.shopDomain,
    token: resolveShopifyToken(connection.tokenEncrypted, deps.encryptionKey),
  };
}

type ShopifyCatalogListing = ShopifyCatalogProduct[] | {
  products: ShopifyCatalogProduct[];
  nextCursor: string | null;
  previousCursor: string | null;
};

function normalizeListing(listing: ShopifyCatalogListing): {
  products: ShopifyCatalogProduct[];
  nextCursor: string | null;
  previousCursor: string | null;
} {
  return Array.isArray(listing)
    ? { products: listing, nextCursor: null, previousCursor: null }
    : listing;
}

export async function loadShopifyCatalog(deps: AppDeps, request: Request, cursor: string | null = null): Promise<ShopifyCatalogResult> {
  const access = await catalogAccess(deps, request);
  if (!access.ok) return access;
  try {
    const listing = normalizeListing(await deps.shopify!.listProducts!({
      shop: access.shopDomain,
      token: access.token,
      cursor,
    }));
    return { ok: true, shopDomain: access.shopDomain, ...listing };
  } catch {
    return { ok: false, status: 502, body: { error: "shopify_catalog_failed", message: "Impossible de charger le catalogue Shopify. Vérifie la connexion puis réessaie.", actionUrl: "/boutique" } };
  }
}

export async function loadShopifyProduct(deps: AppDeps, request: Request, productId: string): Promise<
  | { ok: true; product: ShopifyCatalogProduct | null }
  | Extract<ShopifyCatalogResult, { ok: false }>
> {
  const access = await catalogAccess(deps, request);
  if (!access.ok) return access;
  try {
    if (deps.shopify?.getProduct) {
      return { ok: true, product: await deps.shopify.getProduct({
        shop: access.shopDomain,
        token: access.token,
        productId,
      }) };
    }
    const listing = normalizeListing(await deps.shopify!.listProducts!({
      shop: access.shopDomain,
      token: access.token,
    }));
    return { ok: true, product: listing.products.find((product) => product.id === productId) ?? null };
  } catch {
    return { ok: false, status: 502, body: { error: "shopify_catalog_failed", message: "Impossible de charger le catalogue Shopify. Vérifie la connexion puis réessaie.", actionUrl: "/boutique" } };
  }
}
