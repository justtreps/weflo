import { guardSession, type MeProfile } from "./session-guard";
import type { Page, PageType, Workspace } from "../types";

const TYPE_LABEL: Record<PageType, string> = {
  sell: "Page produit",
  write: "Article de blog",
  blank: "Page vierge",
};

const DEFAULT_NAME: Record<PageType, string> = {
  sell: "Page produit",
  write: "Article de blog",
  blank: "Page vierge",
};

type PagesPayload = { workspace: Workspace; pages: Page[] };

function byText(tag: string, text: string): HTMLElement | undefined {
  return [...document.querySelectorAll(tag)].find((el) => el.textContent?.trim() === text) as
    | HTMLElement
    | undefined;
}

function formatEdited(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "il y a 1 h" : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function showToast(text: string, href?: string) {
  const toastIf = document.querySelector<HTMLElement>('sc-if[value="{{ toastOn }}"]');
  const box = toastIf?.querySelector("div");
  const label = box?.querySelectorAll("span")[1];
  if (label) label.textContent = text;
  toastIf?.querySelector("[data-credits-cta]")?.remove();
  if (href && box) {
    const link = document.createElement("a");
    link.dataset.creditsCta = "1";
    link.href = href;
    link.textContent = "Add Credits";
    link.style.color = "#FBC531";
    box.appendChild(link);
  }
  if (toastIf) toastIf.style.display = "block";
  window.setTimeout(() => {
    if (toastIf) toastIf.style.display = "none";
  }, href ? 3600 : 2200);
}

function setChatOpen(open: boolean) {
  const closed = document.querySelector<HTMLElement>('sc-if[value="{{ chatClosed }}"]');
  const opened = document.querySelector<HTMLElement>('sc-if[value="{{ chatOpen }}"]');
  if (closed) closed.style.display = open ? "none" : "";
  if (opened) opened.style.display = open ? "flex" : "none";
}

function appendChat(text: string, mine: boolean) {
  const list = document.querySelector('sc-for[list="{{ chatMsgs }}"]');
  if (!list) return;
  const row = document.createElement("div");
  row.style.cssText = `display:flex;align-items:flex-end;gap:8px;justify-content:${mine ? "flex-end" : "flex-start"}`;
  const bubble = document.createElement("div");
  bubble.textContent = text;
  bubble.style.cssText = mine
    ? "max-width:78%;padding:10px 13px;box-sizing:border-box;border-radius:14px;background:#141310;color:#fff;font-size:14px;line-height:20px"
    : "max-width:78%;padding:10px 13px;box-sizing:border-box;border-radius:14px;background:#fff;color:#404040;border:0.5px solid rgba(82,82,82,0.22);font-size:14px;line-height:20px";
  row.appendChild(bubble);
  list.appendChild(row);
}

function fillProfile(me: MeProfile) {
  const userToggle = document.querySelector('[sc-camel-on-click="{{ toggleUser }}"]');
  const userGrid = userToggle?.querySelector("div[style*='display: grid']");
  const userSpans = userGrid?.querySelectorAll("span");
  if (userSpans?.[0]) userSpans[0].textContent = me.name?.trim() || me.email;
  if (userSpans?.[1]) userSpans[1].textContent = me.email;
  const initial = userToggle?.querySelector<HTMLElement>("span[style*='PP Editorial']");
  if (initial) initial.textContent = (me.name?.trim() || me.email).charAt(0).toUpperCase();

  const wsToggle = document.querySelector('[sc-camel-on-click="{{ toggleWorkspace }}"]');
  const wsGrid = wsToggle?.querySelector("div[style*='display: grid']");
  const wsSpans = wsGrid?.querySelectorAll("span");
  if (wsSpans?.[0]) wsSpans[0].textContent = me.workspace.name;
  if (wsSpans?.[1]) wsSpans[1].textContent = `Espace ${me.workspace.name}`;
}

function previewUrl(workspace: Workspace, page: Page): string {
  return `${location.origin}/s/${workspace.slug}/${page.slug}`;
}

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(String(res.status));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function createAndOpen(type: PageType) {
  const page = await json<Page>("/api/pages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, name: DEFAULT_NAME[type] }),
  });
  location.assign("/editeur?page=" + page.id);
}

function bindCreateMenu() {
  const menu = document.querySelector<HTMLElement>('sc-if[value="{{ newPageOpen }}"]');
  if (menu) menu.style.display = "none";
  const cta = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onNewPage }}"]');
  cta?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!menu) {
      void createAndOpen("sell");
      return;
    }
    const open = menu.style.display !== "none" && menu.getAttribute("hidden") == null;
    if (open && menu.style.display) {
      menu.style.display = "none";
    } else {
      menu.removeAttribute("hidden");
      menu.style.display = "block";
    }
  });

  const bindList = (selector: string, type: PageType) => {
    document.querySelector(selector)?.addEventListener("click", (e) => {
      e.stopPropagation();
      void createAndOpen(type);
    });
  };
  bindList('sc-for[list="{{ sellItems }}"]', "sell");
  bindList('sc-for[list="{{ writeItems }}"]', "write");
  bindList('sc-for[list="{{ blankItems }}"]', "blank");
}

function bindLogout() {
  const label = byText("span", "Se déconnecter");
  label?.closest("div")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await fetch("/api/auth/logout", { method: "POST" });
    location.assign("/connexion");
  });
}

function bindNav() {
  for (const el of document.querySelectorAll("span, a")) {
    const t = el.textContent?.trim();
    if (t === "Mon abonnement" || t === "Facturation") {
      el.closest("div, a")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.assign("/facturation");
      });
    }
    if (t === "Parrainage" || t === "Partager et gagner") {
      const host = el.closest("a") ?? el.closest("div");
      host?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.assign("/parrainage");
      });
    }
  }
}

function bindRow(rowEl: HTMLElement, page: Page, workspace: Workspace, reload: () => Promise<void>) {
  const cols = [...rowEl.children] as HTMLElement[];
  const nameCol = cols[0];
  const editedCol = cols[1];
  const typeCol = cols[2];

  const nameBtn = nameCol?.querySelector<HTMLElement>('[sc-camel-on-click="{{ row.onOpen }}"]');
  if (nameBtn) nameBtn.textContent = page.name;
  if (editedCol) editedCol.textContent = formatEdited(page.updatedAt);
  const typeSpan = typeCol?.querySelector("span");
  if (typeSpan) typeSpan.textContent = TYPE_LABEL[page.type] ?? page.type;

  const published = page.status !== "draft";
  const pubIf = nameCol?.querySelector<HTMLElement>('sc-if[value="{{ row.published }}"]');
  if (pubIf) pubIf.style.display = published ? "" : "none";

  const renameIf = nameCol?.querySelector<HTMLElement>('sc-if[value="{{ row.renaming }}"]');
  const notRenameIf = nameCol?.querySelector<HTMLElement>('sc-if[value="{{ row.notRenaming }}"]');
  const renameInput = nameCol?.querySelector<HTMLInputElement>("input");
  const menuIf = rowEl.querySelector<HTMLElement>('sc-if[value="{{ row.menuOpen }}"]');
  if (renameIf) renameIf.style.display = "none";
  if (menuIf) menuIf.style.display = "none";

  const open = () => {
    location.assign("/editeur?page=" + page.id);
  };

  const startRename = (e: Event) => {
    e.stopPropagation();
    if (menuIf) menuIf.style.display = "none";
    if (notRenameIf) notRenameIf.style.display = "none";
    if (renameIf) renameIf.style.display = "";
    if (renameInput) {
      renameInput.value = page.name;
      renameInput.focus();
      renameInput.select();
    }
  };

  const commitRename = async () => {
    const next = renameInput?.value.trim() || page.name;
    if (next !== page.name) {
      await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
    }
    await reload();
  };

  renameInput?.addEventListener("click", (e) => e.stopPropagation());
  renameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    }
    if (e.key === "Escape") void reload();
  });
  renameInput?.addEventListener("blur", () => {
    void commitRename();
  });

  nameBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  rowEl.addEventListener("click", () => open());

  rowEl.querySelector('[sc-camel-on-click="{{ row.onMenu }}"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!menuIf) return;
    menuIf.style.display = menuIf.style.display === "none" ? "block" : "none";
  });

  for (const openEl of rowEl.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ row.onOpen }}"]')) {
    if (openEl === nameBtn) continue;
    openEl.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });
  }

  rowEl.querySelector('[sc-camel-on-click="{{ row.onDuplicate }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await fetch(`/api/pages/${page.id}/duplicate`, { method: "POST" });
    await reload();
  });

  rowEl.querySelector('[sc-camel-on-click="{{ row.onRename }}"]')?.addEventListener("click", startRename);

  rowEl.querySelector('[sc-camel-on-click="{{ row.onCopy }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const url = previewUrl(workspace, page);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Lien de prévisualisation", url);
    }
    showToast("Lien copié");
    if (menuIf) menuIf.style.display = "none";
  });

  rowEl.querySelector('[sc-camel-on-click="{{ row.onDelete }}"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    await reload();
  });
}

function renderRows(pages: Page[], workspace: Workspace, reload: () => Promise<void>) {
  const list = document.querySelector('sc-for[list="{{ rows }}"]');
  if (!list) return;
  const first = list.firstElementChild as HTMLElement | null;
  if (!first) return;
  const proto = first.cloneNode(true) as HTMLElement;
  list.replaceChildren();
  for (const page of pages) {
    const row = proto.cloneNode(true) as HTMLElement;
    bindRow(row, page, workspace, reload);
    list.appendChild(row);
  }
  const empty = document.querySelector<HTMLElement>('sc-if[value="{{ isEmpty }}"]');
  if (empty) empty.style.display = pages.length ? "none" : "";
}

function bindCanardo(getPages: () => Page[]) {
  document.querySelector('[sc-camel-on-click="{{ openChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChatOpen(true);
  });
  document.querySelector('[sc-camel-on-click="{{ closeChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChatOpen(false);
  });

  const input = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onChatInput }}"]');
  const sendBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ sendChat }}"]');
  let sending = false;

  const send = async () => {
    const prompt = input?.value.trim() ?? "";
    if (!prompt || sending) return;
    sending = true;
    appendChat(prompt, true);
    if (input) input.value = "";
    try {
      let page = getPages()[0];
      if (!page) {
        page = await json<Page>("/api/pages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "sell", name: DEFAULT_NAME.sell }),
        });
      }
      const res = await fetch(`/api/pages/${page.id}/canardo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.status === 402) {
        showToast("Plus de crédits", "/facturation");
        return;
      }
      if (!res.ok) return;
      const body = (await res.json()) as { message: string };
      appendChat(body.message, false);
    } finally {
      sending = false;
    }
  };

  sendBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void send();
    },
    true,
  );
  input?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void send();
    },
    true,
  );
}

export async function hydrateDashboard() {
  const me = await guardSession();
  if (!me) return;
  fillProfile(me);
  bindCreateMenu();
  bindLogout();
  bindNav();

  let pages: Page[] = [];
  const reload = async () => {
    const data = await json<PagesPayload>("/api/pages");
    pages = data.pages;
    fillProfile({ ...me, workspace: data.workspace });
    renderRows(data.pages, data.workspace, reload);
  };

  bindCanardo(() => pages);
  await reload();
}

void hydrateDashboard();
