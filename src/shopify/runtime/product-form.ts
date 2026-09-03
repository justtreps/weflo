type ShopifyVariant = { id: number | string; options?: string[]; price?: number; compare_at_price?: number | null; available?: boolean };

export type WefloProductRuntimeEnvironment = {
  host?: Record<string, unknown>;
  AbortController?: typeof AbortController;
  MutationObserver?: typeof MutationObserver;
  CustomEvent?: typeof CustomEvent;
  FormData?: typeof FormData;
  fetch?: typeof fetch;
};

export type WefloProductRuntime = {
  mount(root: HTMLElement): void;
  initialize(scope?: ParentNode): void;
  unmount(scope: ParentNode): void;
  destroy(): void;
};

/** Canonical implementation used directly and serialized into the Shopify asset. */
export function createWefloProductRuntime(
  targetDocument: Document,
  environment: WefloProductRuntimeEnvironment = {},
): WefloProductRuntime {
  const host = environment.host ?? globalThis as unknown as Record<string, unknown>;
  const singletonKey = "__wfProductRuntime";
  const existing = host[singletonKey] as WefloProductRuntime | undefined;
  if (existing) return existing;

  const AbortControllerConstructor = environment.AbortController ?? host.AbortController as typeof AbortController | undefined;
  const MutationObserverConstructor = environment.MutationObserver ?? host.MutationObserver as typeof MutationObserver | undefined;
  const CustomEventConstructor = environment.CustomEvent ?? host.CustomEvent as typeof CustomEvent | undefined;
  const FormDataConstructor = environment.FormData ?? host.FormData as typeof FormData | undefined;
  const fetcher = environment.fetch ?? host.fetch as typeof fetch | undefined;
  const InputConstructor = host.HTMLInputElement as typeof HTMLInputElement | undefined;
  const mountedRoots = new Set<HTMLElement>();

  const rootsIn = (scope: ParentNode): HTMLElement[] => {
    const roots: HTMLElement[] = [];
    const candidate = scope as ParentNode & { matches?: (selector: string) => boolean };
    if (candidate.matches?.("[data-wf-product]")) roots.push(candidate as unknown as HTMLElement);
    if (typeof scope.querySelectorAll === "function") roots.push(...Array.from(scope.querySelectorAll<HTMLElement>("[data-wf-product]")));
    return [...new Set(roots)];
  };

  const money = (cents: number): string => {
    const shopify = host.Shopify as { currency?: { active?: string } } | undefined;
    try {
      return new Intl.NumberFormat(targetDocument.documentElement.lang || "fr-FR", { style: "currency", currency: shopify?.currency?.active || "EUR" }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} €`;
    }
  };

  const variantsFor = (root: HTMLElement): ShopifyVariant[] => {
    const source = root.querySelector<HTMLScriptElement>("[data-wf-variants]");
    if (!source?.textContent) return [];
    try {
      const value = JSON.parse(source.textContent);
      return Array.isArray(value) ? value as ShopifyVariant[] : [];
    } catch {
      return [];
    }
  };

  const isLocked = (form: HTMLElement): boolean => form.dataset.wfNativeCheckoutLocked === "true";

  const syncTierVariant = (form: HTMLFormElement, choice: HTMLElement): boolean => {
    const variantId = choice.dataset.wfVariantId?.trim();
    const input = form.querySelector<HTMLInputElement>("[data-wf-variant-input]");
    if (!variantId || !input) return false;
    input.value = variantId;
    return true;
  };

  const mount = (root: HTMLElement): void => {
    if (root.dataset.wfMounted === "true") return;
    const form = root.querySelector<HTMLFormElement>("form[data-wf-product-form], form.wf-product__form");
    if (!form || !AbortControllerConstructor) return;

    root.dataset.wfMounted = "true";
    mountedRoots.add(root);
    const controller = new AbortControllerConstructor();
    const signal = controller.signal;
    const submit = form.querySelector<HTMLButtonElement>("[data-wf-add-to-cart]");
    const variants = variantsFor(root);
    let busy = false;
    let currentVariantAvailable = true;

    if (root.querySelector("[data-wf-native-checkout-lock]")) form.dataset.wfNativeCheckoutLocked = "true";

    const choices = () => Array.from(root.querySelectorAll<HTMLInputElement>("[data-wf-quantity][data-wf-variant-id]"));
    const setChoiceState = (choice: HTMLInputElement, checked: boolean): void => {
      choice.checked = checked;
      choice.closest<HTMLElement>(".wf-quantity-offer__tier")?.classList.toggle("is-selected", checked);
    };
    const normalizeTierSelection = (): HTMLInputElement | undefined => {
      const all = choices();
      let selected = all.find((choice) => choice.checked && !choice.disabled);
      selected ??= all.find((choice) => !choice.disabled);
      for (const choice of all) setChoiceState(choice, choice === selected);
      return selected;
    };
    const selectedTierAvailable = (): boolean => {
      if (root.dataset.wfPurchaseStrategy !== "multipack") return true;
      const selected = choices().find((choice) => choice.checked);
      return Boolean(selected && !selected.disabled && selected.dataset.wfAvailable !== "false");
    };
    const refreshSubmit = (): void => {
      const disabled = busy || isLocked(form) || !currentVariantAvailable || !selectedTierAvailable();
      if (submit && submit.disabled !== disabled) submit.disabled = disabled;
    };
    const selectTier = (choice: HTMLInputElement): void => {
      if (choice.disabled) return;
      for (const candidate of choices()) setChoiceState(candidate, candidate === choice);
      syncTierVariant(form, choice);
      refreshSubmit();
    };

    const update = (): void => {
      const optionValues = Array.from(root.querySelectorAll<HTMLSelectElement>("[data-wf-option-index]")).map((select) => select.value);
      const current = variants.find((variant) => optionValues.every((choice, index) => variant.options?.[index] === choice)) ?? variants[0];
      if (current) {
        const id = form.querySelector<HTMLInputElement>("[data-wf-variant-input]");
        if (id) id.value = String(current.id);
        const price = root.querySelector<HTMLElement>("[data-wf-price]");
        if (price && typeof current.price === "number") price.textContent = money(current.price);
        const compare = root.querySelector<HTMLElement>("[data-wf-compare-price]");
        if (compare) {
          const visible = typeof current.compare_at_price === "number" && current.compare_at_price > (current.price ?? 0);
          compare.hidden = !visible;
          if (visible) compare.textContent = money(current.compare_at_price!);
        }
        const availability = root.querySelector<HTMLElement>("[data-wf-availability]");
        if (availability) availability.textContent = current.available ? "En stock" : "Indisponible";
        currentVariantAvailable = current.available !== false;
        if (CustomEventConstructor) root.dispatchEvent(new CustomEventConstructor("weflo:variant:change", { bubbles: true, detail: { variant: current } }));
      }
      const selected = normalizeTierSelection();
      if (selected) syncTierVariant(form, selected);
      refreshSubmit();
    };

    root.querySelectorAll<HTMLSelectElement>("[data-wf-option-index]").forEach((select) => select.addEventListener("change", update, { signal }));
    root.querySelectorAll<HTMLElement>("[data-wf-quantity]").forEach((control) => control.addEventListener("click", () => {
      if (InputConstructor && control instanceof InputConstructor && control.matches("[data-wf-variant-id]")) {
        selectTier(control as HTMLInputElement);
        return;
      }
      const number = Number(control.dataset.wfQuantity);
      const quantity = Number.isFinite(number) ? Math.min(99, Math.max(1, Math.round(number))) : 1;
      const input = form.querySelector<HTMLInputElement>("[data-wf-quantity-input]");
      if (input) {
        input.value = String(quantity);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, { signal }));
    choices().forEach((choice) => choice.addEventListener("change", () => {
      if (choice.checked) selectTier(choice);
    }, { signal }));
    root.querySelectorAll<HTMLSelectElement>("[data-wf-tier-variant-select]").forEach((select) => select.addEventListener("change", () => {
      const choice = choices().find((candidate) => candidate.dataset.wfTierId === select.dataset.wfTierId);
      const selectedOption = select.options[select.selectedIndex];
      if (!choice || !selectedOption || selectedOption.disabled) return;
      choice.dataset.wfVariantId = select.value.trim();
      choice.dataset.wfAvailable = selectedOption.dataset.wfAvailable ?? "true";
      choice.disabled = choice.dataset.wfAvailable === "false";
      if (choice.checked) selectTier(choice);
      refreshSubmit();
    }, { signal }));

    form.addEventListener("submit", async (event) => {
      if (isLocked(form) || !selectedTierAvailable() || !currentVariantAvailable) {
        event.preventDefault();
        event.stopImmediatePropagation();
        refreshSubmit();
        return;
      }
      if (!fetcher || !FormDataConstructor || root.dataset.wfAjax === "false") return;
      event.preventDefault();
      busy = true;
      refreshSubmit();
      try {
        const response = await fetcher.call(host, "/cart/add.js", { method: "POST", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body: new FormDataConstructor(form) });
        if (!response.ok) throw new Error("cart_add_failed");
        const item = await response.json();
        if (CustomEventConstructor) {
          targetDocument.dispatchEvent(new CustomEventConstructor("weflo:cart:add", { bubbles: true, detail: { item, sectionId: root.dataset.wfSectionId } }));
          targetDocument.dispatchEvent(new CustomEventConstructor("cart:refresh", { bubbles: true }));
        }
      } catch {
        if (!isLocked(form) && selectedTierAvailable() && currentVariantAvailable) form.submit();
      } finally {
        busy = false;
        refreshSubmit();
      }
    }, { signal });

    let observer: MutationObserver | undefined;
    if (submit && MutationObserverConstructor && isLocked(form)) {
      observer = new MutationObserverConstructor(() => refreshSubmit());
      observer.observe(submit, { attributes: true, attributeFilter: ["disabled"] });
    }
    (root as HTMLElement & { __wfProductLifecycle?: { controller: AbortController; observer?: MutationObserver } }).__wfProductLifecycle = { controller, observer };
    update();
  };

  const unmountRoot = (root: HTMLElement): void => {
    const lifecycle = (root as HTMLElement & { __wfProductLifecycle?: { controller: AbortController; observer?: MutationObserver } }).__wfProductLifecycle;
    lifecycle?.controller.abort();
    lifecycle?.observer?.disconnect();
    delete (root as HTMLElement & { __wfProductLifecycle?: unknown }).__wfProductLifecycle;
    delete root.dataset.wfMounted;
    mountedRoots.delete(root);
  };

  const initialize = (scope: ParentNode = targetDocument): void => rootsIn(scope).forEach(mount);
  const unmount = (scope: ParentNode): void => rootsIn(scope).forEach(unmountRoot);
  const onSectionLoad = (event: Event): void => initialize(event.target as ParentNode);
  const onSectionUnload = (event: Event): void => unmount(event.target as ParentNode);
  const onReady = (): void => initialize();

  targetDocument.addEventListener("shopify:section:load", onSectionLoad);
  targetDocument.addEventListener("shopify:section:unload", onSectionUnload);
  if (targetDocument.readyState === "loading") targetDocument.addEventListener("DOMContentLoaded", onReady, { once: true });
  else initialize();

  const runtime: WefloProductRuntime = {
    mount,
    initialize,
    unmount,
    destroy() {
      mountedRoots.forEach(unmountRoot);
      targetDocument.removeEventListener("shopify:section:load", onSectionLoad);
      targetDocument.removeEventListener("shopify:section:unload", onSectionUnload);
      targetDocument.removeEventListener("DOMContentLoaded", onReady);
      if (host[singletonKey] === runtime) delete host[singletonKey];
    },
  };
  host[singletonKey] = runtime;
  return runtime;
}

const runtimes = new WeakMap<Document, WefloProductRuntime>();

function runtimeFor(document: Document): WefloProductRuntime {
  const current = runtimes.get(document);
  if (current) return current;
  const runtime = createWefloProductRuntime(document);
  runtimes.set(document, runtime);
  return runtime;
}

/** The quantity radio remains the submitted quantity; this only updates Shopify's line-item variant. */
export function syncQuantityTierVariant(form: Pick<HTMLFormElement, "querySelector">, choice: Pick<HTMLElement, "dataset">): boolean {
  const variantId = choice.dataset.wfVariantId?.trim();
  const input = form.querySelector<HTMLInputElement>("[data-wf-variant-input]");
  if (!variantId || !input) return false;
  input.value = variantId;
  return true;
}

export function isNativeCheckoutLocked(root: Pick<HTMLElement, "dataset">): boolean {
  return root.dataset.wfNativeCheckoutLocked === "true";
}

export function mountWefloProduct(root: HTMLElement): void {
  runtimeFor(root.ownerDocument ?? document).mount(root);
}

export function initializeWefloProductForms(scope: ParentNode = document): void {
  const owner = scope instanceof Document ? scope : scope.ownerDocument ?? document;
  runtimeFor(owner).initialize(scope);
}

/** Emitted as a theme asset so it can run without a Weflo application bundle. */
export const wefloProductRuntimeSource = `(${createWefloProductRuntime.toString()})(document);`;
