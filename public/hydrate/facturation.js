// src/hydrate/app-chrome.ts
var NAV_HREF = {
  Accueil: "/dashboard",
  Pages: "/dashboard",
  "Mon abonnement": "/facturation",
  Facturation: "/facturation",
  R\u00E9glages: "/facturation",
  "R\xE9glages de l'espace": "/facturation",
  "R\xE9glages du compte": "/facturation",
  "Partager et gagner": "/parrainage",
  Parrainage: "/parrainage",
  "Back to app": "/dashboard"
};
var NAV_LABELS = ["Accueil", "Mon abonnement", "Parrainage", "R\xE9glages"];
var PATH_ACTIVE = {
  "/dashboard": ["Accueil"],
  "/parrainage": ["Parrainage"],
  "/facturation": ["Mon abonnement"]
};
var MOCKUP_HREF = {
  "buildstore-parrainage.html": "/parrainage",
  "facturation.dc.html": "/facturation",
  "buildstore dashboard.dc.html": "/dashboard",
  "buildstore-dashboard.html": "/dashboard"
};
var NAV_ITEM_HREFS = ["/dashboard", "/facturation", "/parrainage", "/facturation"];
function resolveNavHref(label) {
  return NAV_HREF[label.trim()] ?? null;
}
function rewriteMockupHref(href) {
  const raw = href.trim();
  const file = raw.split(/[?#]/)[0].split("/").pop()?.toLowerCase() ?? "";
  return MOCKUP_HREF[file] ?? raw;
}
function setScIf(el, open) {
  if (!el) return;
  el.removeAttribute("hidden");
  el.style.setProperty("display", open ? "block" : "none", "important");
}
function workspaceCaption(name) {
  const title = name.trim() || "Espace";
  if (title.toLowerCase() === "espace") return { title, subtitle: "Ton espace" };
  return { title, subtitle: `Espace ${title}` };
}
function activeNavLabels(path) {
  const clean = path.split(/[?#]/)[0];
  return PATH_ACTIVE[clean] ?? [];
}
function fillProfile(me, root = document) {
  const { title, subtitle } = workspaceCaption(me.workspace.name);
  const userToggle = root.querySelector('[sc-camel-on-click="{{ toggleUser }}"]');
  const userGrid = userToggle?.querySelector("div[style*='display: grid']");
  const userSpans = userGrid?.querySelectorAll("span");
  if (userSpans?.[0]) userSpans[0].textContent = me.name?.trim() || me.email;
  if (userSpans?.[1]) userSpans[1].textContent = me.email;
  const initial = userToggle?.querySelector("span[style*='PP Editorial']");
  if (initial) initial.textContent = (me.name?.trim() || me.email).charAt(0).toUpperCase();
  const wsToggle = root.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]');
  const wsGrid = wsToggle?.querySelector("div[style*='display: grid']");
  const wsSpans = wsGrid?.querySelectorAll("span");
  if (wsSpans?.[0]) wsSpans[0].textContent = title;
  if (wsSpans?.[1]) wsSpans[1].textContent = subtitle;
  const wsMenu = root.querySelector('sc-if[value="{{ workspaceOpen }}"]');
  const wsCurrent = wsMenu?.querySelector("span[style*='flex: 1']");
  if (wsCurrent) wsCurrent.textContent = title;
  const wsNameInput = root.querySelector('[sc-camel-on-change="{{ onWsName }}"]');
  if (wsNameInput && (!wsNameInput.value || wsNameInput.value.includes("{{") || wsNameInput.value === "ACAI")) {
    wsNameInput.value = title;
  }
  const siteNameInput = root.querySelector('[sc-camel-on-change="{{ onSiteName }}"]');
  if (siteNameInput && (!siteNameInput.value || siteNameInput.value.includes("{{") || siteNameInput.value === "ACAI")) {
    siteNameInput.value = title;
  }
}
function navIfChildren(group) {
  const scoped = [...group.querySelectorAll(":scope > sc-if")];
  if (scoped.length) return scoped;
  return [...group.children].filter((el) => el.tagName.toLowerCase() === "sc-if");
}
function paintActiveNav(currentPath, root = document) {
  const wanted = new Set(activeNavLabels(currentPath));
  for (const group of root.querySelectorAll('sc-for[list="{{ navItems }}"]')) {
    const kids = navIfChildren(group);
    for (let i = 0; i + 1 < kids.length; i += 2) {
      const label = kids[i].querySelector("span")?.textContent?.trim() || kids[i + 1].querySelector("span")?.textContent?.trim() || NAV_LABELS[i / 2];
      if (!label) continue;
      const on = wanted.has(label);
      setScIf(kids[i], on);
      setScIf(kids[i + 1], !on);
    }
  }
}
function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}
async function syncReferralCard(root = document, fetchFn = fetch) {
  const card = root.querySelector('sc-if[value="{{ showReferralCard }}"]');
  if (!card) return;
  try {
    const res = await fetchFn("/api/referral");
    if (!res.ok) return;
    const data = await res.json();
    for (const el of card.querySelectorAll("span")) {
      const raw = el.textContent?.trim() ?? "";
      if (raw === "0 clic" || raw === "0 clics") {
        el.textContent = `${data.clicks} clic${data.clicks === 1 ? "" : "s"}`;
      }
      if (raw === "0,00 \u20AC") {
        el.textContent = formatUsd(data.earningsUsd);
      }
    }
  } catch {
  }
}
function applyAppChrome(me, currentPath, opts = {}) {
  const root = opts.root ?? document;
  fillProfile(me, root);
  paintActiveNav(currentPath, root);
  bindAppChrome(opts);
  void syncReferralCard(root);
}
function setOpen(el, open) {
  setScIf(el, open);
}
function isShown(el) {
  if (!el) return false;
  if (el.getAttribute("hidden") != null) return false;
  return el.style.display !== "none";
}
function bindAppChrome(opts = {}) {
  const root = opts.root ?? document;
  const go = opts.go ?? ((href) => {
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    location.assign(href);
  });
  const logout = opts.logout ?? (async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.assign("/connexion");
  });
  const workspaceMenu = root.querySelector('sc-if[value="{{ workspaceOpen }}"]');
  const userMenu = root.querySelector('sc-if[value="{{ userOpen }}"]');
  const learnMenu = root.querySelector('sc-if[value="{{ learnOpen }}"]');
  const overlay = root.querySelector('sc-if[value="{{ anyOpen }}"]');
  setOpen(workspaceMenu, false);
  setOpen(userMenu, false);
  setOpen(learnMenu, false);
  setOpen(overlay, false);
  const syncOverlay = () => {
    setOpen(overlay, isShown(workspaceMenu) || isShown(userMenu) || isShown(learnMenu));
  };
  const closeMenus = () => {
    setOpen(workspaceMenu, false);
    setOpen(userMenu, false);
    setOpen(learnMenu, false);
    setOpen(overlay, false);
  };
  overlay?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
  });
  for (const a of root.querySelectorAll("a[href]")) {
    const next = rewriteMockupHref(a.getAttribute("href") ?? "");
    if (next !== a.getAttribute("href")) a.setAttribute("href", next);
  }
  const bound = /* @__PURE__ */ new Set();
  const bindGo = (el, href) => {
    if (bound.has(el)) return;
    bound.add(el);
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      go(href);
    });
  };
  for (const el of root.querySelectorAll("span, a")) {
    const label = el.textContent?.trim() ?? "";
    const href = resolveNavHref(label);
    if (!href) continue;
    const host = el.closest("[sc-camel-on-click], a") ?? el.parentElement ?? el;
    bindGo(host, href);
  }
  root.querySelectorAll('sc-for[list="{{ navItems }}"]').forEach((group) => {
    const buttons = [...group.querySelectorAll('[sc-camel-on-click="{{ item.onClick }}"]')];
    buttons.forEach((btn, i) => {
      const href = NAV_ITEM_HREFS[Math.floor(i / 2)] ?? NAV_ITEM_HREFS[i % NAV_ITEM_HREFS.length];
      bindGo(btn, href);
    });
  });
  const toggle = (menu) => {
    const open = !isShown(menu);
    closeMenus();
    if (open) {
      setOpen(menu, true);
      setOpen(overlay, true);
    }
  };
  root.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]')?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(workspaceMenu);
    }
  );
  root.querySelector('[sc-camel-on-click="{{ toggleUser }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(userMenu);
  });
  root.querySelector('[sc-camel-on-click="{{ toggleLearn }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(learnMenu);
  });
  const expanded = root.querySelector('sc-if[value="{{ expanded }}"]');
  const collapsed = root.querySelector('sc-if[value="{{ collapsed }}"]');
  if (expanded && collapsed && !expanded.dataset.wefloCollapseBound) {
    expanded.dataset.wefloCollapseBound = "1";
    setOpen(expanded, true);
    setOpen(collapsed, false);
    for (const el of root.querySelectorAll('[sc-camel-on-click="{{ toggleCollapse }}"]')) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = isShown(expanded);
        setOpen(expanded, !open);
        setOpen(collapsed, open);
      });
    }
  }
  root.querySelector('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
  });
  for (const el of root.querySelectorAll("span")) {
    if (el.textContent?.trim() !== "Se d\xE9connecter") continue;
    const host = el.closest("div") ?? el;
    host.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void logout();
    });
  }
}

// src/hydrate/session-guard.ts
async function guardSession() {
  const res = await fetch("/api/me");
  if (res.status === 401) {
    location.assign("/connexion");
    return null;
  }
  if (!res.ok) return null;
  return await res.json();
}

// src/hydrate/facturation.ts
function shopBar() {
  return document.querySelector('[sc-camel-on-click="{{ toggleShop }}"]')?.parentElement ?? null;
}
function ctaBox() {
  return document.querySelector('[sc-camel-on-click="{{ toggleShop }}"]');
}
function badgeBox(bar) {
  return [...bar.children].find((el) => {
    if (el === ctaBox()) return false;
    if (el.dataset.wefloShopFields) return false;
    const text = el.textContent ?? "";
    return text.includes("Connected") || text.includes("Not connected") || text.includes("Invalid") || text.includes("{{ shopBadge }}");
  }) ?? null;
}
function applyBadge(box, status) {
  if (!box) return;
  const connected = status === "connected";
  const invalid = status === "invalid";
  box.style.background = connected ? "#ecfdf5" : invalid ? "#fef2f2" : "#f5f5f5";
  box.style.color = connected ? "#059669" : invalid ? "#e70044" : "#737373";
  box.style.borderColor = connected ? "rgba(5,150,105,0.3)" : invalid ? "rgba(231,0,68,0.3)" : "rgba(82,82,82,0.18)";
  const spans = [...box.querySelectorAll("span")];
  const label = spans[1] ?? spans[0];
  if (label) label.textContent = connected ? "Connected" : invalid ? "Invalid" : "Not connected";
  if (spans[0] && spans[0] !== label) {
    spans[0].style.background = connected ? "#059669" : invalid ? "#e70044" : "#737373";
  }
}
function applyCta(cta, status) {
  if (!cta) return;
  const connected = status === "connected";
  cta.style.color = connected ? "#e70044" : "#059669";
  cta.style.borderColor = connected ? "rgba(231,0,102,0.3)" : "rgba(5,150,105,0.3)";
  const label = cta.querySelector("span");
  if (label) label.textContent = connected ? "Disconnect" : "Connect";
}
function fieldsHost(bar) {
  let host = bar.querySelector("[data-weflo-shop-fields]");
  if (host) return host;
  host = document.createElement("div");
  host.dataset.wefloShopFields = "1";
  host.style.cssText = "flex:1;min-width:0;display:flex;align-items:center;gap:8px";
  const first = bar.firstElementChild;
  if (first && !first.dataset.wefloShopFields) {
    first.remove();
  }
  bar.insertBefore(host, bar.firstChild);
  return host;
}
function paintDomain(bar, status, shopDomain) {
  const host = fieldsHost(bar);
  host.replaceChildren();
  if (status === "connected") {
    const label = document.createElement("span");
    label.style.cssText = "flex:1;min-width:0;font-size:14px;color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
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
  domain.style.cssText = "flex:1;min-width:0;height:28px;border:none;outline:none;background:transparent;font-size:14px;color:#000";
  const token = document.createElement("input");
  token.id = "weflo-shop-token";
  token.type = "password";
  token.autocomplete = "new-password";
  token.placeholder = "Admin API token";
  token.value = "";
  token.style.cssText = "flex:1.2;min-width:0;height:28px;border:none;outline:none;background:transparent;font-size:14px;color:#000";
  host.append(domain, token);
}
function spanByText(text) {
  return [...document.querySelectorAll("span")].find((el) => el.textContent?.trim() === text);
}
function clickableFor(label) {
  const span = spanByText(label);
  return span?.parentElement ?? span;
}
function actionButton(label) {
  return [...document.querySelectorAll('[sc-camel-on-click="{{ act }}"]')].find(
    (el) => (el.querySelector("span")?.textContent ?? el.textContent)?.trim() === label
  );
}
async function startCheckout(workspaceId, kind, planId) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, kind, planId })
  });
  const body = await res.json().catch(() => ({}));
  if (body.url) location.assign(body.url);
}
function bindCheckout(label, workspaceId, kind, planId) {
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
    true
  );
}
function bindIf(el, handler) {
  if (!el) return;
  el.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void handler(e);
    },
    true
  );
}
function workspaceNameInput() {
  return document.querySelector('[sc-camel-on-change="{{ onWsName }}"]');
}
function workspaceNameSave() {
  const input = workspaceNameInput();
  return input?.parentElement?.querySelector('[sc-camel-on-click="{{ save }}"]') ?? null;
}
function inviteMailInput() {
  return document.querySelector('[sc-camel-on-change="{{ onInviteMail }}"]');
}
function selectedInviteRole() {
  const picked = [...document.querySelectorAll('[sc-camel-on-click="{{ r.onPick }}"]')].find((el) => {
    const bg = el.style.background;
    return bg && bg !== "transparent" && bg !== "";
  });
  const label = picked?.querySelector("span")?.textContent?.trim();
  if (label === "Owner") return "owner";
  if (label === "Viewer") return "viewer";
  if (label === "Editor" || label === "Member") return "member";
  return "member";
}
async function bindSettings(workspaceId, workspaceName) {
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
      body: JSON.stringify({ name })
    });
  });
  bindIf(actionButton("Delete Workspace"), async () => {
    if (!window.confirm("Supprimer cet espace ? Cette action est irr\xE9versible.")) return;
    const res = await fetch("/api/workspace", { method: "DELETE" });
    if (res.ok || res.status === 204) location.assign("/dashboard");
  });
  bindIf(actionButton("Delete my account"), async () => {
    if (!window.confirm("Supprimer votre compte ? Cette action est irr\xE9versible.")) return;
    const res = await fetch("/api/me", { method: "DELETE" });
    if (res.ok || res.status === 204) location.assign("/connexion");
  });
  const inviteModal = document.querySelector('sc-if[value="{{ inviteOpen }}"]');
  setScIf(inviteModal, false);
  const openInvite = () => setScIf(inviteModal, true);
  const closeInvite = () => setScIf(inviteModal, false);
  inviteModal?.querySelector(":scope > div > div")?.addEventListener("click", (e) => e.stopPropagation());
  bindIf(clickableFor("Invite member"), openInvite);
  bindIf(document.querySelector('[sc-camel-on-click="{{ openInvite }}"]'), openInvite);
  for (const el of document.querySelectorAll('[sc-camel-on-click="{{ closeInvite }}"]')) {
    bindIf(el, closeInvite);
  }
  bindIf(document.querySelector('[sc-camel-on-click="{{ invite }}"]'), async () => {
    const email = inviteMailInput()?.value.trim() ?? "";
    if (!email) return;
    await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: selectedInviteRole(), workspaceId })
    });
    closeInvite();
  });
  for (const el of document.querySelectorAll('[sc-camel-on-click="{{ r.onPick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      for (const other of document.querySelectorAll('[sc-camel-on-click="{{ r.onPick }}"]')) {
        other.style.background = "transparent";
      }
      el.style.background = "#F1F0EC";
    });
  }
}
function paintBilling(billing) {
  const tokens = {
    "{{ planName }}": billing.plan.status === "active" ? "Pro" : "Free",
    "{{ credits }}": String(billing.credits.monthlyRemaining)
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
  for (const el of document.querySelectorAll("[style*='managePayDisp']")) {
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
      true
    );
  }
}
async function hydrateFacturation() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/facturation");
  let billing = null;
  try {
    const res = await fetch("/api/billing");
    if (res.ok) billing = await res.json();
  } catch {
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
  bindIf(document.querySelector('[sc-camel-on-click="{{ copyRef }}"]'), async () => {
    try {
      await navigator.clipboard.writeText(refLink);
    } catch {
      window.prompt("Lien de parrainage", refLink);
    }
  });
  bindIf(document.querySelector('[sc-camel-on-click="{{ openRef }}"]'), () => {
    location.assign("/parrainage");
  });
  const annual = document.querySelector('[sc-camel-on-click="{{ toggleAnnual }}"]');
  let yearly = true;
  annual?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    yearly = !yearly;
    annual.style.background = yearly ? "#0084d1" : "#e5e5e5";
  });
  const setChat = (open) => {
    setScIf(document.querySelector('sc-if[value="{{ chatClosed }}"]'), !open);
    const opened = document.querySelector('sc-if[value="{{ chatOpen }}"]');
    if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
  };
  bindIf(document.querySelector('[sc-camel-on-click="{{ openChat }}"]'), () => setChat(true));
  bindIf(document.querySelector('[sc-camel-on-click="{{ closeChat }}"]'), () => setChat(false));
  bindIf(document.querySelector('[sc-camel-on-click="{{ sendChat }}"]'), async () => {
    const input = document.querySelector('input[sc-camel-on-change="{{ onChatInput }}"]');
    const prompt = input?.value.trim() ?? "";
    if (!prompt) return;
    if (input) input.value = "";
    location.assign(`/dashboard`);
  });
  bindIf(document.querySelector('[sc-camel-on-click="{{ stop }}"]'), () => {
    setChat(false);
  });
  for (const sel of [
    '[sc-camel-on-click="{{ it.onPick }}"]',
    '[sc-camel-on-click="{{ m.onOpenRole }}"]',
    '[sc-camel-on-click="{{ m.onRemove }}"]',
    '[sc-camel-on-click="{{ o.onPick }}"]',
    '[sc-camel-on-click="{{ row.onClick }}"]',
    '[sc-camel-on-click="{{ c.onPick }}"]'
  ]) {
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }
  const bar = shopBar();
  const cta = ctaBox();
  if (!bar || !cta) return;
  let current = { status: "none", shopDomain: null };
  try {
    const res = await fetch("/api/shopify");
    if (res.ok) current = await res.json();
  } catch {
  }
  const render = (next) => {
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
          const res2 = await fetch("/api/shopify/disconnect", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ workspaceId: me.workspace.id })
          });
          if (res2.ok) render({ status: "none", shopDomain: null });
          return;
        }
        const domain = document.querySelector("#weflo-shop-domain")?.value.trim() ?? "";
        const token = document.querySelector("#weflo-shop-token")?.value ?? "";
        const res = await fetch("/api/shopify/connect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId: me.workspace.id, shopDomain: domain, token })
        });
        const body = await res.json().catch(() => ({}));
        render({
          status: res.ok && body.status === "connected" ? "connected" : body.status === "invalid" ? "invalid" : "none",
          shopDomain: body.shopDomain ?? domain ?? null
        });
      } finally {
        busy = false;
      }
    },
    true
  );
}
void hydrateFacturation();
export {
  hydrateFacturation
};
