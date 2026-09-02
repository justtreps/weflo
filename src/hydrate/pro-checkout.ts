type BillingPayload = { workspace?: { id?: unknown }; catalog?: { pro?: unknown } };

async function responseJson(response: Response, context: string): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(context);
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    throw new Error(context);
  }
}

export async function createProCheckout(fetchImpl: typeof fetch = fetch): Promise<string> {
  const billingResponse = await fetchImpl("/api/billing");
  const billing = await responseJson(billingResponse, "Impossible de charger la facturation.") as BillingPayload;
  const workspaceId = typeof billing.workspace?.id === "string" ? billing.workspace.id : "";
  const planId = typeof billing.catalog?.pro === "string" ? billing.catalog.pro : "";
  if (!workspaceId || !planId) throw new Error("L’offre Pro n’est pas encore disponible.");

  const checkoutResponse = await fetchImpl("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, kind: "subscription", planId }),
  });
  const checkout = await responseJson(checkoutResponse, "Impossible d’ouvrir le paiement.");
  const rawUrl = typeof checkout.url === "string" ? checkout.url : "";
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("Le lien de paiement reçu est invalide."); }
  if (url.protocol !== "https:" || (url.hostname !== "whop.com" && !url.hostname.endsWith(".whop.com"))) {
    throw new Error("Le lien de paiement reçu est invalide.");
  }
  return url.toString();
}
