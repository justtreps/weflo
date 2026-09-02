import { blankDocument, documentFromModel, PAGE_MODELS } from "../lib/catalog";
import { renderDocument } from "../lib/render-document";

export const MODEL_THEMES = [
  "Tout", "Nutrition", "Café & épicerie", "Beauté & soin",
  "Maison & céramique", "Mode & accessoires", "Sport & plein air",
] as const;

export type GalleryItem = {
  id: string;
  name: string;
  brand: string;
  theme: string;
  description: string;
  previewDesktop?: string;
  previewMobile?: string;
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function galleryItems(theme: string): GalleryItem[] {
  const blank: GalleryItem = {
    id: "blank",
    name: "Partir d’une page vierge",
    brand: "Structure libre",
    theme: "Tout",
    description: "Une base propre à construire section par section, seul ou avec Canardo.",
  };
  const models = PAGE_MODELS
    .filter((model) => theme === "Tout" || model.theme === theme)
    .map((model) => ({
      id: model.id,
      name: model.name,
      brand: model.brand,
      theme: model.theme,
      description: model.description,
      previewDesktop: model.previewDesktop,
      previewMobile: model.previewMobile,
    }));
  return [blank, ...models];
}

export function renderGalleryMarkup(items: GalleryItem[]): string {
  return items.map((item) => {
    const preview = item.id === "blank"
      ? `<iframe data-model-preview="blank" title="Aperçu d’une page vierge" tabindex="-1"></iframe>`
      : `<img class="model-card__capture" src="${escapeHtml(item.previewDesktop ?? "")}" data-preview-desktop="${escapeHtml(item.previewDesktop ?? "")}" data-preview-mobile="${escapeHtml(item.previewMobile ?? "")}" alt="Aperçu du modèle ${escapeHtml(item.name)}">`;
    return `
    <button class="model-card${item.id === "blank" ? " model-card--blank" : ""}" type="button" data-model-id="${escapeHtml(item.id)}" aria-label="Choisir ${escapeHtml(item.name)}">
      <span class="model-card__preview">
        ${preview}
        <span class="model-card__action">Utiliser ce modèle <span aria-hidden="true">↗</span></span>
      </span>
      <span class="model-card__meta">
        <span class="model-card__theme">${escapeHtml(item.id === "blank" ? "Commencer de zéro" : item.theme)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <span class="model-card__brand">${escapeHtml(item.brand)}</span>
        <span class="model-card__description">${escapeHtml(item.description)}</span>
      </span>
    </button>`;
  }).join("");
}

const GALLERY_CSS = `
  [data-empty-scroll="1"]{background:#FAFAF8!important;padding:0 0 170px!important;align-items:stretch!important}
  .model-gallery{width:min(1320px,calc(100% - 72px));margin:0 auto;padding:66px 0 90px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#141310}
  .model-gallery__header{display:grid;grid-template-columns:minmax(0,760px) auto;gap:24px;align-items:end;margin-bottom:42px}
  .model-gallery__eyebrow{margin:0 0 13px;font-size:11px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:#75736C}
  .model-gallery h1{margin:0;font-size:clamp(38px,4vw,62px);line-height:.96;letter-spacing:-.055em;font-weight:760}
  .model-gallery__intro{max-width:610px;margin:18px 0 0;color:#625F58;font-size:17px;line-height:1.55}
  .model-gallery__count{align-self:start;padding:10px 13px;border:1px solid #D8D5CE;border-radius:999px;background:#FFF;font-size:12px;font-weight:650;white-space:nowrap}
  .model-gallery__tools{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0 24px;border-top:1px solid #DEDCD6}
  .model-gallery__filters{display:flex;gap:7px;overflow:auto;padding:2px;scrollbar-width:none}
  .model-gallery__filters::-webkit-scrollbar{display:none}
  .model-filter{flex:none;border:1px solid transparent;border-radius:999px;background:transparent;padding:9px 13px;color:#6B6861;font:650 13px/1 inherit;cursor:pointer}
  .model-filter[aria-pressed="true"]{border-color:#141310;background:#141310;color:#FFF}
  .model-gallery__viewport{display:flex;gap:4px;padding:4px;border:1px solid #DEDCD6;border-radius:10px;background:#FFF}
  .model-viewport{width:34px;height:30px;border:0;border-radius:7px;background:transparent;color:#75736C;cursor:pointer;font-size:15px}
  .model-viewport[aria-pressed="true"]{background:#FBC531;color:#141310}
  .model-gallery__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:start}
  .model-card{min-width:0;padding:0;border:1px solid #DEDCD6;border-radius:16px;background:#FFF;color:#141310;text-align:left;overflow:hidden;cursor:pointer;transition:transform .22s cubic-bezier(.32,.72,0,1),box-shadow .22s,border-color .22s}
  .model-card:hover{transform:translateY(-5px);border-color:#141310;box-shadow:0 16px 38px rgba(20,19,16,.1)}
  .model-card:focus-visible,.model-filter:focus-visible,.model-viewport:focus-visible{outline:3px solid #315CFF;outline-offset:3px}
  .model-card[aria-busy="true"]{opacity:.62;cursor:wait}
  .model-card__preview{position:relative;display:block;height:255px;overflow:hidden;border-bottom:1px solid #DEDCD6;background:#EEECE6}
  .model-card__preview iframe{display:block;width:1024px;height:760px;border:0;pointer-events:none;transform:scale(.285);transform-origin:top left;background:#FFF}
  .model-card__capture{position:absolute;inset:0 auto auto 0;display:block;width:100%;height:auto;min-height:100%;object-fit:cover;object-position:top;transition:transform 3.8s linear;will-change:transform}
  .model-card:hover .model-card__capture,.model-card:focus-visible .model-card__capture{transform:translateY(calc(-100% + 255px))}
  .model-card__action{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-radius:9px;background:#141310;color:#FFF;font-size:12px;font-weight:720;opacity:0;transform:translateY(8px);transition:opacity .18s,transform .18s}
  .model-card:hover .model-card__action,.model-card:focus-visible .model-card__action{opacity:1;transform:none}
  .model-card__meta{display:flex;flex-direction:column;min-height:184px;padding:17px}
  .model-card__theme{margin-bottom:11px;color:#8A867E;font-size:9px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}
  .model-card__meta strong{font-size:17px;line-height:1.15;letter-spacing:-.025em}
  .model-card__brand{margin-top:5px;color:#6F6B64;font-size:12px;font-weight:650}
  .model-card__description{margin-top:13px;color:#75736C;font-size:12px;line-height:1.45}
  .model-card--blank{border-color:#C9A118;background:#FFF9DF}
  .model-card--blank .model-card__preview{background:#FBC531}
  .model-card--blank .model-card__preview:after{content:"+";position:absolute;inset:50% auto auto 50%;display:grid;place-items:center;width:64px;height:64px;transform:translate(-50%,-50%);border:1px solid #141310;border-radius:50%;background:#FFF;font-size:34px;font-weight:300;box-shadow:8px 8px 0 #141310}
  .model-card--blank iframe{opacity:.24}
  .model-gallery[data-viewport="mobile"] .model-card__preview iframe{width:390px;height:844px;transform:scale(.302);transform-origin:top center;margin-left:50%;translate:-50% 0}
  .model-gallery[data-viewport="mobile"] .model-card:hover .model-card__capture,.model-gallery[data-viewport="mobile"] .model-card:focus-visible .model-card__capture{transform:translateY(calc(-100% + 275px))}
  .model-gallery[data-viewport="mobile"] .model-card__preview{height:275px}
  .model-gallery__error{margin:22px 0 0;padding:14px 16px;border:1px solid #D65D4A;border-radius:10px;background:#FFF0ED;color:#7A2418;font-size:14px}
  @media(max-width:1150px){.model-gallery__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:840px){.model-gallery{width:min(100% - 30px,1320px);padding-top:36px}.model-gallery__header{grid-template-columns:1fr}.model-gallery__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.model-gallery__tools{align-items:flex-start}.model-card__preview iframe{transform:scale(.32)}}
  @media(max-width:560px){
    .editor-gallery-stage{left:0!important;right:0!important;top:72px!important;padding:0 8px!important}
    .editor-gallery-frame{border-radius:14px 14px 0 0!important}
    .editor-gallery-sidebar{display:none!important}
    .editor-canardo-dock{left:12px!important;right:12px!important;bottom:14px!important}
    .editor-canardo-dock>div{width:100%!important}
    .editor-canardo-dock>div>div{width:100%!important;height:64px!important;border-radius:20px!important;padding-left:10px!important;gap:8px!important}
    .editor-canardo-dock input{font-size:15px!important}
    .model-gallery{width:min(100% - 30px,1320px);padding-top:34px}
    .model-gallery__grid{grid-template-columns:1fr}
    .model-gallery__tools{display:block}
    .model-gallery__viewport{width:max-content;margin-top:12px}
    .model-card__preview{height:330px}
    .model-card__preview iframe{transform:scale(.42)}
    .model-card__meta{min-height:auto}
    .model-gallery h1{font-size:40px}
  }
  @media(prefers-reduced-motion:reduce){.model-card,.model-card__action{transition:none!important}}
`;

export type EditorGallery = {
  setOpen(open: boolean): void;
  showError(message: string): void;
  clearError(): void;
};

export function mountEditorGallery(options: {
  root: HTMLElement;
  pageName: string;
  onPick(id: string): Promise<void>;
}): EditorGallery {
  options.root.parentElement?.classList.add("editor-gallery-canvas");
  options.root.parentElement?.parentElement?.classList.add("editor-gallery-frame");
  options.root.parentElement?.parentElement?.parentElement?.classList.add("editor-gallery-stage");
  const pagesButton = document.querySelector<HTMLElement>('[title="Toutes les pages"]');
  pagesButton?.closest("sc-for")?.parentElement?.parentElement?.parentElement?.classList.add("editor-gallery-sidebar");
  if (!document.querySelector("style[data-editor-gallery-style]")) {
    const style = document.createElement("style");
    style.dataset.editorGalleryStyle = "1";
    style.textContent = GALLERY_CSS;
    document.head.appendChild(style);
  }
  options.root.innerHTML = `<section class="model-gallery" data-editor-gallery data-viewport="desktop" aria-labelledby="model-gallery-title">
    <header class="model-gallery__header"><div><p class="model-gallery__eyebrow">Nouvelle page · Weflo studio</p><h1 id="model-gallery-title">Choisis un point de départ.</h1><p class="model-gallery__intro">Pars d’un modèle pensé pour ton univers, ouvre une page vierge ou décris directement ton objectif à Canardo.</p></div><span class="model-gallery__count">18 modèles + page vierge</span></header>
    <div class="model-gallery__tools"><div class="model-gallery__filters" data-gallery-filters aria-label="Filtrer les modèles"></div><div class="model-gallery__viewport" aria-label="Format des aperçus"><button class="model-viewport" data-gallery-viewport="desktop" aria-pressed="true" title="Bureau">▰</button><button class="model-viewport" data-gallery-viewport="mobile" aria-pressed="false" title="Mobile">▯</button></div></div>
    <div class="model-gallery__grid" data-gallery-grid aria-live="polite"></div><p class="model-gallery__error" data-gallery-error role="alert" hidden></p>
  </section>`;
  const gallery = options.root.querySelector<HTMLElement>("[data-editor-gallery]")!;
  const filters = gallery.querySelector<HTMLElement>("[data-gallery-filters]")!;
  const grid = gallery.querySelector<HTMLElement>("[data-gallery-grid]")!;
  const error = gallery.querySelector<HTMLElement>("[data-gallery-error]")!;
  let activeTheme = "Tout";

  const paintPreviews = () => {
    grid.querySelectorAll<HTMLIFrameElement>("iframe[data-model-preview]").forEach((frame) => {
      const id = frame.dataset.modelPreview ?? "blank";
      const model = PAGE_MODELS.find((candidate) => candidate.id === id);
      const doc = id === "blank" ? blankDocument(options.pageName) : documentFromModel(id, model?.name ?? options.pageName);
      frame.srcdoc = renderDocument(doc, { compact: true });
    });
  };
  const paintViewport = (viewport: string) => {
    grid.querySelectorAll<HTMLImageElement>("img[data-preview-desktop]").forEach((image) => {
      image.src = viewport === "mobile" ? image.dataset.previewMobile ?? image.src : image.dataset.previewDesktop ?? image.src;
    });
  };
  const bindCards = () => {
    grid.querySelectorAll<HTMLButtonElement>("button[data-model-id]").forEach((card) => {
      card.addEventListener("click", async () => {
        if (card.getAttribute("aria-busy") === "true") return;
        error.hidden = true;
        card.setAttribute("aria-busy", "true");
        card.disabled = true;
        try {
          await options.onPick(card.dataset.modelId ?? "blank");
        } catch {
          card.disabled = false;
          card.removeAttribute("aria-busy");
          error.textContent = "La page n’a pas pu être créée. Vérifie ta connexion puis réessaie.";
          error.hidden = false;
        }
      });
    });
  };
  const renderGrid = () => {
    grid.innerHTML = renderGalleryMarkup(galleryItems(activeTheme));
    paintPreviews();
    paintViewport(gallery.dataset.viewport ?? "desktop");
    bindCards();
  };
  filters.innerHTML = MODEL_THEMES.map((theme) => `<button class="model-filter" type="button" data-gallery-theme="${escapeHtml(theme)}" aria-pressed="${theme === activeTheme}">${escapeHtml(theme)}</button>`).join("");
  filters.querySelectorAll<HTMLButtonElement>("[data-gallery-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTheme = button.dataset.galleryTheme ?? "Tout";
      filters.querySelectorAll<HTMLButtonElement>("[data-gallery-theme]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      renderGrid();
    });
  });
  gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-viewport]").forEach((button) => {
    button.addEventListener("click", () => {
      const viewport = button.dataset.galleryViewport ?? "desktop";
      gallery.dataset.viewport = viewport;
      paintViewport(viewport);
      gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-viewport]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
  renderGrid();
  return {
    setOpen(open) { options.root.style.setProperty("display", open ? "block" : "none", "important"); },
    showError(message) { error.textContent = message; error.hidden = false; },
    clearError() { error.hidden = true; error.textContent = ""; },
  };
}
