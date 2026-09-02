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

// src/hydrate/parrainage.ts
function formatUsd2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}
async function hydrateParrainage() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/parrainage");
  const fallback = `${location.origin}/r/${me.workspace.slug}`;
  let data = null;
  try {
    const res = await fetch("/api/referral");
    if (res.ok) data = await res.json();
  } catch {
  }
  const link = data?.link?.startsWith("http") ? data.link : fallback;
  for (const el of document.querySelectorAll("span")) {
    const raw = el.textContent?.trim() ?? "";
    if (raw === "{{ link }}" || raw.startsWith("buildstore.app/r/")) {
      el.textContent = link;
    }
    if (raw === "{{ clicksLabel }}" && data) {
      el.textContent = `${data.clicks} clics \xB7 ${data.referrals} inscriptions`;
    }
    if (raw === "{{ copyLabel }}") el.textContent = "Copier le lien";
  }
  const emptyBits = [...document.querySelectorAll("span")];
  if (data) {
    for (const el of emptyBits) {
      const raw = el.textContent?.trim() ?? "";
      if (raw === "0 clic" || raw === "0 clics") el.textContent = `${data.clicks} clic${data.clicks === 1 ? "" : "s"}`;
      if (raw === "0 inscription" || raw === "0 inscriptions") {
        el.textContent = `${data.referrals} inscription${data.referrals === 1 ? "" : "s"}`;
      }
      if (raw === "0,00 \u20AC gagn\xE9s") el.textContent = `${formatUsd2(data.earningsUsd)} gagn\xE9s`;
    }
    const valueSpans = document.querySelectorAll('sc-for[list="{{ stats }}"] span[style*="26px"]');
    const values = [
      formatUsd2(data.earningsUsd),
      formatUsd2(data.earningsUsd),
      String(data.referrals),
      data.clicks > 0 ? `${(data.referrals / data.clicks * 100).toFixed(1).replace(".", ",")} %` : "0 %"
    ];
    valueSpans.forEach((el, i) => {
      if (values[i] != null) el.textContent = values[i];
    });
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Lien de parrainage", link);
    }
  };
  for (const btn of document.querySelectorAll('[sc-camel-on-click="{{ copyLink }}"]')) {
    btn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        await copy();
        const label = btn.querySelector("span");
        if (label) {
          label.textContent = "Lien copi\xE9";
          window.setTimeout(() => {
            label.textContent = "Copier le lien";
          }, 1800);
        }
      },
      true
    );
  }
  const shareByLabel = {
    "E-mail": () => {
      location.assign(`mailto:?subject=${encodeURIComponent("Rejoins Weflo")}&body=${encodeURIComponent(link)}`);
    },
    Discord: () => {
      void copy();
    },
    "Afficher le code QR": () => {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  const setChat = (open) => {
    setScIf(document.querySelector('sc-if[value="{{ chatClosed }}"]'), !open);
    const opened = document.querySelector('sc-if[value="{{ chatOpen }}"]');
    if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
  };
  const greeting = document.querySelector('sc-for[list="{{ chatMsgs }}"] div');
  if (greeting) {
    greeting.textContent = "Je t'aide sur tes pages boutique. Ouvre tes pages pour coder ou modifier une page.";
    if (!greeting.parentElement?.querySelector("[data-weflo-pages-link]")) {
      const link2 = document.createElement("a");
      link2.dataset.wefloPagesLink = "1";
      link2.href = "/dashboard";
      link2.textContent = "Ouvrir mes pages";
      link2.style.cssText = "display:inline-block;margin-top:8px;color:#141310;font-weight:600";
      greeting.parentElement?.appendChild(link2);
    }
  }
  document.querySelector('[sc-camel-on-click="{{ openChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(true);
  });
  document.querySelector('[sc-camel-on-click="{{ closeChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(false);
  });
  const goPages = (e) => {
    e.preventDefault();
    location.assign("/dashboard");
  };
  document.querySelector('[sc-camel-on-click="{{ sendChat }}"]')?.addEventListener("click", goPages);
  document.querySelector('input[sc-camel-on-change="{{ onChatInput }}"]')?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      goPages(e);
    }
  );
  document.querySelector('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(false);
  });
  for (const el of document.querySelectorAll('[sc-camel-on-click="{{ f.onPick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void copy();
    });
  }
  for (const el of document.querySelectorAll('[sc-camel-on-click="{{ c.onPick }}"]')) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const action = shareByLabel[label];
    if (!action) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    });
  }
}
void hydrateParrainage();
export {
  hydrateParrainage
};
