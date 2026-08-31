import { guardSession } from "./session-guard";
import type { Page, PageDocument, Workspace } from "../types";

type PagesPayload = { workspace: Workspace; pages: Page[]; workspaces: Workspace[] };

function byText(tag: string, text: string): HTMLElement | undefined {
  return [...document.querySelectorAll(tag)].find((el) => el.textContent?.trim() === text) as
    | HTMLElement
    | undefined;
}

function previewPath(workspaceSlug: string, pageSlug: string): string {
  return `/s/${workspaceSlug}/${pageSlug}`;
}

function showCreditsToast() {
  let toast = document.querySelector<HTMLElement>("[data-canardo-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.dataset.canardoToast = "1";
    toast.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:400;display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:11px;background:#141310;color:#fff;font-size:14px;box-shadow:0 12px 32px rgba(20,19,16,0.28);white-space:nowrap";
    const dot = document.createElement("span");
    dot.style.cssText =
      "width:7px;height:7px;border-radius:50%;background:#FBC531;flex:none;display:block";
    const label = document.createElement("span");
    label.textContent = "Plus de crédits";
    const link = document.createElement("a");
    link.href = "/facturation";
    link.textContent = "Add Credits";
    link.style.color = "#FBC531";
    toast.append(dot, label, link);
    document.body.appendChild(toast);
  }
  toast.style.display = "flex";
  window.setTimeout(() => {
    toast.style.display = "none";
  }, 3600);
}

function appendConversation(text: string, mine: boolean) {
  const list = document.querySelector('sc-for[list="{{ msgs }}"]');
  if (!list) return;
  const row = document.createElement("div");
  row.style.cssText = `display:flex;gap:8px;align-items:center;justify-content:${mine ? "flex-end" : "flex-start"}`;
  const bubble = document.createElement("div");
  bubble.textContent = text;
  bubble.style.cssText = mine
    ? "background:#141310;color:#FFFFFF;border:none;font:400 15px/1.5;padding:11px 16px;border-radius:12px;max-width:76%"
    : "background:#FFFFFF;color:#2E2A24;border:1px solid #E6E5E0;font:400 15px/1.5;padding:11px 16px;border-radius:12px;max-width:76%";
  row.appendChild(bubble);
  list.appendChild(row);
  const hist = document.querySelector<HTMLElement>('[ref="{{ histRef }}"]');
  if (hist) hist.scrollTop = hist.scrollHeight;
}

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    location.assign("/connexion");
    throw new Error("401");
  }
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

function fillName(name: string) {
  const headerName = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ startRename }}"] div');
  if (headerName) headerName.textContent = name;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[sc-camel-on-change="{{ onRename }}"]')) {
    input.value = name;
  }
}

function fillSlug(slug: string) {
  const settings = document.querySelector('sc-if[value="{{ settingsOpen }}"]');
  const slugEl = settings?.querySelector("span[style*='color: #4A463F']");
  if (slugEl) slugEl.textContent = slug;
}

function setPreviewIframe(src: string) {
  let iframe = document.querySelector<HTMLIFrameElement>("iframe[data-page-preview]");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.dataset.pagePreview = "1";
    iframe.title = "Aperçu";
    iframe.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;z-index:4";
    const canvas = document.querySelector<HTMLElement>('[sc-camel-on-drag-over="{{ onCanvasOver }}"]');
    (canvas ?? document.body).appendChild(iframe);
  }
  iframe.src = src;
}

function panelInputs(): HTMLInputElement[] {
  const inspector = document.querySelector('sc-if[value="{{ inspectorOpen }}"]');
  const settings = document.querySelector('sc-if[value="{{ settingsOpen }}"]');
  return [
    ...new Set([
      ...document.querySelectorAll<HTMLInputElement>('input[sc-camel-on-change="{{ onRename }}"]'),
      ...(inspector ? [...inspector.querySelectorAll<HTMLInputElement>("input")] : []),
      ...(settings ? [...settings.querySelectorAll<HTMLInputElement>("input")] : []),
    ]),
  ];
}

function applyPanelToDocument(doc: PageDocument): PageDocument {
  const next: PageDocument = {
    ...doc,
    sections: doc.sections.map((s) => ({ ...s, settings: { ...s.settings } })),
  };
  const nameInput = document.querySelector<HTMLInputElement>(
    'sc-if[value="{{ settingsOpen }}"] input[sc-camel-on-change="{{ onRename }}"]',
  );
  if (nameInput?.value.trim()) next.name = nameInput.value.trim();

  const heroSub = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onHeroSub }}"]');
  const heroCta = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onHeroCta }}"]');
  const heroImg = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onHeroImgH }}"]');
  const blockName = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onBlockName }}"]');
  const blockH = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onBlockH }}"]');
  const gridGap = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onGridGap }}"]');
  const prodRadius = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onProdRadius }}"]');

  const hero = next.sections.find((s) => s.type === "hero" || s.type === "productHero");
  if (hero) {
    if (heroSub) hero.settings.subtitle = heroSub.value;
    if (heroCta) hero.settings.cta = heroCta.value;
    if (heroImg) hero.settings.imageHeight = Number(heroImg.value);
  }
  const article = next.sections.find((s) => s.type === "article" || s.type === "atelier");
  if (article && blockName?.value) article.settings.title = blockName.value;
  if (article && blockH) article.settings.height = Number(blockH.value);
  const grid = next.sections.find((s) => s.type === "collectionGrid");
  if (grid) {
    if (gridGap) grid.settings.gap = Number(gridGap.value);
    if (prodRadius) grid.settings.radius = Number(prodRadius.value);
  }
  return next;
}

function fillPanelFromDocument(doc: PageDocument) {
  const hero = doc.sections.find((s) => s.type === "hero" || s.type === "productHero");
  const heroSub = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onHeroSub }}"]');
  const heroCta = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onHeroCta }}"]');
  if (heroSub && typeof hero?.settings.subtitle === "string") heroSub.value = hero.settings.subtitle;
  if (heroCta && typeof hero?.settings.cta === "string") heroCta.value = hero.settings.cta;
  const blockName = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onBlockName }}"]');
  const titled = doc.sections.find((s) => typeof s.settings.title === "string");
  if (blockName && typeof titled?.settings.title === "string") blockName.value = titled.settings.title;
}

function showPublishToast(previewUrl: string) {
  const toastIf = document.querySelector<HTMLElement>('sc-if[value="{{ publishDoneOpen }}"]');
  if (!toastIf) return;
  const urlSpan = toastIf.querySelector<HTMLElement>('span[style*="color:#75736C"]');
  const display = previewUrl.startsWith("http")
    ? previewUrl.replace(/^https?:\/\//, "")
    : `${location.host}${previewUrl}`;
  if (urlSpan) urlSpan.textContent = display;
  toastIf.style.display = "block";
  window.setTimeout(() => {
    toastIf.style.display = "none";
  }, 5000);
}

function setPublishButtonState(published: boolean, publishing = false) {
  const btn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onPublish }}"]');
  if (!btn) return;
  const label = btn.querySelector("span:last-child");
  if (label) {
    label.textContent = publishing ? "Publication…" : published ? "Publiée" : "Publier";
  }
  btn.style.background = published && !publishing ? "#2FA36B" : "#141310";
  btn.style.cursor = publishing ? "wait" : "pointer";
}

function noop(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function bindNoop(selector: string) {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", noop);
  });
}

export async function hydrateEditeur() {
  const me = await guardSession();
  if (!me) return;

  const pageId = new URLSearchParams(location.search).get("page");
  if (!pageId) {
    location.assign("/dashboard");
    return;
  }

  let page: Page;
  try {
    page = await json<Page>(`/api/pages/${pageId}`);
  } catch (err) {
    if (String((err as Error).message) === "401") return;
    location.assign("/dashboard");
    return;
  }

  const list = await json<PagesPayload>("/api/pages");
  const workspace =
    list.workspaces.find((w) => w.id === page.workspaceId) ??
    (list.workspace.id === page.workspaceId ? list.workspace : me.workspace);
  const src = previewPath(workspace.slug, page.slug);

  fillName(page.name);
  fillSlug(page.slug);
  fillPanelFromDocument(page.document);
  setPreviewIframe(src);

  let current: Page = page;
  let timer: number | undefined;

  const save = async () => {
    const nextDoc = applyPanelToDocument(current.document);
    const name =
      document
        .querySelector<HTMLInputElement>(
          'sc-if[value="{{ settingsOpen }}"] input[sc-camel-on-change="{{ onRename }}"]',
        )
        ?.value.trim() ||
      document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onRename }}"]')?.value.trim() ||
      current.name;
    nextDoc.name = name;
    fillName(name);
    const updated = await json<Page>(`/api/pages/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: nextDoc, name }),
    });
    current = updated;
    fillSlug(updated.slug);
    setPreviewIframe(previewPath(workspace.slug, updated.slug));
  };

  const scheduleSave = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      void save();
    }, 400);
  };

  for (const input of panelInputs()) {
    input.addEventListener("input", scheduleSave);
    input.addEventListener("change", scheduleSave);
  }

  bindNoop('[sc-camel-on-click="{{ openAb }}"]');
  bindNoop('[sc-camel-on-click="{{ startAb }}"]');
  bindNoop('[sc-camel-on-click="{{ sendInvite }}"]');
  bindNoop('[sc-camel-on-click="{{ addVariant }}"]');

  const livePreviewPath = () => previewPath(workspace.slug, current.slug);
  const livePreviewUrl = () => `${location.origin}${livePreviewPath()}`;
  byText("span", "Copier le lien d'aperçu")?.closest("div")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = livePreviewUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Lien de prévisualisation", url);
    }
  });
  byText("span", "Ouvrir dans un onglet")?.closest("div")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(livePreviewPath(), "_blank", "noopener");
  });

  const barInput = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onInput }}"]');
  const sendBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onSend }}"]');
  let sending = false;
  const sendCanardo = async () => {
    const prompt = barInput?.value.trim() ?? "";
    if (!prompt || sending) return;
    sending = true;
    appendConversation(prompt, true);
    if (barInput) barInput.value = "";
    try {
      const res = await fetch(`/api/pages/${current.id}/canardo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.status === 402) {
        showCreditsToast();
        return;
      }
      if (res.status === 401) {
        location.assign("/connexion");
        return;
      }
      if (!res.ok) return;
      const body = (await res.json()) as { message: string; document: PageDocument };
      appendConversation(body.message, false);
      current = { ...current, document: body.document };
      setPreviewIframe(previewPath(workspace.slug, current.slug));
    } finally {
      sending = false;
    }
  };
  sendBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendCanardo();
    },
    true,
  );
  barInput?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void sendCanardo();
    },
    true,
  );

  const publishBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onPublish }}"]');
  let publishing = false;
  const publishPage = async () => {
    if (publishing) return;
    publishing = true;
    setPublishButtonState(current.status !== "draft", true);
    try {
      await save();
      const res = await fetch(`/api/pages/${current.id}/publish`, { method: "POST" });
      if (res.status === 401) {
        location.assign("/connexion");
        return;
      }
      if (!res.ok) {
        setPublishButtonState(current.status !== "draft");
        return;
      }
      const body = (await res.json()) as {
        status: string;
        previewUrl: string;
        message?: string;
      };
      current = { ...current, status: body.status as Page["status"] };
      setPublishButtonState(true);
      showPublishToast(body.previewUrl);
      if (body.message) appendConversation(body.message, false);
    } finally {
      publishing = false;
    }
  };
  publishBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      void publishPage();
    },
    true,
  );
  if (current.status !== "draft") setPublishButtonState(true);
}

void hydrateEditeur();
