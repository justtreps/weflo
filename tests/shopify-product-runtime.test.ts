import { describe, expect, it } from "vitest";

type Listener = (event: Record<string, unknown>) => unknown;

class FakeEventTarget {
  listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener, options?: { signal?: AbortSignal }) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    options?.signal?.addEventListener("abort", () => listeners.delete(listener), { once: true });
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Record<string, unknown> = {}) {
    const emitted = { target: this, ...event };
    this.listeners.get(type)?.forEach((listener) => listener(emitted));
    return emitted;
  }
}

class FakeElement extends FakeEventTarget {
  dataset: Record<string, string> = {};
  textContent = "";
  value = "";
  checked = false;
  ownerDocument?: FakeDocument;
  private one = new Map<string, FakeElement | null>();
  private many = new Map<string, FakeElement[]>();

  setQuery(selector: string, value: FakeElement | null) {
    this.one.set(selector, value);
  }

  setQueryAll(selector: string, value: FakeElement[]) {
    this.many.set(selector, value);
  }

  querySelector(selector: string) {
    return this.one.get(selector) ?? null;
  }

  querySelectorAll(selector: string) {
    return this.many.get(selector) ?? [];
  }

  matches(selector: string) {
    return selector === "[data-wf-product]" && this.dataset.wfProduct === "true";
  }

  dispatchEvent(event: { type?: string }) {
    this.emit(event.type ?? "event", { event });
    return true;
  }
}

class FakeButton extends FakeElement {
  disabledWrites = 0;
  private currentDisabled = false;

  get disabled() {
    return this.currentDisabled;
  }

  set disabled(value: boolean) {
    this.disabledWrites += 1;
    this.currentDisabled = value;
  }
}

class FakeDocument extends FakeEventTarget {
  readyState = "complete";
  documentElement = { lang: "fr-FR" };
  roots: FakeElement[] = [];

  querySelectorAll(selector: string) {
    return selector === "[data-wf-product]" ? this.roots : [];
  }

  dispatchEvent(event: { type?: string }) {
    this.emit(event.type ?? "event", { event });
    return true;
  }
}

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];
  disconnected = false;

  constructor(private readonly callback: () => void) {
    FakeMutationObserver.instances.push(this);
  }

  observe() {}

  disconnect() {
    this.disconnected = true;
  }

  trigger() {
    this.callback();
  }
}

function mixedOfferFixture() {
  const document = new FakeDocument();
  const root = new FakeElement();
  const form = new FakeElement();
  const button = new FakeButton();
  const lock = new FakeElement();
  root.dataset.wfProduct = "true";
  root.ownerDocument = document;
  form.ownerDocument = document;
  button.ownerDocument = document;
  root.setQuery("form[data-wf-product-form], form.wf-product__form", form);
  root.setQuery("[data-wf-native-checkout-lock]", lock);
  root.setQuery("[data-wf-variants]", null);
  root.setQuery("[data-wf-price]", null);
  root.setQuery("[data-wf-compare-price]", null);
  root.setQuery("[data-wf-availability]", null);
  root.setQuery("[data-wf-quantity][data-wf-variant-id]:checked", null);
  root.setQueryAll("[data-wf-option-index]", []);
  root.setQueryAll("[data-wf-quantity]", []);
  root.setQueryAll("[data-wf-quantity][data-wf-variant-id]", []);
  root.setQueryAll("[data-wf-tier-variant-select]", []);
  form.setQuery("[data-wf-add-to-cart]", button);
  form.setQuery("[data-wf-variant-input]", new FakeElement());
  document.roots = [root];
  return { document, root, form, button };
}

describe("published Shopify product runtime", () => {
  it("uses one installer as the executable and published source", async () => {
    const runtime = await import("../src/shopify/runtime/product-form");

    expect(runtime.wefloProductRuntimeSource).toBe(`(${runtime.createWefloProductRuntime.toString()})(document);`);
    expect(() => new Function(runtime.wefloProductRuntimeSource)).not.toThrow();
  });

  it("keeps checkout locks idempotent, blocks submission, and disconnects on section lifecycle", async () => {
    FakeMutationObserver.instances = [];
    const { createWefloProductRuntime } = await import("../src/shopify/runtime/product-form");
    const fixture = mixedOfferFixture();
    const host: Record<string, unknown> = {};
    const runtime = createWefloProductRuntime(fixture.document as unknown as Document, {
      host,
      MutationObserver: FakeMutationObserver,
      AbortController,
      fetch: async () => { throw new Error("locked checkout must not fetch"); },
      FormData: class {},
      CustomEvent: class { constructor(public type: string) {} },
    } as never);

    expect(fixture.form.dataset.wfNativeCheckoutLocked).toBe("true");
    expect(fixture.button.disabled).toBe(true);
    expect(fixture.button.disabledWrites).toBe(1);
    expect(FakeMutationObserver.instances).toHaveLength(1);

    fixture.button.disabled = false;
    const writesBeforeGuard = fixture.button.disabledWrites;
    FakeMutationObserver.instances[0].trigger();
    FakeMutationObserver.instances[0].trigger();
    expect(fixture.button.disabled).toBe(true);
    expect(fixture.button.disabledWrites - writesBeforeGuard).toBe(1);

    let prevented = 0;
    fixture.form.emit("submit", {
      preventDefault: () => { prevented += 1; },
      stopImmediatePropagation: () => undefined,
    });
    expect(prevented).toBe(1);

    fixture.document.emit("shopify:section:unload", { target: fixture.root });
    expect(FakeMutationObserver.instances[0].disconnected).toBe(true);
    expect(fixture.root.dataset.wfMounted).toBeUndefined();

    fixture.document.emit("shopify:section:load", { target: fixture.root });
    expect(FakeMutationObserver.instances).toHaveLength(2);
    runtime.destroy();
    expect(FakeMutationObserver.instances[1].disconnected).toBe(true);
    expect([...(fixture.document.listeners.values())].every((listeners) => listeners.size === 0)).toBe(true);
  });
});
