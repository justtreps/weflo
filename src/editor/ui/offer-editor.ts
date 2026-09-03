import type { EditorBlock, EditorSection, SettingValue } from "../document";
import type { EditorCommand } from "../commands";
import type { EditorState, EditorStore } from "./store";

const TIER_DEFAULTS: EditorBlock["settings"] = {
  title: "Nouveau palier",
  subtitle: "",
  badge: "",
  quantity: 1,
  discount_type: "none",
  discount_value: 0,
  product_handle: "",
  variant_id: "",
  preselected: false,
  show_variant_picker: false,
};

const COMPOSITIONS = [
  ["horizontal-cards", "Cartes horizontales"],
  ["stacked-premium", "Paliers premium"],
  ["tier-table", "Table de paliers"],
] as const;

export type OfferEditorAction =
  | { action: "select" | "preselect" | "duplicate" | "remove"; sectionId: string; blockId: string }
  | { action: "add"; sectionId: string }
  | { action: "move"; sectionId: string; blockId: string; toIndex: number }
  | { action: "setting"; sectionId: string; blockId: string; key: string; value: SettingValue }
  | { action: "composition"; sectionId: string; value: string };

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function currentPage(state: EditorState) {
  return state.document.pages.find((page) => page.id === state.pageId) ?? state.document.pages[0];
}

function selectedOfferSection(state: EditorState): EditorSection | undefined {
  return currentPage(state)?.sections.find((section) => section.id === state.selectedId && section.type === "quantity-offer");
}

function offerTiers(section: EditorSection): EditorBlock[] {
  return section.blocks.filter((block) => block.type === "offer-tier" || block.type === "offer");
}

function effectivePreselectedId(tiers: EditorBlock[]): string | undefined {
  return tiers.find((tier) => tier.settings.preselected === true)?.id ?? tiers[0]?.id;
}

function effectiveProductHandles(section: EditorSection, tiers: EditorBlock[]): string[] {
  const sectionHandle = String(section.settings.product_handle ?? "").trim().toLowerCase();
  return [...new Set(tiers.map((tier) => (String(tier.settings.product_handle ?? "").trim() || sectionHandle).toLowerCase()).filter(Boolean))];
}

function setting(block: EditorBlock, key: string, fallback: SettingValue = ""): SettingValue {
  return block.settings[key] ?? fallback;
}

function tierMarkup(section: EditorSection, block: EditorBlock, selectedBlockId: string | null, preselectedId: string | undefined, index: number, count: number): string {
  const title = String(setting(block, "title", `Palier ${index + 1}`));
  const sectionId = escapeHtml(section.id);
  const blockId = escapeHtml(block.id);
  const attributes = `data-section-id="${sectionId}" data-block-id="${blockId}"`;
  const selected = block.id === selectedBlockId;
  const checked = block.id === preselectedId;
  return `<article class="editor-offer-tier" data-offer-tier="${blockId}" ${attributes} tabindex="0" aria-label="Modifier le palier ${escapeHtml(title)}" aria-selected="${selected}">
    <header class="editor-offer-tier__header">
      <button type="button" class="editor-offer-tier__handle" data-offer-drag-handle ${attributes} draggable="${!section.locked}" aria-label="Déplacer le palier ${escapeHtml(title)}"${section.locked ? " disabled" : ""}><span aria-hidden="true">⠿</span></button>
      <button type="button" class="editor-offer-tier__select" data-offer-action="select" ${attributes}><strong>${escapeHtml(title)}</strong><small>${escapeHtml(setting(block, "subtitle", `${setting(block, "quantity", 1)} unité(s)`))}</small></button>
      <label class="editor-offer-tier__default"><input type="radio" name="offer-preselected-${sectionId}" data-offer-setting="preselected" ${attributes}${checked ? " checked" : ""}${section.locked ? " disabled" : ""}>Par défaut</label>
    </header>
    <div class="editor-offer-tier__fields">
      <label><span>Nom</span><input type="text" value="${escapeHtml(title)}" data-offer-setting="title" ${attributes}${section.locked ? " disabled" : ""}></label>
      <label><span>Badge</span><input type="text" value="${escapeHtml(setting(block, "badge"))}" placeholder="Le plus choisi" data-offer-setting="badge" ${attributes}${section.locked ? " disabled" : ""}></label>
      <div class="editor-offer-quantity"><span>Quantité</span><div><button type="button" data-offer-action="quantity-down" ${attributes} aria-label="Diminuer la quantité du palier ${escapeHtml(title)}"${Number(setting(block, "quantity", 1)) <= 1 || section.locked ? " disabled" : ""}>−</button><input type="number" min="1" step="1" value="${escapeHtml(setting(block, "quantity", 1))}" data-offer-setting="quantity" ${attributes} aria-label="Quantité du palier ${escapeHtml(title)}"${section.locked ? " disabled" : ""}><button type="button" data-offer-action="quantity-up" ${attributes} aria-label="Augmenter la quantité du palier ${escapeHtml(title)}"${section.locked ? " disabled" : ""}>+</button></div></div>
      <label><span>Remise</span><select data-offer-setting="discount_type" ${attributes}${section.locked ? " disabled" : ""}>${[["none", "Aucune"], ["percentage", "Pourcentage"], ["amount", "Montant fixe"]].map(([value, label]) => `<option value="${value}"${setting(block, "discount_type", "none") === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label><span>Valeur</span><input type="number" min="0" step="0.01" value="${escapeHtml(setting(block, "discount_value", 0))}" data-offer-setting="discount_value" ${attributes}${section.locked ? " disabled" : ""}></label>
      <label><span>Produit Shopify</span><input type="text" value="${escapeHtml(setting(block, "product_handle"))}" placeholder="handle-produit" data-offer-setting="product_handle" ${attributes}${section.locked ? " disabled" : ""}></label>
      <label><span>Variante Shopify</span><input type="text" value="${escapeHtml(setting(block, "variant_id"))}" placeholder="ID de variante" data-offer-setting="variant_id" ${attributes}${section.locked ? " disabled" : ""}></label>
      <label class="editor-offer-tier__toggle"><input type="checkbox" data-offer-setting="show_variant_picker" ${attributes}${setting(block, "show_variant_picker", false) === true ? " checked" : ""}${section.locked ? " disabled" : ""}>Afficher le choix de variante</label>
    </div>
    <footer><button type="button" data-offer-action="move-up" ${attributes} aria-label="Monter le palier ${escapeHtml(title)}"${index === 0 || section.locked ? " disabled" : ""}>↑</button><button type="button" data-offer-action="move-down" ${attributes} aria-label="Descendre le palier ${escapeHtml(title)}"${index === count - 1 || section.locked ? " disabled" : ""}>↓</button><button type="button" data-offer-action="duplicate" ${attributes}${section.locked ? " disabled" : ""}>Dupliquer</button><button type="button" data-offer-action="remove" ${attributes} aria-label="Supprimer le palier ${escapeHtml(title)}"${count === 1 || section.locked ? " disabled" : ""}>Supprimer</button></footer>
  </article>`;
}

export function offerEditorMarkup(state: EditorState): string {
  const section = selectedOfferSection(state);
  if (!section) return "";
  const tiers = offerTiers(section);
  const preselectedId = effectivePreselectedId(tiers);
  const mixedProducts = effectiveProductHandles(section, tiers).length > 1;
  const composition = String(section.settings.variant ?? section.variantId ?? "horizontal-cards");
  return `<section class="editor-offer" data-offer-editor data-section-id="${escapeHtml(section.id)}">
    <header class="editor-offer__heading"><div><h2>Offres et bundles</h2><p>Compose tes paliers de quantité et relie-les à Shopify.</p></div><button type="button" data-offer-action="add" data-section-id="${escapeHtml(section.id)}"${section.locked ? " disabled" : ""}>Ajouter un palier</button></header>
    <label class="editor-offer__composition"><span>Composition</span><select data-offer-composition="${escapeHtml(composition)}" data-section-id="${escapeHtml(section.id)}"${section.locked ? " disabled" : ""}>${COMPOSITIONS.map(([value, label]) => `<option value="${value}"${composition === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
    <aside class="editor-offer__capability" data-offer-capability="${mixedProducts ? "app-required" : "native"}" role="status"><strong>${mixedProducts ? "Offre multi-produits" : "Offre quantité native"}</strong><span>${mixedProducts ? "Une application Shopify est requise pour combiner plusieurs produits." : "Compatible avec le panier Shopify natif."}</span></aside>
    <div class="editor-offer__tiers" role="list">${tiers.map((block, index) => tierMarkup(section, block, state.selectedBlockId, preselectedId, index, tiers.length)).join("")}</div>
    ${tiers.length ? "" : '<p class="editor-offer__empty">Ajoute un palier pour commencer ton offre.</p>'}
  </section>`;
}

function uniqueBlockId(state: EditorState, base: string): string {
  const ids = new Set(state.document.pages.flatMap((page) => page.sections.flatMap((section) => section.blocks.map((block) => block.id))));
  let candidate = base;
  let suffix = 2;
  while (ids.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function sectionById(state: EditorState, sectionId: string): EditorSection | undefined {
  return state.document.pages.flatMap((page) => page.sections).find((section) => section.id === sectionId);
}

function exclusivePreselection(section: EditorSection, preferredId?: string): EditorCommand | undefined {
  const tiers = offerTiers(section);
  const chosen = preferredId && tiers.some((tier) => tier.id === preferredId)
    ? preferredId
    : effectivePreselectedId(tiers);
  return chosen ? { type: "setExclusiveBlockSetting", sectionId: section.id, blockId: chosen, key: "preselected" } : undefined;
}

function transaction(commands: Array<EditorCommand | undefined>): EditorCommand {
  return { type: "transaction", commands: commands.filter((command): command is EditorCommand => command !== undefined) };
}

export function runOfferEditorAction(store: EditorStore, action: OfferEditorAction): void {
  const section = sectionById(store.getState(), action.sectionId);
  if (!section || section.type !== "quantity-offer") return;
  if (action.action === "select") {
    store.setState({ selectedId: action.sectionId, selectedBlockId: action.blockId, rightCollapsed: false });
    return;
  }
  if (section.locked) return;
  if (action.action === "composition") {
    if (COMPOSITIONS.some(([value]) => value === action.value)) store.dispatch({ type: "updateSetting", sectionId: action.sectionId, key: "variant", value: action.value });
    return;
  }
  if (action.action === "setting") {
    if (action.key === "preselected") {
      store.dispatch({ type: "setExclusiveBlockSetting", sectionId: action.sectionId, blockId: action.blockId, key: "preselected" });
      return;
    }
    store.dispatch({ type: "updateBlockSetting", sectionId: action.sectionId, blockId: action.blockId, key: action.key, value: action.value });
    return;
  }
  if (action.action === "preselect") {
    store.dispatch({ type: "setExclusiveBlockSetting", sectionId: action.sectionId, blockId: action.blockId, key: "preselected" });
    store.setState({ selectedId: action.sectionId, selectedBlockId: action.blockId });
    return;
  }
  if (action.action === "add") {
    const id = uniqueBlockId(store.getState(), "offer-tier-1");
    const tiers = offerTiers(section);
    const chosen = effectivePreselectedId(tiers) ?? id;
    store.dispatch(transaction([
      { type: "insertBlock", sectionId: action.sectionId, index: section.blocks.length, block: { id, type: "offer-tier", settings: { ...TIER_DEFAULTS, preselected: false } } },
      { type: "setExclusiveBlockSetting", sectionId: action.sectionId, blockId: chosen, key: "preselected" },
    ]));
    store.setState({ selectedId: action.sectionId, selectedBlockId: id, rightCollapsed: false });
    return;
  }
  if (action.action === "duplicate") {
    const sourceIndex = section.blocks.findIndex((block) => block.id === action.blockId);
    if (sourceIndex < 0) return;
    const id = uniqueBlockId(store.getState(), `${action.blockId}-copy`);
    store.dispatch(transaction([
      { type: "duplicateBlock", sectionId: action.sectionId, blockId: action.blockId, newBlockId: id, index: sourceIndex + 1 },
      exclusivePreselection(section),
    ]));
    store.setState({ selectedId: action.sectionId, selectedBlockId: id, rightCollapsed: false });
    return;
  }
  if (action.action === "remove") {
    const tiers = offerTiers(section);
    if (tiers.length <= 1 || !tiers.some((tier) => tier.id === action.blockId)) return;
    const index = tiers.findIndex((tier) => tier.id === action.blockId);
    const wasSelected = action.blockId === store.getState().selectedBlockId;
    const remaining = tiers.filter((tier) => tier.id !== action.blockId);
    const nextId = remaining[Math.min(index, remaining.length - 1)]?.id;
    const chosen = effectivePreselectedId(remaining) ?? nextId;
    store.dispatch(transaction([
      { type: "removeBlock", sectionId: action.sectionId, blockId: action.blockId },
      chosen ? { type: "setExclusiveBlockSetting", sectionId: action.sectionId, blockId: chosen, key: "preselected" } : undefined,
    ]));
    if (wasSelected) store.setState({ selectedBlockId: nextId ?? null });
    return;
  }
  if (action.action === "move") {
    if (Number.isInteger(action.toIndex) && action.toIndex >= 0 && action.toIndex <= section.blocks.length) {
      store.dispatch({ type: "moveBlock", sectionId: action.sectionId, blockId: action.blockId, toIndex: action.toIndex });
      store.setState({ selectedId: action.sectionId, selectedBlockId: action.blockId });
    }
  }
}

function eventTarget(event: Event, selector: string): HTMLElement | null {
  return (event.target as HTMLElement | null)?.closest?.(selector) ?? null;
}

function blockLocation(store: EditorStore, sectionId: string, blockId: string) {
  const section = sectionById(store.getState(), sectionId);
  const index = section?.blocks.findIndex((block) => block.id === blockId) ?? -1;
  return section && index >= 0 ? { section, index, block: section.blocks[index] } : undefined;
}

export function bindOfferEditor(root: HTMLElement, store: EditorStore): () => void {
  const click = (event: Event) => {
    const target = eventTarget(event, "[data-offer-action],[data-offer-tier]");
    if (!target) return;
    const sectionId = target.dataset.sectionId;
    const blockId = target.dataset.blockId;
    const action = target.dataset.offerAction;
    if (!sectionId) return;
    if (!action && blockId) {
      runOfferEditorAction(store, { action: "select", sectionId, blockId });
      return;
    }
    if (action === "add") runOfferEditorAction(store, { action, sectionId });
    if ((action === "select" || action === "duplicate" || action === "remove") && blockId) {
      runOfferEditorAction(store, { action, sectionId, blockId });
    }
    if ((action === "quantity-up" || action === "quantity-down") && blockId) {
      const location = blockLocation(store, sectionId, blockId);
      if (!location) return;
      const current = Math.max(1, Math.round(Number(location.block.settings.quantity) || 1));
      runOfferEditorAction(store, { action: "setting", sectionId, blockId, key: "quantity", value: Math.max(1, current + (action === "quantity-up" ? 1 : -1)) });
    }
    if ((action === "move-up" || action === "move-down") && blockId) {
      const location = blockLocation(store, sectionId, blockId);
      if (!location) return;
      const toIndex = action === "move-up" ? location.index - 1 : location.index + 2;
      if (toIndex >= 0 && toIndex <= location.section.blocks.length) runOfferEditorAction(store, { action: "move", sectionId, blockId, toIndex });
    }
  };

  const change = (event: Event) => {
    const composition = eventTarget(event, "[data-offer-composition]") as HTMLSelectElement | null;
    if (composition?.dataset.sectionId) {
      runOfferEditorAction(store, { action: "composition", sectionId: composition.dataset.sectionId, value: composition.value });
      return;
    }
    const control = eventTarget(event, "[data-offer-setting]") as HTMLInputElement | HTMLSelectElement | null;
    const sectionId = control?.dataset.sectionId;
    const blockId = control?.dataset.blockId;
    const key = control?.dataset.offerSetting;
    if (!control || !sectionId || !blockId || !key) return;
    if (key === "preselected") {
      if ((control as HTMLInputElement).checked) runOfferEditorAction(store, { action: "preselect", sectionId, blockId });
      return;
    }
    const value: SettingValue = control.type === "checkbox"
      ? (control as HTMLInputElement).checked
      : key === "quantity"
        ? Math.max(1, Math.round(Number(control.value) || 1))
        : key === "discount_value"
          ? Math.max(0, Number(control.value) || 0)
          : control.value;
    runOfferEditorAction(store, { action: "setting", sectionId, blockId, key, value });
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if ((event.target as HTMLElement | null)?.closest?.("input,select,textarea,button")) return;
    const row = eventTarget(event, "[data-offer-tier]");
    const sectionId = row?.dataset.sectionId;
    const blockId = row?.dataset.blockId;
    if (!sectionId || !blockId) return;
    const location = blockLocation(store, sectionId, blockId);
    if (!location) return;
    const toIndex = event.key === "ArrowUp" ? location.index - 1 : location.index + 2;
    if (toIndex < 0 || toIndex > location.section.blocks.length) return;
    event.preventDefault();
    runOfferEditorAction(store, { action: "move", sectionId, blockId, toIndex });
  };

  const dragstart = (event: DragEvent) => {
    const handle = eventTarget(event, "[data-offer-drag-handle]");
    if (!handle?.dataset.sectionId || !handle.dataset.blockId || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${handle.dataset.sectionId}:${handle.dataset.blockId}`);
  };

  const dragover = (event: DragEvent) => {
    if (!eventTarget(event, "[data-offer-tier]")) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  };

  const drop = (event: DragEvent) => {
    const row = eventTarget(event, "[data-offer-tier]");
    const destinationSectionId = row?.dataset.sectionId;
    const destinationBlockId = row?.dataset.blockId;
    const payload = event.dataTransfer?.getData("text/plain") ?? "";
    const separator = payload.indexOf(":");
    const sectionId = payload.slice(0, separator);
    const blockId = payload.slice(separator + 1);
    if (!destinationSectionId || !destinationBlockId || separator < 1 || sectionId !== destinationSectionId || blockId === destinationBlockId) return;
    const source = blockLocation(store, sectionId, blockId);
    const destination = blockLocation(store, sectionId, destinationBlockId);
    if (!source || !destination) return;
    event.preventDefault();
    runOfferEditorAction(store, { action: "move", sectionId, blockId, toIndex: source.index < destination.index ? destination.index + 1 : destination.index });
  };

  root.addEventListener("click", click);
  root.addEventListener("change", change);
  root.addEventListener("keydown", keydown);
  root.addEventListener("dragstart", dragstart);
  root.addEventListener("dragover", dragover);
  root.addEventListener("drop", drop);
  return () => {
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
    root.removeEventListener("keydown", keydown);
    root.removeEventListener("dragstart", dragstart);
    root.removeEventListener("dragover", dragover);
    root.removeEventListener("drop", drop);
  };
}
