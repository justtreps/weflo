import { blankDocument, documentFromModel } from "../lib/catalog";
import { bindAppChrome, setScIf } from "./app-chrome";
import { guardSession } from "./session-guard";
import { mountEditorGallery, type EditorGallery } from "./editor-gallery";
import { canardoControlState, canardoErrorMessage, editorViewForDocument } from "./editeur-state";
import { renderPublishPaywall } from "./publish-access";
import type { Page, PageDocument, Workspace } from "../types";
import { hydrateVisualEditor } from "./editor-v2";

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

function showPublishPaywall() {
  let backdrop = document.querySelector<HTMLElement>("[data-publish-paywall]");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.dataset.publishPaywall = "1";
    backdrop.style.cssText = "position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:20px;background:rgba(20,19,16,.58);backdrop-filter:blur(8px)";
    backdrop.innerHTML = `<style>
      .publish-paywall{position:relative;width:min(480px,100%);padding:34px;border-radius:22px;background:#fff;color:#141310;box-shadow:0 32px 90px rgba(0,0,0,.32);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
      .publish-paywall__close{position:absolute;top:15px;right:15px;width:32px;height:32px;border:1px solid #e6e5e0;border-radius:50%;background:#fff;color:#141310;font-size:21px;cursor:pointer}
      .publish-paywall__mark{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:#141310;color:#fbc531;font:800 23px/1 Syne,sans-serif}
      .publish-paywall__label{margin:24px 0 8px;color:#75736c;font-size:13px;font-weight:700}
      .publish-paywall h2{margin:0;max-width:390px;font:700 36px/1.02 Syne,-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-.04em}
      .publish-paywall>p:not(.publish-paywall__label){margin:18px 0;color:#625f58;font-size:15px;line-height:1.55}
      .publish-paywall ul{display:grid;gap:9px;margin:22px 0;padding:18px 0;border-block:1px solid #e6e5e0;list-style:none;font-size:14px;font-weight:600}
      .publish-paywall li:before{content:"✓";display:inline-block;margin-right:10px;color:#2fa36b}
      .publish-paywall>a{display:flex;align-items:center;justify-content:center;height:48px;border-radius:11px;background:#fbc531;color:#141310;font-size:15px;font-weight:750;text-decoration:none}
    </style>${renderPublishPaywall()}`;
    const hide = () => { if (backdrop) backdrop.style.display = "none"; };
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) hide(); });
    backdrop.querySelector("[data-paywall-close]")?.addEventListener("click", hide);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
    document.body.appendChild(backdrop);
  }
  backdrop.style.display = "grid";
  backdrop.querySelector<HTMLElement>("[data-paywall-close]")?.focus();
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

function editorToolbar(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("[data-weflo-toolbar]") ??
    document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onPublish }}"]')?.parentElement?.parentElement ??
    null
  );
}

function showEditorToolbar() {
  const bar = editorToolbar();
  if (!bar) return;
  bar.style.setProperty("display", "flex", "important");
  bar.style.setProperty("z-index", "80", "important");
}

function showModelPicker(open: boolean) {
  const empty = document.querySelector<HTMLElement>('[data-empty-scroll="1"]');
  if (empty) empty.style.setProperty("display", open ? "flex" : "none", "important");
  const iframe = document.querySelector<HTMLIFrameElement>("iframe[data-page-preview]");
  if (iframe) iframe.style.display = open ? "none" : "block";
}

function setPreviewIframe(src: string, visible = true) {
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
  iframe.style.display = visible ? "block" : "none";
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

function isShown(el: HTMLElement | null): boolean {
  return !!el && el.style.display !== "none";
}

function bindToggle(clickSel: string, box: HTMLElement | null) {
  document.querySelectorAll<HTMLElement>(clickSel).forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setScIf(box, !isShown(box));
    });
  });
}

function bindShow(clickSel: string, box: HTMLElement | null, open = true) {
  document.querySelectorAll<HTMLElement>(clickSel).forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setScIf(box, open);
    });
  });
}

export async function hydrateEditeur() {
  const me = await guardSession();
  if (!me) return;
  bindAppChrome();

  const pageId = new URLSearchParams(location.search).get("page");
  if (!pageId) {
    location.assign("/dashboard");
    return;
  }

  await hydrateVisualEditor(pageId);
  return;

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
  fillName(page.name);
  fillSlug(page.slug);
  fillPanelFromDocument(page.document);
  showEditorToolbar();

  let current: Page = page;
  let timer: number | undefined;
  let galleryController: EditorGallery | undefined;
  const settings = document.querySelector<HTMLElement>('sc-if[value="{{ settingsOpen }}"]');

  const adoptPage = (updated: Page) => {
    current = updated;
    fillName(updated.name);
    fillSlug(updated.slug);
    fillPanelFromDocument(updated.document);
    const galleryOpen = editorViewForDocument(updated.document) === "gallery";
    if (galleryController) galleryController.setOpen(galleryOpen);
    else showModelPicker(galleryOpen);
    if (settings) settings.style.setProperty("display", galleryOpen ? "none" : "block", "important");
    if (!galleryOpen) {
      setPreviewIframe(`${previewPath(workspace.slug, updated.slug)}?editor=${Date.now()}`, true);
    }
  };

  adoptPage(current);

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
    adoptPage(updated);
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

  for (const key of [
    "lightboxOpen",
    "publishDoneOpen",
    "abOpen",
    "shareOpen",
    "coachOn",
    "inspectorOpen",
  ]) {
    setScIf(document.querySelector<HTMLElement>(`sc-if[value="{{ ${key} }}"]`), false);
  }
  setScIf(document.querySelector<HTMLElement>('sc-if[value="{{ settingsOpen }}"]'), true);

  const ab = document.querySelector<HTMLElement>('sc-if[value="{{ abOpen }}"]');
  const share = document.querySelector<HTMLElement>('sc-if[value="{{ shareOpen }}"]');
  const inspector = document.querySelector<HTMLElement>('sc-if[value="{{ inspectorOpen }}"]');
  const previewMenu = document.querySelector<HTMLElement>('sc-if[value="{{ previewOpen }}"]');
  const rolePick = document.querySelector<HTMLElement>('sc-if[value="{{ rolePickOpen }}"]');
  const renaming = document.querySelector<HTMLElement>('sc-if[value="{{ renaming }}"]');
  const notRenaming = document.querySelector<HTMLElement>('sc-if[value="{{ notRenaming }}"]');
  const panelClosed = document.querySelector<HTMLElement>('sc-if[value="{{ panelClosed }}"]');
  setScIf(previewMenu, false);
  setScIf(rolePick, false);
  setScIf(renaming, false);
  setScIf(notRenaming, true);
  setScIf(panelClosed, false);

  bindShow('[sc-camel-on-click="{{ openAb }}"]', ab, true);
  bindShow('[sc-camel-on-click="{{ startAb }}"]', ab, true);
  bindShow('[sc-camel-on-click="{{ addVariant }}"]', ab, true);
  bindShow('[sc-camel-on-click="{{ askEndAb }}"]', ab, true);
  bindShow('[sc-camel-on-click="{{ endAb }}"]', ab, false);
  bindShow('[sc-camel-on-click="{{ cancelEndAb }}"]', ab, false);
  bindToggle('[sc-camel-on-click="{{ toggleSettings }}"]', settings);
  bindToggle('[sc-camel-on-click="{{ togglePreview }}"]', previewMenu);
  bindShow('[sc-camel-on-click="{{ reopenPanel }}"]', inspector, true);
  bindShow('[sc-camel-on-click="{{ selectHero }}"]', inspector, true);
  bindShow('[sc-camel-on-click="{{ selectGrid }}"]', inspector, true);
  bindToggle('[sc-camel-on-click="{{ toggleRolePick }}"]', rolePick);

  const hide = (sel: string) => {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const box = el.closest("sc-if") as HTMLElement | null;
        setScIf(box, false);
      });
    });
  };
  hide('[sc-camel-on-click="{{ closeLightbox }}"]');
  hide('[sc-camel-on-click="{{ closeAb }}"]');
  hide('[sc-camel-on-click="{{ closeShare }}"]');
  hide('[sc-camel-on-click="{{ closePublishDone }}"]');
  hide('[sc-camel-on-click="{{ tipSkip }}"]');
  hide('[sc-camel-on-click="{{ closeInspector }}"]');
  hide('[sc-camel-on-click="{{ closePanel }}"]');

  const livePreviewPath = () => previewPath(workspace.slug, current.slug);
  const livePreviewUrl = () => `${location.origin}${livePreviewPath()}`;

  document.querySelectorAll<HTMLElement>('[title="Toutes les pages"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      location.assign("/dashboard");
    });
  });
  document.querySelectorAll<HTMLElement>('[title="Boutique"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPreviewIframe(livePreviewPath());
    });
  });

  const canvas = document.querySelector<HTMLElement>('[sc-camel-on-drag-over="{{ onCanvasOver }}"]');
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onDesktop }}"]')?.addEventListener("click", () => {
    if (canvas) canvas.style.maxWidth = "";
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onMobile }}"]')?.addEventListener("click", () => {
    if (canvas) canvas.style.maxWidth = "390px";
  });

  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ openShare }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(share, true);
  });
  byText("span", "Aperçu")?.closest("div")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setScIf(previewMenu, !isShown(previewMenu));
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ startRename }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setScIf(notRenaming, false);
    setScIf(renaming, true);
    const input = renaming?.querySelector<HTMLInputElement>("input");
    if (input) {
      input.value = current.name;
      input.focus();
      input.select();
    }
  });
  const headerRename = renaming?.querySelector<HTMLInputElement>("input");
  const commitHeaderRename = () => {
    setScIf(renaming, false);
    setScIf(notRenaming, true);
    scheduleSave();
  };
  headerRename?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitHeaderRename();
    }
    if (e.key === "Escape") {
      setScIf(renaming, false);
      setScIf(notRenaming, true);
    }
  });
  headerRename?.addEventListener("blur", commitHeaderRename);

  const pubSwitch = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ togglePublished }}"]');
  const paintPublished = (on: boolean) => {
    const knob = pubSwitch?.querySelector<HTMLElement>("span span");
    const track = pubSwitch?.querySelector<HTMLElement>("span");
    const title = pubSwitch?.querySelectorAll("span")[2];
    if (track) track.style.background = on ? "#2FA36B" : "#D8D5CE";
    if (knob) knob.style.transform = on ? "translateX(14px)" : "translateX(0px)";
    if (title) title.textContent = on ? "En ligne" : "Brouillon";
  };
  paintPublished(current.status !== "draft");
  pubSwitch?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (current.status === "draft") void publishPage();
    else paintPublished(true);
  });

  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ sendInvite }}"]')?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const mail = document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onInviteMail }}"]');
    const email = mail?.value.trim() ?? "";
    if (!email) return;
    await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: "member" }),
    });
    if (mail) mail.value = "";
    setScIf(rolePick, false);
  });
  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ r.onPick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const label = el.querySelector("span")?.textContent?.trim();
      const host = document.querySelector('[sc-camel-on-click="{{ toggleRolePick }}"] span');
      if (label && host) host.textContent = label;
      setScIf(rolePick, false);
    });
  }

  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onDuckPoke }}"]')?.addEventListener("click", () => {
    barInput?.focus();
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ pickFiles }}"]')?.addEventListener("click", () => {
    let file = document.querySelector<HTMLInputElement>("input[data-weflo-files]");
    if (!file) {
      file = document.createElement("input");
      file.type = "file";
      file.accept = "image/*";
      file.multiple = true;
      file.dataset.wefloFiles = "1";
      file.hidden = true;
      document.body.appendChild(file);
    }
    file.click();
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onCardDesktop }}"]')?.addEventListener("click", () => {
    if (canvas) canvas.style.maxWidth = "";
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ onCardMobile }}"]')?.addEventListener("click", () => {
    if (canvas) canvas.style.maxWidth = "390px";
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ tipNext }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setScIf(document.querySelector<HTMLElement>('sc-if[value="{{ coachOn }}"]'), false);
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ removeSelectedBlock }}"]')?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      setScIf(inspector, false);
    },
  );
  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ btn.onClick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      setScIf(inspector, true);
    });
  }
  const applyPickedModel = async (modelId: string) => {
    const nextDoc = modelId === "blank" ? blankDocument(current.name) : documentFromModel(modelId, current.name);
    const updated = await json<Page>(`/api/pages/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: nextDoc, name: nextDoc.name }),
    });
    adoptPage(updated);
    showEditorToolbar();
  };

  const galleryRoot = document.querySelector<HTMLElement>('[data-empty-scroll="1"]');
  if (galleryRoot) {
    galleryController = mountEditorGallery({
      root: galleryRoot,
      pageName: current.name,
      onPick: applyPickedModel,
    });
    adoptPage(current);
  }

  for (const sel of [
    '[sc-camel-on-click="{{ v.onPick }}"]',
    '[sc-camel-on-click="{{ v.onRemove }}"]',
    '[sc-camel-on-click="{{ a.onRemove }}"]',
    '[sc-camel-on-click="{{ b.onRemove }}"]',
    '[sc-camel-on-click="{{ b.onSelect }}"]',
    '[sc-camel-on-click="{{ k.onPick }}"]',
    '[sc-camel-on-click="{{ o.onPick }}"]',
    '[sc-camel-on-click="{{ m.onEdit }}"]',
    '[sc-camel-on-click="{{ m.onRemove }}"]',
    '[sc-camel-on-click="{{ nextTitle }}"]',
    '[sc-camel-on-click="{{ stop }}"]',
  ]) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ copyShareLink }}"]')?.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(livePreviewUrl());
      } catch {
        window.prompt("Lien", livePreviewUrl());
      }
    },
  );
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
  barInput?.parentElement?.parentElement?.parentElement?.classList.add("editor-canardo-dock");
  let sending = false;
  const paintCanardoBusy = (busy: boolean) => {
    const state = canardoControlState(busy);
    if (barInput) {
      barInput.disabled = state.inputDisabled;
      barInput.setAttribute("aria-busy", state.ariaBusy);
    }
    sendBtn?.setAttribute("aria-disabled", state.ariaDisabled);
    if (sendBtn) sendBtn.style.cursor = state.cursor;
  };
  paintCanardoBusy(false);
  const sendCanardo = async () => {
    const prompt = barInput?.value.trim() ?? "";
    if (!prompt || sending) return;
    sending = true;
    paintCanardoBusy(true);
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
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        document?: PageDocument;
      };
      if (!res.ok || !body.document) {
        appendConversation(canardoErrorMessage(res.status, body), false);
        return;
      }
      appendConversation(body.message ?? "Page mise à jour.", false);
      adoptPage({ ...current, document: body.document });
      showEditorToolbar();
    } catch {
      appendConversation(canardoErrorMessage(0, {}), false);
    } finally {
      sending = false;
      paintCanardoBusy(false);
      barInput?.focus();
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
  const pendingPrompt = sessionStorage.getItem("weflo-canardo-prompt");
  if (pendingPrompt) {
    sessionStorage.removeItem("weflo-canardo-prompt");
    if (barInput) barInput.value = pendingPrompt;
    void sendCanardo();
  }

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
      if (res.status === 402) {
        setPublishButtonState(false);
        showPublishPaywall();
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
      paintPublished(true);
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
