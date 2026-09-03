type ShopifyVariant = { id: number | string; options?: string[]; price?: number; compare_at_price?: number | null; available?: boolean; featured_image?: { src?: string } | null };

function money(cents: number): string {
  try { return new Intl.NumberFormat(document.documentElement.lang || "fr-FR", { style: "currency", currency: (window as Window & { Shopify?: { currency?: { active?: string } } }).Shopify?.currency?.active || "EUR" }).format(cents / 100); }
  catch { return `${(cents / 100).toFixed(2)} €`; }
}

function variantsFor(root: HTMLElement): ShopifyVariant[] {
  const source = root.querySelector<HTMLScriptElement>("[data-wf-variants]");
  if (!source?.textContent) return [];
  try { const value = JSON.parse(source.textContent); return Array.isArray(value) ? value as ShopifyVariant[] : []; } catch { return []; }
}

function unmount(root: HTMLElement): void {
  const controller = (root as HTMLElement & { __wfProductAbort?: AbortController }).__wfProductAbort;
  controller?.abort();
  delete (root as HTMLElement & { __wfProductAbort?: AbortController }).__wfProductAbort;
  delete root.dataset.wfMounted;
}

/** The quantity radio remains the submitted quantity; this only updates Shopify's line-item variant. */
export function syncQuantityTierVariant(form: Pick<HTMLFormElement, "querySelector">, choice: Pick<HTMLElement, "dataset">): boolean {
  const variantId = choice.dataset.wfVariantId?.trim();
  const input = form.querySelector<HTMLInputElement>("[data-wf-variant-input]");
  if (!variantId || !input) return false;
  input.value = variantId;
  return true;
}

export function mountWefloProduct(root: HTMLElement): void {
  if (root.dataset.wfMounted === "true") return;
  const form = root.querySelector<HTMLFormElement>("form[data-wf-product-form], form.wf-product__form");
  if (!form) return;
  root.dataset.wfMounted = "true";
  const controller = new AbortController();
  (root as HTMLElement & { __wfProductAbort?: AbortController }).__wfProductAbort = controller;
  const signal = controller.signal;
  const variants = variantsFor(root);
  const update = () => {
    const choices = [...root.querySelectorAll<HTMLSelectElement>("[data-wf-option-index]")].map((select) => select.value);
    const current = variants.find((variant) => choices.every((choice, index) => variant.options?.[index] === choice)) ?? variants[0];
    if (!current) return;
    const id = form.querySelector<HTMLInputElement>("[data-wf-variant-input]");
    if (id) id.value = String(current.id);
    const price = root.querySelector<HTMLElement>("[data-wf-price]"); if (price && typeof current.price === "number") price.textContent = money(current.price);
    const compare = root.querySelector<HTMLElement>("[data-wf-compare-price]");
    if (compare) { const visible = typeof current.compare_at_price === "number" && current.compare_at_price > (current.price ?? 0); compare.hidden = !visible; if (visible) compare.textContent = money(current.compare_at_price!); }
    const availability = root.querySelector<HTMLElement>("[data-wf-availability]"); if (availability) availability.textContent = current.available ? "En stock" : "Indisponible";
    const submit = form.querySelector<HTMLButtonElement>("[data-wf-add-to-cart]"); if (submit) submit.disabled = current.available === false;
    root.dispatchEvent(new CustomEvent("weflo:variant:change", { bubbles: true, detail: { variant: current } }));
  };
  root.querySelectorAll<HTMLSelectElement>("[data-wf-option-index]").forEach((select) => select.addEventListener("change", update, { signal }));
  root.querySelectorAll<HTMLElement>("[data-wf-quantity]").forEach((button) => button.addEventListener("click", () => {
    const quantity = Number(button.dataset.wfQuantity); const input = form.querySelector<HTMLInputElement>("[data-wf-quantity-input]");
    if (input && Number.isInteger(quantity) && quantity > 0) { input.value = String(quantity); input.dispatchEvent(new Event("change", { bubbles: true })); }
  }, { signal }));
  root.querySelectorAll<HTMLInputElement>("[data-wf-quantity][data-wf-variant-id]").forEach((choice) => choice.addEventListener("change", () => {
    if (choice.checked) syncQuantityTierVariant(form, choice);
  }, { signal }));
  form.addEventListener("submit", async (event) => {
    if (!window.fetch || root.dataset.wfAjax === "false") return;
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>("[data-wf-add-to-cart]"); if (submit) submit.disabled = true;
    try {
      const response = await fetch("/cart/add.js", { method: "POST", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body: new FormData(form) });
      if (!response.ok) throw new Error("cart_add_failed");
      const item = await response.json();
      document.dispatchEvent(new CustomEvent("weflo:cart:add", { bubbles: true, detail: { item, sectionId: root.dataset.wfSectionId } }));
      document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
    } catch {
      form.submit();
    } finally { if (submit) submit.disabled = false; }
  }, { signal });
  update();
  const selectedTier = root.querySelector<HTMLInputElement>("[data-wf-quantity][data-wf-variant-id]:checked");
  if (selectedTier) syncQuantityTierVariant(form, selectedTier);
}

export function initializeWefloProductForms(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>("[data-wf-product]").forEach(mountWefloProduct);
}

/** Emitted as a theme asset so it can run without a Weflo application bundle. */
export const wefloProductRuntimeSource = `(()=>{const M=(c)=>{try{return new Intl.NumberFormat(document.documentElement.lang||'fr-FR',{style:'currency',currency:(window.Shopify&&window.Shopify.currency&&window.Shopify.currency.active)||'EUR'}).format(c/100)}catch{return(c/100).toFixed(2)+' €'}};const V=r=>{const s=r.querySelector('[data-wf-variants]');try{return s?JSON.parse(s.textContent||'[]'):[]}catch{return[]}};const U=r=>{if(r.dataset.wfMounted==='true')return;const f=r.querySelector('form[data-wf-product-form],form.wf-product__form');if(!f)return;r.dataset.wfMounted='true';const a=new AbortController(),q=a.signal,v=V(r),u=()=>{const c=[...r.querySelectorAll('[data-wf-option-index]')].map(x=>x.value),n=v.find(x=>c.every((y,i)=>(x.options||[])[i]===y))||v[0];if(!n)return;const id=f.querySelector('[data-wf-variant-input]');if(id)id.value=String(n.id);const p=r.querySelector('[data-wf-price]');if(p&&typeof n.price==='number')p.textContent=M(n.price);const z=r.querySelector('[data-wf-compare-price]');if(z){const b=typeof n.compare_at_price==='number'&&n.compare_at_price>(n.price||0);z.hidden=!b;if(b)z.textContent=M(n.compare_at_price)}const av=r.querySelector('[data-wf-availability]');if(av)av.textContent=n.available?'En stock':'Indisponible';const b=f.querySelector('[data-wf-add-to-cart]');if(b)b.disabled=n.available===false;r.dispatchEvent(new CustomEvent('weflo:variant:change',{bubbles:true,detail:{variant:n}}))};r.querySelectorAll('[data-wf-option-index]').forEach(x=>x.addEventListener('change',u,{signal:q}));r.querySelectorAll('[data-wf-quantity]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.wfQuantity),i=f.querySelector('[data-wf-quantity-input]');if(i&&Number.isInteger(n)&&n>0){i.value=String(n);i.dispatchEvent(new Event('change',{bubbles:true}))}},{signal:q}));f.addEventListener('submit',async e=>{if(!window.fetch||r.dataset.wfAjax==='false')return;e.preventDefault();const b=f.querySelector('[data-wf-add-to-cart]');if(b)b.disabled=true;try{const x=await fetch('/cart/add.js',{method:'POST',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'},body:new FormData(f)});if(!x.ok)throw Error('cart');const i=await x.json();document.dispatchEvent(new CustomEvent('weflo:cart:add',{bubbles:true,detail:{item:i,sectionId:r.dataset.wfSectionId}}));document.dispatchEvent(new CustomEvent('cart:refresh',{bubbles:true}))}catch{f.submit()}finally{if(b)b.disabled=false}},{signal:q});r.__wfProductAbort=a;u()};const I=s=>(s||document).querySelectorAll('[data-wf-product]').forEach(U);document.addEventListener('shopify:section:load',e=>I(e.target));document.addEventListener('shopify:section:unload',e=>{const r=e.target&&e.target.querySelector&&e.target.querySelector('[data-wf-product]');if(r&&r.__wfProductAbort)r.__wfProductAbort.abort()});document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>I()):I()})();`;

/** Kept separate so existing product-form runtime remains backwards compatible. */
export const quantityOfferRuntimeExtensionSource = `(()=>{const S=x=>{if(!(x instanceof HTMLInputElement)||!x.matches('[data-wf-quantity][data-wf-variant-id]')||!x.checked)return;const f=x.closest('form'),i=f&&f.querySelector('[data-wf-variant-input]'),v=(x.dataset.wfVariantId||'').trim();if(i&&v)i.value=v};document.addEventListener('change',e=>S(e.target));const I=()=>document.querySelectorAll('[data-wf-quantity][data-wf-variant-id]:checked').forEach(S);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',I):I()})();`;
