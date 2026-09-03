import { resolveShopifyToken } from "../lib/shopify";
import type { ShopifyCatalogProduct } from "../onboarding/types";
import type { AppDeps } from "./app";
import { ensureWorkspace, requireUser } from "./pages";

export type ShopifyCatalogResult =
  | { ok: true; shopDomain: string; products: ShopifyCatalogProduct[] }
  | { ok: false; status: 401 | 409 | 502 | 503; body: { error: string; message: string; actionUrl?: string } };

export async function loadShopifyCatalog(deps: AppDeps, request: Request): Promise<ShopifyCatalogResult> {
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
  try {
    const products = await deps.shopify.listProducts({
      shop: connection.shopDomain,
      token: resolveShopifyToken(connection.tokenEncrypted, deps.encryptionKey),
    });
    return { ok: true, shopDomain: connection.shopDomain, products };
  } catch {
    return { ok: false, status: 502, body: { error: "shopify_catalog_failed", message: "Impossible de charger le catalogue Shopify. Vérifie la connexion puis réessaie.", actionUrl: "/boutique" } };
  }
}
