import type { PublicationStrategy } from "../../shopify/publication-plan";

export type PublishOptions = { pro: boolean; documentVersion?: number; shopify: { connected: boolean; shopDomain: string | null; themes: Array<{ id: string; name: string; role: string }> } };
export type PublishChoice = { destination: "shopify"; strategy?: PublicationStrategy; themeId?: string; confirmLive?: boolean; expectedVersion?: number };

export function publishRequest(choice: PublishChoice): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(choice) };
}

export function publishDialogMarkup(options: PublishOptions): string {
  const active = options.shopify.themes.find((theme) => theme.role === "main");
  return `<style>.wf-publish-overlay{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}.wf-publish-dialog{width:min(620px,100%);max-height:90vh;overflow:auto;padding:28px;border-radius:18px;background:#191918;color:#f5f5f2;font:14px/1.45 Inter,-apple-system,sans-serif;border:1px solid #343431}.wf-publish-dialog header{display:flex;justify-content:space-between;align-items:center}.wf-publish-dialog h2{font-size:30px;line-height:1;margin:6px 0 10px}.wf-publish-dialog fieldset{display:grid;gap:8px;margin:22px 0;padding:0;border:0}.wf-publish-option{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:14px;border:1px solid #393936;border-radius:10px;color:inherit;text-decoration:none}.wf-publish-option small{display:block;color:#999991}.wf-publish-actions{display:flex;justify-content:flex-end;gap:8px}.wf-publish-actions button{min-height:42px;padding:0 16px;border:1px solid #444;border-radius:8px;background:#222;color:#fff}.wf-publish-actions button[type=submit]{border-color:#176dff;background:#176dff}.wf-publish-live{padding:12px;border-radius:8px;background:#3a3014;color:#ffe28a}</style><div class="wf-publish-overlay" data-publish-overlay><form class="wf-publish-dialog" data-publish-form><header><span>SHOPIFY PUBLISHING</span><button type="button" data-publish-close aria-label="Close">×</button></header><h2>Publish to your Shopify theme</h2><p>Choose exactly where Weflo should install this page. Nothing replaces your live theme without confirmation.</p><fieldset>${options.shopify.connected ? `<label class="wf-publish-option"><input type="radio" name="destination" value="new_weflo" checked><span><strong>New Weflo theme</strong><small>Create a separate unpublished Shopify theme.</small></span></label><label class="wf-publish-option"><input type="radio" name="destination" value="duplicate_active"><span><strong>Duplicate active theme</strong><small>Duplicate ${active?.name ?? "the active theme"}, then add this page.</small></span></label><label class="wf-publish-option"><input type="radio" name="destination" value="active"><span><strong>Publish to active theme</strong><small>Add the template directly to your live storefront.</small></span></label>` : `<a class="wf-publish-option" href="/dashboard#shopify"><span><strong>Connect Shopify</strong><small>Shopify is required to publish. Connect a store first.</small></span></a>`}</fieldset><div data-publish-review></div><div class="wf-publish-actions"><button type="button" data-publish-close>Cancel</button><button type="submit"${options.shopify.connected ? "" : " disabled"}>Continue</button></div></form></div>`;
}

export function openPublishDialog(options: PublishOptions, publish: (choice: PublishChoice) => Promise<{ message?: string; previewUrl?: string; shopifyPreviewUrl?: string }>): HTMLElement {
  const host = document.createElement("div"); host.innerHTML = publishDialogMarkup(options); const overlay = host.querySelector<HTMLElement>("[data-publish-overlay]")!; document.body.append(...Array.from(host.childNodes));
  const form = overlay.querySelector<HTMLFormElement>("[data-publish-form]")!;
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-publish-close]").forEach((button) => button.addEventListener("click", close));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = new FormData(form).get("destination")?.toString() ?? "new_weflo";
    const destination = "shopify" as const;
    const strategy = selected as PublicationStrategy;
    const review = form.querySelector<HTMLElement>("[data-publish-review]")!;
    if (!form.dataset.reviewed) {
      form.dataset.reviewed = "true";
      review.innerHTML = strategy === "active" ? `<div class="wf-publish-live"><strong>Publication sur le thème actif</strong><p>Cette action ajoute les fichiers Weflo directement au thème visible.</p><label><input type="checkbox" data-live-confirm required> Je confirme la publication en direct</label></div>` : `<p><strong>Prêt à publier.</strong> Le template Weflo reste isolé des autres pages.</p>`;
      (form.querySelector('button[type="submit"]') as HTMLButtonElement).textContent = "Publier maintenant";
      return;
    }
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; submit.disabled = true; submit.textContent = "Publication…";
    try {
      const result = await publish({ destination, ...(strategy ? { strategy } : {}), ...(strategy === "active" ? { confirmLive: Boolean(form.querySelector<HTMLInputElement>("[data-live-confirm]")?.checked) } : {}), expectedVersion: options.documentVersion });
      review.innerHTML = `<p><strong>${result.message ?? "Publication terminée."}</strong></p>${result.shopifyPreviewUrl || result.previewUrl ? `<a href="${result.shopifyPreviewUrl ?? result.previewUrl}" target="_blank" rel="noreferrer">Ouvrir la page publiée</a>` : ""}`;
      submit.textContent = "Publié";
    } catch (error) { review.innerHTML = `<p role="alert">${error instanceof Error ? error.message : "La publication a échoué."}</p>`; submit.disabled = false; submit.textContent = "Réessayer"; }
  });
  return overlay;
}
