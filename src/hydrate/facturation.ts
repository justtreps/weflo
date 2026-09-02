import { applyAppChrome, setScIf } from "./app-chrome";
import { guardSession } from "./session-guard";

type ShopifyPublic = {
  status: "connected" | "invalid" | "none";
  shopDomain: string | null;
};

type BillingPublic = {
  plan: { status: "none" | "active" | "inactive"; planId: string | null };
  credits: { monthlyRemaining: number; purchasedRemaining: number };
  manageUrl: string | null;
  catalog: { starter: string | null; pro: string | null; credits: string | null };
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

function spanByText(text: string): HTMLElement | undefined {
  return [...document.querySelectorAll("span")].find((el) => el.textContent?.trim() === text) as
    | HTMLElement
    | undefined;
}

function clickableFor(label: string): HTMLElement | undefined {
  const span = spanByText(label);
  return (span?.parentElement as HTMLElement | undefined) ?? span;
}

function actionButton(label: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ act }}"]')].find(
    (el) => (el.querySelector("span")?.textContent ?? el.textContent)?.trim() === label,
  );
}

async function startCheckout(workspaceId: string, kind: "subscription" | "credits", planId: string) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, kind, planId }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string };
  if (body.url) location.assign(body.url);
}

function bindCheckout(label: string, workspaceId: string, kind: "subscription" | "credits", planId: string | null) {
  if (!planId) return;
  const el = clickableFor(label);
  if (!el) return;
  el.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      await startCheckout(workspaceId, kind, planId);
    },
    true,
  );
}

function bindIf(
  el: HTMLElement | null | undefined,
  handler: (e: Event) => void | Promise<void>,
) {
  if (!el) return;
  el.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void handler(e);
    },
    true,
  );
}

function workspaceNameInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('[sc-camel-on-change="{{ onWsName }}"]');
}

function workspaceNameSave(): HTMLElement | null {
  const input = workspaceNameInput();
  return input?.parentElement?.querySelector<HTMLElement>('[sc-camel-on-click="{{ save }}"]') ?? null;
}

function inviteMailInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('[sc-camel-on-change="{{ onInviteMail }}"]');
}

function selectedInviteRole(): string {
  const picked = [...document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ r.onPick }}"]')].find((el) => {
    const bg = el.style.background;
    return bg && bg !== "transparent" && bg !== "";
  });
  const label = picked?.querySelector("span")?.textContent?.trim();
  if (label === "Owner") return "owner";
  if (label === "Viewer") return "viewer";
  if (label === "Editor" || label === "Member") return "member";
  return "member";
}

async function bindSettings(workspaceId: string, workspaceName: string) {
  const nameInput = workspaceNameInput();
  if (nameInput && !nameInput.dataset.wefloBound) {
    nameInput.dataset.wefloBound = "1";
    if (!nameInput.value || nameInput.value.includes("{{")) nameInput.value = workspaceName;
  }
  bindIf(workspaceNameSave(), async () => {
    const name = workspaceNameInput()?.value.trim() ?? "";
    if (!name) return;
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  });

  bindIf(actionButton("Delete Workspace"), async () => {
    if (!window.confirm("Supprimer cet espace ? Cette action est irréversible.")) return;
    const res = await fetch("/api/workspace", { method: "DELETE" });
    if (res.ok || res.status === 204) location.assign("/dashboard");
  });

  bindIf(actionButton("Delete my account"), async () => {
    if (!window.confirm("Supprimer votre compte ? Cette action est irréversible.")) return;
    const res = await fetch("/api/me", { method: "DELETE" });
    if (res.ok || res.status === 204) location.assign("/connexion");
  });

  const inviteModal = document.querySelector<HTMLElement>('sc-if[value="{{ inviteOpen }}"]');
  setScIf(inviteModal, false);
  const openInvite = () => setScIf(inviteModal, true);
  const closeInvite = () => setScIf(inviteModal, false);
  inviteModal?.querySelector(":scope > div > div")?.addEventListener("click", (e) => e.stopPropagation());
  bindIf(clickableFor("Invite member"), openInvite);
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ openInvite }}"]'), openInvite);
  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ closeInvite }}"]')) {
    bindIf(el, closeInvite);
  }

  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ invite }}"]'), async () => {
    const email = inviteMailInput()?.value.trim() ?? "";
    if (!email) return;
    await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: selectedInviteRole(), workspaceId }),
    });
    closeInvite();
  });

  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ r.onPick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      for (const other of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ r.onPick }}"]')) {
        other.style.background = "transparent";
      }
      el.style.background = "#F1F0EC";
    });
  }
}

function paintBilling(billing: BillingPublic) {
  const tokens: Record<string, string> = {
    "{{ planName }}": billing.plan.status === "active" ? "Pro" : "Free",
    "{{ credits }}": String(billing.credits.monthlyRemaining),
  };
  for (const el of document.querySelectorAll("span")) {
    const key = el.textContent?.trim() ?? "";
    if (key in tokens) el.textContent = tokens[key];
  }

  const addCredits = spanByText("Add Credits");
  const purchased = addCredits?.parentElement?.previousElementSibling;
  if (purchased && purchased.tagName === "SPAN") {
    purchased.textContent = String(billing.credits.purchasedRemaining);
  }

  for (const el of document.querySelectorAll<HTMLElement>("[style*='managePayDisp']")) {
    el.style.display = billing.manageUrl ? "flex" : "none";
  }

  const manage = clickableFor("Manage Payments");
  if (manage) {
    manage.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (billing.manageUrl) window.open(billing.manageUrl, "_blank", "noopener");
      },
      true,
    );
  }
}

export async function hydrateFacturation() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/facturation");

  let billing: BillingPublic | null = null;
  try {
    const res = await fetch("/api/billing");
    if (res.ok) billing = (await res.json()) as BillingPublic;
  } catch {
    /* keep default */
  }
  if (billing) {
    paintBilling(billing);
    bindCheckout("Add Credits", me.workspace.id, "credits", billing.catalog.credits);
    bindCheckout("Choose a plan", me.workspace.id, "subscription", billing.catalog.starter);
    bindCheckout("Upgrade", me.workspace.id, "subscription", billing.catalog.pro);
    bindCheckout("Upgrade to Pro", me.workspace.id, "subscription", billing.catalog.pro);
    bindCheckout("Update to Annual", me.workspace.id, "subscription", billing.catalog.starter);
  }

  await bindSettings(me.workspace.id, me.workspace.name);

  const refLink = `${location.origin}/parrainage`;
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ copyRef }}"]'), async () => {
    try {
      await navigator.clipboard.writeText(refLink);
    } catch {
      window.prompt("Lien de parrainage", refLink);
    }
  });
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ openRef }}"]'), () => {
    location.assign("/parrainage");
  });

  const annual = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleAnnual }}"]');
  let yearly = true;
  annual?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    yearly = !yearly;
    annual.style.background = yearly ? "#0084d1" : "#e5e5e5";
  });

  const setChat = (open: boolean) => {
    setScIf(document.querySelector<HTMLElement>('sc-if[value="{{ chatClosed }}"]'), !open);
    const opened = document.querySelector<HTMLElement>('sc-if[value="{{ chatOpen }}"]');
    if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
  };
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ openChat }}"]'), () => setChat(true));
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ closeChat }}"]'), () => setChat(false));
  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ sendChat }}"]'), async () => {
    const input = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onChatInput }}"]');
    const prompt = input?.value.trim() ?? "";
    if (!prompt) return;
    if (input) input.value = "";
    location.assign(`/dashboard`);
  });

  bindIf(document.querySelector<HTMLElement>('[sc-camel-on-click="{{ stop }}"]'), () => {
    setChat(false);
  });
  for (const sel of [
    '[sc-camel-on-click="{{ it.onPick }}"]',
    '[sc-camel-on-click="{{ m.onOpenRole }}"]',
    '[sc-camel-on-click="{{ m.onRemove }}"]',
    '[sc-camel-on-click="{{ o.onPick }}"]',
    '[sc-camel-on-click="{{ row.onClick }}"]',
    '[sc-camel-on-click="{{ c.onPick }}"]',
  ]) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

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
