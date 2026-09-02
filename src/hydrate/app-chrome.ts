import type { MeProfile } from "./session-guard";

const NAV_HREF: Record<string, string> = {
  Pages: "/dashboard",
  "Mon abonnement": "/facturation",
  Facturation: "/facturation",
  Réglages: "/facturation",
  "Réglages de l'espace": "/facturation",
  "Réglages du compte": "/facturation",
  "Partager et gagner": "/parrainage",
  Parrainage: "/parrainage",
  "Back to app": "/dashboard",
};

const NAV_LABELS = ["Pages", "Mon abonnement", "Parrainage", "Réglages"] as const;

const PATH_ACTIVE: Record<string, string[]> = {
  "/dashboard": ["Pages"],
  "/parrainage": ["Parrainage"],
  "/facturation": ["Mon abonnement"],
};

const MOCKUP_HREF: Record<string, string> = {
  "buildstore-parrainage.html": "/parrainage",
  "facturation.dc.html": "/facturation",
  "buildstore dashboard.dc.html": "/dashboard",
  "buildstore-dashboard.html": "/dashboard",
};

const NAV_ITEM_HREFS = ["/dashboard", "/facturation", "/parrainage", "/facturation"];

export function resolveNavHref(label: string): string | null {
  return NAV_HREF[label.trim()] ?? null;
}

export function rewriteMockupHref(href: string): string {
  const raw = href.trim();
  const file = raw.split(/[?#]/)[0].split("/").pop()?.toLowerCase() ?? "";
  return MOCKUP_HREF[file] ?? raw;
}

type ChromeOpts = {
  root?: ParentNode;
  go?: (href: string) => void;
  logout?: () => Promise<void> | void;
};

export function setScIf(el: HTMLElement | null, open: boolean) {
  if (!el) return;
  el.removeAttribute("hidden");
  el.style.setProperty("display", open ? "block" : "none", "important");
}

export function workspaceCaption(name: string): { title: string; subtitle: string } {
  const title = name.trim() || "Espace";
  if (title.toLowerCase() === "espace") return { title, subtitle: "Ton espace" };
  return { title, subtitle: `Espace ${title}` };
}

export function activeNavLabels(path: string): string[] {
  const clean = path.split(/[?#]/)[0];
  return PATH_ACTIVE[clean] ?? [];
}

export function fillProfile(me: MeProfile, root: ParentNode = document) {
  const { title, subtitle } = workspaceCaption(me.workspace.name);

  const userToggle = root.querySelector('[sc-camel-on-click="{{ toggleUser }}"]');
  const userGrid = userToggle?.querySelector("div[style*='display: grid']");
  const userSpans = userGrid?.querySelectorAll("span");
  if (userSpans?.[0]) userSpans[0].textContent = me.name?.trim() || me.email;
  if (userSpans?.[1]) userSpans[1].textContent = me.email;
  const initial = userToggle?.querySelector<HTMLElement>("span[style*='PP Editorial']");
  if (initial) initial.textContent = (me.name?.trim() || me.email).charAt(0).toUpperCase();

  const wsToggle = root.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]');
  const wsGrid = wsToggle?.querySelector("div[style*='display: grid']");
  const wsSpans = wsGrid?.querySelectorAll("span");
  if (wsSpans?.[0]) wsSpans[0].textContent = title;
  if (wsSpans?.[1]) wsSpans[1].textContent = subtitle;
  const wsMenu = root.querySelector('sc-if[value="{{ workspaceOpen }}"]');
  const wsCurrent = wsMenu?.querySelector<HTMLElement>("span[style*='flex: 1']");
  if (wsCurrent) wsCurrent.textContent = title;

  const wsNameInput = root.querySelector<HTMLInputElement>('[sc-camel-on-change="{{ onWsName }}"]');
  if (wsNameInput && (!wsNameInput.value || wsNameInput.value.includes("{{") || wsNameInput.value === "ACAI")) {
    wsNameInput.value = title;
  }
  const siteNameInput = root.querySelector<HTMLInputElement>('[sc-camel-on-change="{{ onSiteName }}"]');
  if (siteNameInput && (!siteNameInput.value || siteNameInput.value.includes("{{") || siteNameInput.value === "ACAI")) {
    siteNameInput.value = title;
  }
}

function navIfChildren(group: Element): HTMLElement[] {
  const scoped = [...group.querySelectorAll(":scope > sc-if")] as HTMLElement[];
  if (scoped.length) return scoped;
  return [...group.children].filter((el) => el.tagName.toLowerCase() === "sc-if") as HTMLElement[];
}

export function paintActiveNav(currentPath: string, root: ParentNode = document) {
  const wanted = new Set(activeNavLabels(currentPath));
  for (const group of root.querySelectorAll('sc-for[list="{{ navItems }}"]')) {
    const kids = navIfChildren(group);
    for (let i = 0; i + 1 < kids.length; i += 2) {
      const label =
        kids[i].querySelector("span")?.textContent?.trim() ||
        kids[i + 1].querySelector("span")?.textContent?.trim() ||
        NAV_LABELS[i / 2];
      if (!label) continue;
      const on = wanted.has(label);
      setScIf(kids[i], on);
      setScIf(kids[i + 1], !on);
    }
  }
}

type ReferralCard = {
  earningsUsd: string;
  referrals: number;
  clicks: number;
};

function formatUsd(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export async function syncReferralCard(root: ParentNode = document, fetchFn: typeof fetch = fetch) {
  const card = root.querySelector('sc-if[value="{{ showReferralCard }}"]');
  if (!card) return;
  try {
    const res = await fetchFn("/api/referral");
    if (!res.ok) return;
    const data = (await res.json()) as ReferralCard;
    for (const el of card.querySelectorAll("span")) {
      const raw = el.textContent?.trim() ?? "";
      if (raw === "0 clic" || raw === "0 clics") {
        el.textContent = `${data.clicks} clic${data.clicks === 1 ? "" : "s"}`;
      }
      if (raw === "0,00 €") {
        el.textContent = formatUsd(data.earningsUsd);
      }
    }
  } catch {
    /* keep placeholders */
  }
}

export function applyAppChrome(me: MeProfile, currentPath: string, opts: ChromeOpts = {}) {
  const root = opts.root ?? document;
  fillProfile(me, root);
  paintActiveNav(currentPath, root);
  bindAppChrome(opts);
  void syncReferralCard(root);
}

function setOpen(el: HTMLElement | null, open: boolean) {
  setScIf(el, open);
}

function isShown(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.getAttribute("hidden") != null) return false;
  return el.style.display !== "none";
}

export function bindAppChrome(opts: ChromeOpts = {}) {
  const root = opts.root ?? document;
  const go = opts.go ?? ((href) => {
    if (/^https?:\/\//i.test(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    location.assign(href);
  });
  const logout =
    opts.logout ??
    (async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      location.assign("/connexion");
    });

  const workspaceMenu = root.querySelector<HTMLElement>('sc-if[value="{{ workspaceOpen }}"]');
  const userMenu = root.querySelector<HTMLElement>('sc-if[value="{{ userOpen }}"]');
  const learnMenu = root.querySelector<HTMLElement>('sc-if[value="{{ learnOpen }}"]');
  const overlay = root.querySelector<HTMLElement>('sc-if[value="{{ anyOpen }}"]');

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

  const bound = new Set<HTMLElement>();

  const bindGo = (el: HTMLElement, href: string) => {
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
    const host =
      el.closest<HTMLElement>("[sc-camel-on-click], a") ??
      (el.parentElement as HTMLElement | null) ??
      (el as HTMLElement);
    bindGo(host, href);
  }

  root.querySelectorAll('sc-for[list="{{ navItems }}"]').forEach((group) => {
    const buttons = [...group.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ item.onClick }}"]')];
    buttons.forEach((btn, i) => {
      const href = NAV_ITEM_HREFS[Math.floor(i / 2)] ?? NAV_ITEM_HREFS[i % NAV_ITEM_HREFS.length];
      bindGo(btn, href);
    });
  });

  const toggle = (menu: HTMLElement | null) => {
    const open = !isShown(menu);
    closeMenus();
    if (open) {
      setOpen(menu, true);
      setOpen(overlay, true);
    }
  };

  root.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleWorkspace }}"]')?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(workspaceMenu);
    },
  );
  root.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleUser }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(userMenu);
  });
  root.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleLearn }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(learnMenu);
  });

  const expanded = root.querySelector<HTMLElement>('sc-if[value="{{ expanded }}"]');
  const collapsed = root.querySelector<HTMLElement>('sc-if[value="{{ collapsed }}"]');
  if (expanded && collapsed && !expanded.dataset.wefloCollapseBound) {
    expanded.dataset.wefloCollapseBound = "1";
    setOpen(expanded, true);
    setOpen(collapsed, false);
    for (const el of root.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ toggleCollapse }}"]')) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = isShown(expanded);
        setOpen(expanded, !open);
        setOpen(collapsed, open);
      });
    }
  }

  root.querySelector<HTMLElement>('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
  });

  for (const el of root.querySelectorAll("span")) {
    if (el.textContent?.trim() !== "Se déconnecter") continue;
    const host = el.closest("div") ?? el;
    host.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void logout();
    });
  }
}
