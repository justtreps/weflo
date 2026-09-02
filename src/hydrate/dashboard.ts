import { groupChips, paintChip } from "../lib/chips";
import { filterPages, sortPages } from "../lib/page-filters";
import { applyAppChrome, fillProfile, setScIf } from "./app-chrome";
import { guardSession } from "./session-guard";
import type { Page, PageType, Workspace } from "../types";
import { dashboardHomeModel } from "../dashboard/home-model";
import { renderDashboardHome } from "../dashboard/home-view";
import "./dashboard-home.css";
import { creationActionUrl } from "../create/workspace";

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
type WorkspaceSummary = Pick<Workspace, "id" | "name" | "slug">;

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
    link.textContent = "Ajouter des crédits";
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
  setScIf(closed, !open);
  if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
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

function previewUrl(workspace: WorkspaceSummary, page: Page): string {
  return `${location.origin}/s/${workspace.slug}/${page.slug}`;
}

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(String(res.status));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function goEditor(pageId: string, prompt?: string) {
  if (prompt) sessionStorage.setItem("weflo-canardo-prompt", prompt);
  location.assign("/editeur?page=" + pageId);
}

async function createAndOpen(type: PageType, name = DEFAULT_NAME[type]) {
  const page = await json<Page>("/api/pages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, name }),
  });
  goEditor(page.id);
}

const CREATE_TYPE: Record<string, PageType> = {
  "Page produit": "sell",
  "Landing page": "sell",
  "Page d'accueil": "blank",
  Advertorial: "write",
  "Article de blog": "write",
  "Page vierge": "blank",
};

function bindCreateMenu() {
  const menu = document.querySelector<HTMLElement>('sc-if[value="{{ newPageOpen }}"]');
  setScIf(menu, false);
  const cta = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onNewPage }}"]');
  cta?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!menu) {
      void createAndOpen("sell");
      return;
    }
    const open = menu.style.display !== "none";
    setScIf(menu, !open);
  });

  for (const el of menu?.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ opt.onClick }}"]') ?? []) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const type = CREATE_TYPE[label];
    if (!type) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void createAndOpen(type, label);
    });
  }
}


function bindRow(rowEl: HTMLElement, page: Page, workspace: WorkspaceSummary, reload: () => Promise<void>) {
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

function renderRows(pages: Page[], workspace: WorkspaceSummary, reload: () => Promise<void>) {
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
  setScIf(empty, pages.length === 0);
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

  const sendPrompt = async (raw?: string) => {
    const prompt = (raw ?? input?.value ?? "").trim();
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
      goEditor(page.id, prompt);
    } catch {
      showToast("Impossible d'ouvrir l'éditeur");
    } finally {
      sending = false;
    }
  };

  sendBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendPrompt();
    },
    true,
  );
  input?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendPrompt();
    },
    true,
  );
  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ c.onPick }}"]')) {
    const label = el.textContent?.trim() ?? "";
    if (!label) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setChatOpen(true);
      void sendPrompt(label);
    });
  }
}

function bindAnnouncement() {
  const box = document.querySelector<HTMLElement>('sc-if[value="{{ showAnnouncement }}"]');
  if (!box) return;
  const slides = [
    {
      title: "Créer une boutique en parlant",
      body: "Décris ce que tu vends, le canard monte la boutique et tu corriges une phrase à la fois.",
      link: "Par où commencer",
    },
    {
      title: "Les tests A/B sortent de bêta",
      body: "Deux versions d'une page s'affrontent, le canard désigne la gagnante en trois jours.",
      link: "Lire les notes",
    },
    {
      title: "Le parrainage paie au mois",
      body: "Chaque espace que tu amènes rapporte douze mois, tes liens déjà partagés compris.",
      link: "Voir les conditions",
    },
  ];
  const imgs = [...box.querySelectorAll("img")];
  const titleEl = box.querySelector("p");
  const bodyEl = titleEl?.nextElementSibling as HTMLElement | null;
  const linkEl = bodyEl?.nextElementSibling as HTMLElement | null;
  const countEl = [...box.querySelectorAll("span")].find((el) => /\d+\s*\/\s*\d+/.test(el.textContent ?? ""));
  let index = 0;
  const paint = () => {
    const slide = slides[index % slides.length];
    if (titleEl) titleEl.textContent = slide.title;
    if (bodyEl) bodyEl.textContent = slide.body;
    if (linkEl) linkEl.textContent = slide.link;
    if (countEl) countEl.textContent = `${(index % slides.length) + 1} / ${slides.length}`;
    imgs.forEach((img, i) => {
      img.style.display = i === index % imgs.length ? "block" : "none";
    });
  };
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ annPrev }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    index = (index - 1 + slides.length) % slides.length;
    paint();
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ annNext }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    index = (index + 1) % slides.length;
    paint();
  });
  linkEl?.addEventListener("click", (e) => {
    e.preventDefault();
    if (index % slides.length === 2) location.assign("/parrainage");
    else {
      void (async () => {
        try {
          const data = await json<PagesPayload>("/api/pages");
          const page =
            data.pages[0] ??
            (await json<Page>("/api/pages", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ type: "sell", name: DEFAULT_NAME.sell }),
            }));
          goEditor(page.id);
        } catch {
          setChatOpen(true);
        }
      })();
    }
  });
}

function bindCoach() {
  const coach = document.querySelector<HTMLElement>('sc-if[value="{{ coachOn }}"]');
  setScIf(coach, false);
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ tutSkip }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(coach, false);
  });
}

export async function hydrateDashboard() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/dashboard");
  bindCreateMenu();
  bindAnnouncement();
  bindCoach();

  let pages: Page[] = [];
  let workspace: WorkspaceSummary = me.workspace;
  let chip = "Tout";
  let query = "";
  let sortBy: "edited" | "name" | "type" = "edited";
  let desc = true;
  const home = document.querySelector<HTMLElement>("#weflo-dashboard-home");

  const mountHome = () => {
    if (!home) return;
    home.innerHTML = renderDashboardHome(dashboardHomeModel({ pages, workspace: workspace as Workspace, userName: me.name }));
    home.querySelector<HTMLFormElement>("[data-dashboard-prompt]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = home.querySelector<HTMLTextAreaElement>("textarea")?.value.trim() ?? "";
      location.assign(creationActionUrl("generate", value));
    });
    for (const button of home.querySelectorAll<HTMLElement>("[data-dashboard-action]")) {
      button.addEventListener("click", (event) => {
        const action = button.dataset.dashboardAction;
        if (action === "generate" && button.closest("form")) return;
        event.preventDefault();
        if (action === "generate" || action === "link") location.assign(creationActionUrl(action));
        if (action === "image") location.assign(creationActionUrl("image"));
        if (action === "shopify") location.assign("/facturation#shopify");
        if (action === "blank") location.assign(creationActionUrl("blank"));
        if (action === "all") home.querySelector("#creations")?.scrollIntoView({ behavior: "smooth" });
      });
    }
    for (const card of home.querySelectorAll<HTMLElement>("[data-project-id]")) {
      const page = pages.find((item) => item.id === card.dataset.projectId);
      if (!page) continue;
      for (const button of card.querySelectorAll<HTMLElement>("[data-project-command]")) {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const command = button.dataset.projectCommand;
          if (command === "open") goEditor(page.id);
          if (command === "duplicate") { await fetch(`/api/pages/${page.id}/duplicate`, { method: "POST" }); await reload(); }
          if (command === "rename") {
            const name = window.prompt("Nouveau nom", page.name)?.trim();
            if (name) { await fetch(`/api/pages/${page.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }); await reload(); }
          }
          if (command === "copy") {
            const url = previewUrl(workspace, page);
            try { await navigator.clipboard.writeText(url); } catch { window.prompt("Lien de prévisualisation", url); }
            showToast("Lien copié");
          }
          if (command === "delete" && window.confirm(`Supprimer « ${page.name} » ?`)) { await fetch(`/api/pages/${page.id}`, { method: "DELETE" }); await reload(); }
        });
      }
    }
  };
  const groups = groupChips(document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ chip.onClick }}"]'));
  paintChip(groups, chip, setScIf);

  const hasQueryIf = document.querySelector<HTMLElement>('sc-if[value="{{ hasQuery }}"]');
  const sortLabel = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleSort }}"] span');
  const dirLabel = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleDirection }}"] span');

  const paint = () => {
    setScIf(hasQueryIf, query.trim().length > 0);
    if (sortLabel) {
      sortLabel.textContent =
        sortBy === "name" ? "Nom" : sortBy === "type" ? "Type" : "Modifié récemment";
    }
    if (dirLabel) dirLabel.textContent = desc ? "Décroissant" : "Croissant";
    const visible = sortPages(filterPages(pages, chip, query), sortBy, desc);
    renderRows(visible, workspace, reload);
  };

  const reload = async () => {
    const data = await json<PagesPayload>("/api/pages");
    pages = data.pages;
    workspace = data.workspace;
    fillProfile({ ...me, workspace: data.workspace });
    mountHome();
    paint();
  };

  for (const btn of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ chip.onClick }}"]')) {
    const label = btn.querySelector("span")?.textContent?.trim();
    if (!label) continue;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip = label;
      paintChip(groups, chip, setScIf);
      paint();
    });
  }

  const search = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onQuery }}"]');
  search?.addEventListener("input", () => {
    query = search.value;
    paint();
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ clearQuery }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    if (search) search.value = "";
    query = "";
    paint();
  });

  const sortMenu = document.querySelector<HTMLElement>('sc-if[value="{{ sortOpen }}"]');
  setScIf(sortMenu, false);
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleSort }}"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    setScIf(sortMenu, sortMenu?.style.display === "none");
  });
  const applySort = (next: typeof sortBy, nextDesc = desc) => {
    sortBy = next;
    desc = nextDesc;
    setScIf(sortMenu, false);
    paint();
  };
  document.querySelector('[sc-camel-on-click="{{ sortByName }}"]')?.addEventListener("click", () => applySort("name"));
  document.querySelector('[sc-camel-on-click="{{ sortByEdited }}"]')?.addEventListener("click", () => applySort("edited"));
  document.querySelector('[sc-camel-on-click="{{ sortByType }}"]')?.addEventListener("click", () => applySort("type"));
  document.querySelector('[sc-camel-on-click="{{ toggleDirection }}"]')?.addEventListener("click", () => {
    applySort(sortBy, !desc);
  });
  const SORT_LABEL: Record<string, "edited" | "name" | "type"> = {
    "Modifié récemment": "edited",
    "Date de création": "edited",
    Nom: "name",
    Type: "type",
  };
  for (const el of sortMenu?.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ opt.onClick }}"]') ?? []) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const next = SORT_LABEL[label];
    if (!next) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      applySort(next);
    });
  }

  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(sortMenu, false);
    setScIf(document.querySelector<HTMLElement>('sc-if[value="{{ newPageOpen }}"]'), false);
  });

  bindCanardo(() => pages);
  mountHome();
  await reload();
}

void hydrateDashboard();
