import { createHmac, timingSafeEqual } from "node:crypto";
import Whop from "@whop/sdk";
import type { Store } from "../repos/types";
import type { WhopLink, WhopPort } from "../types";

export type WhopEvent = { type: string; data: Record<string, unknown> };

export function assertReferralAllowed(referrerWs: string, refereeWs: string): void {
  if (referrerWs === refereeWs) throw new Error("self-referral");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function metadataOf(data: Record<string, unknown>): Record<string, unknown> {
  return asRecord(data.metadata);
}

function workspaceIdOf(data: Record<string, unknown>): string | null {
  return asString(metadataOf(data).workspace_id) ?? asString(data.workspace_id);
}

function planIdOf(data: Record<string, unknown>): string | null {
  return asString(data.plan_id) ?? asString(asRecord(data.plan).id);
}

function manageUrlOf(data: Record<string, unknown>): string | null {
  const explicit = asString(data.manage_url);
  if (explicit) return explicit;
  const id = asString(data.id);
  return id ? `https://whop.com/billing/manage/${id}` : null;
}

async function currentLink(store: Store, workspaceId: string): Promise<WhopLink> {
  const existing = await store.getWhop(workspaceId);
  return (
    existing ?? {
      workspaceId,
      membershipId: null,
      planId: null,
      status: "none",
      manageUrl: null,
      affiliateId: null,
    }
  );
}

export async function applyWhopEvent(store: Store, event: WhopEvent): Promise<void> {
  const data = asRecord(event.data);
  const workspaceId = workspaceIdOf(data);
  if (!workspaceId) return;

  const meta = metadataOf(data);
  const kind = asString(meta.kind);

  if (event.type === "membership.activated") {
    const prev = await currentLink(store, workspaceId);
    await store.saveWhop({
      workspaceId,
      membershipId: asString(data.id) ?? prev.membershipId,
      planId: planIdOf(data) ?? prev.planId,
      status: "active",
      manageUrl: manageUrlOf(data) ?? prev.manageUrl,
      affiliateId: prev.affiliateId,
      lastAffiliateStats: prev.lastAffiliateStats,
    });
    return;
  }

  if (event.type === "payment.succeeded") {
    if (kind === "credits") {
      const n = Number(meta.credits);
      if (Number.isFinite(n) && n > 0) {
        const ledger = await store.getCredits(workspaceId);
        await store.saveCredits({
          ...ledger,
          purchasedRemaining: ledger.purchasedRemaining + n,
        });
      }
    }
    return;
  }

  if (
    event.type === "payment.failed" ||
    event.type === "membership.deactivated" ||
    event.type === "membership.inactive"
  ) {
    const prev = await currentLink(store, workspaceId);
    await store.saveWhop({
      ...prev,
      workspaceId,
      membershipId: asString(data.id) ?? prev.membershipId,
      status: "inactive",
    });
  }
}

export function checkoutRedirectUrl(publicAppUrl: string | undefined): string | null {
  if (!publicAppUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(publicAppUrl);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const allowHttp = process.env.WHOP_ALLOW_HTTP === "1";
  if (parsed.protocol !== "https:" && !(local && allowHttp)) return null;
  return `${publicAppUrl.replace(/\/$/, "")}/facturation`;
}

function header(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

function verifyHmac(rawBody: string, headers: Headers, secret: string): void {
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signature = header(headers, "webhook-signature");
  if (!id || !timestamp || !signature) throw new Error("bad sig");
  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const ok = signature.split(/\s+/).some((part) => {
    const hash = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
    try {
      const got = Buffer.from(hash);
      return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
    } catch {
      return false;
    }
  });
  if (!ok) throw new Error("bad sig");
}

function absolutePurchaseUrl(url: string, promoCode?: string): string {
  const absolute = url.startsWith("/") ? `https://whop.com${url}` : url;
  if (!promoCode) return absolute;
  try {
    const parsed = new URL(absolute);
    parsed.searchParams.set("promoCode", promoCode);
    return parsed.toString();
  } catch {
    return absolute;
  }
}

export function createWhopPort(): WhopPort | undefined {
  const apiKey = process.env.WHOP_API_KEY?.trim();
  if (!apiKey) return undefined;

  const client = new Whop({ apiKey, logLevel: "off" });

  return {
    async createCheckout(input) {
      const created = await client.checkoutConfigurations.create({
        plan_id: input.planId,
        redirect_url: input.redirectUrl,
        metadata: input.metadata,
        affiliate_code: input.affiliateCode ?? null,
      });
      return { purchaseUrl: absolutePurchaseUrl(created.purchase_url, input.promoCode) };
    },

    verifyWebhook(rawBody, headers) {
      const secret = process.env.WHOP_WEBHOOK_SECRET?.trim();
      if (!secret) throw new Error("webhook secret");
      verifyHmac(rawBody, headers, secret);
      const parsed = JSON.parse(rawBody) as { type?: unknown; data?: unknown };
      return {
        type: typeof parsed.type === "string" ? parsed.type : "",
        data: asRecord(parsed.data),
      };
    },
  };
}
