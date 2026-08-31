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
}

void hydrateEditeur();
