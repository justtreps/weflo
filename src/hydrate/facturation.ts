import { guardSession } from "./session-guard";

type ShopifyPublic = {
  status: "connected" | "invalid" | "none";
  shopDomain: string | null;
};

function shopBar(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleShop }}"]')?.parentElement ?? null;
}

function ctaBox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleShop }}"]');
}

function badgeBox(bar: HTMLElement): HTMLElement | null {
  return (
    [...bar.children].find((el) => {
      if (el === ctaBox()) return false;
      if ((el as HTMLElement).dataset.wefloShopFields) return false;
      const text = el.textContent ?? "";
      return (
        text.includes("Connected") ||
        text.includes("Not connected") ||
        text.includes("Invalid") ||
        text.includes("{{ shopBadge }}")
      );
    }) as HTMLElement | undefined
  ) ?? null;
}

function applyBadge(box: HTMLElement | null, status: ShopifyPublic["status"]) {
  if (!box) return;
  const connected = status === "connected";
  const invalid = status === "invalid";
  box.style.background = connected ? "#ecfdf5" : invalid ? "#fef2f2" : "#f5f5f5";
  box.style.color = connected ? "#059669" : invalid ? "#e70044" : "#737373";
  box.style.borderColor = connected
    ? "rgba(5,150,105,0.3)"
    : invalid
      ? "rgba(231,0,68,0.3)"
      : "rgba(82,82,82,0.18)";
  const spans = [...box.querySelectorAll("span")];
  const label = spans[1] ?? spans[0];
  if (label) label.textContent = connected ? "Connected" : invalid ? "Invalid" : "Not connected";
  if (spans[0] && spans[0] !== label) {
    spans[0].style.background = connected ? "#059669" : invalid ? "#e70044" : "#737373";
  }
}

function applyCta(cta: HTMLElement | null, status: ShopifyPublic["status"]) {
  if (!cta) return;
  const connected = status === "connected";
  cta.style.color = connected ? "#e70044" : "#059669";
  cta.style.borderColor = connected ? "rgba(231,0,102,0.3)" : "rgba(5,150,105,0.3)";
  const label = cta.querySelector("span");
  if (label) label.textContent = connected ? "Disconnect" : "Connect";
}

function fieldsHost(bar: HTMLElement): HTMLElement {
  let host = bar.querySelector<HTMLElement>("[data-weflo-shop-fields]");
  if (host) return host;
  host = document.createElement("div");
  host.dataset.wefloShopFields = "1";
  host.style.cssText = "flex:1;min-width:0;display:flex;align-items:center;gap:8px";

  const first = bar.firstElementChild as HTMLElement | null;
  if (first && !first.dataset.wefloShopFields) {
    first.remove();
  }
  bar.insertBefore(host, bar.firstChild);
  return host;
}

function paintDomain(bar: HTMLElement, status: ShopifyPublic["status"], shopDomain: string | null) {
  const host = fieldsHost(bar);
  host.replaceChildren();

  if (status === "connected") {
    const label = document.createElement("span");
    label.style.cssText =
      "flex:1;min-width:0;font-size:14px;color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    label.textContent = shopDomain ?? "";
    host.append(label);
    return;
  }

  const domain = document.createElement("input");
  domain.id = "weflo-shop-domain";
  domain.type = "text";
  domain.autocomplete = "off";
  domain.placeholder = "boutique.myshopify.com";
  domain.value = shopDomain ?? "";
  domain.style.cssText =
    "flex:1;min-width:0;height:28px;border:none;outline:none;background:transparent;font-size:14px;color:#000";

  const token = document.createElement("input");
  token.id = "weflo-shop-token";
  token.type = "password";
  token.autocomplete = "new-password";
  token.placeholder = "Admin API token";
  token.value = "";
  token.style.cssText =
    "flex:1.2;min-width:0;height:28px;border:none;outline:none;background:transparent;font-size:14px;color:#000";

  host.append(domain, token);
}

export async function hydrateFacturation() {
  const me = await guardSession();
  if (!me) return;

  const bar = shopBar();
  const cta = ctaBox();
  if (!bar || !cta) return;

  let current: ShopifyPublic = { status: "none", shopDomain: null };
  try {
    const res = await fetch("/api/shopify");
    if (res.ok) current = (await res.json()) as ShopifyPublic;
  } catch {
    /* keep default */
  }

  const render = (next: ShopifyPublic) => {
    current = next;
    paintDomain(bar, next.status, next.shopDomain);
    applyBadge(badgeBox(bar), next.status);
    applyCta(cta, next.status);
  };

  render(current);

  let busy = false;
  cta.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      try {
        if (current.status === "connected") {
          const res = await fetch("/api/shopify/disconnect", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ workspaceId: me.workspace.id }),
          });
          if (res.ok) render({ status: "none", shopDomain: null });
          return;
        }
        const domain = document.querySelector<HTMLInputElement>("#weflo-shop-domain")?.value.trim() ?? "";
        const token = document.querySelector<HTMLInputElement>("#weflo-shop-token")?.value ?? "";
        const res = await fetch("/api/shopify/connect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId: me.workspace.id, shopDomain: domain, token }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          status?: string;
          shopDomain?: string;
        };
        render({
          status: res.ok && body.status === "connected" ? "connected" : body.status === "invalid" ? "invalid" : "none",
          shopDomain: body.shopDomain ?? domain ?? null,
        });
      } finally {
        busy = false;
      }
    },
    true,
  );
}

void hydrateFacturation();
