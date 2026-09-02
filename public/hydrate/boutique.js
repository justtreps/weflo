// src/dashboard/brand-icons.ts
function shopifyLogo(variant = "mark") {
  const className = variant === "full" ? "brand-logo brand-logo--full" : "brand-logo";
  return `<img class="${className}" src="/assets/brands/shopify.svg" alt="Shopify" loading="lazy">`;
}

// src/dashboard/boutique-view.ts
function esc(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function renderBoutiqueView(input) {
  const connected = input.status === "connected";
  const title = connected ? "Boutique connect\xE9e" : input.status === "invalid" ? "Connexion \xE0 v\xE9rifier" : "Connecte ta boutique Shopify";
  return `<div class="boutique-shell"><aside><a class="wordmark" href="/dashboard">weflo<span>.</span></a><nav><a href="/dashboard">\u2302 Accueil</a><a href="/creations">\u25A3 Mes cr\xE9ations</a><a href="/studio">\u2726 Studio images</a><a class="is-active" href="/boutique">${shopifyLogo()} Ma boutique</a><a href="/facturation">\u25C8 Abonnement</a></nav></aside><main><header><div><p class="eyebrow">SHOPIFY</p><h1>Ma boutique</h1><p>Publie tes pages Weflo dans le th\xE8me Shopify de ton choix.</p></div><a href="/creations">Voir mes cr\xE9ations \u2192</a></header><section class="connection-card status-${input.status}"><div class="shopify-hero">${shopifyLogo("full")}</div><div><span class="status-pill">${connected ? "\u25CF Connect\xE9e" : input.status === "invalid" ? "\u25CF Action requise" : "\u25CF Non connect\xE9e"}</span><h2>${title}</h2><p>${connected ? `Les sections Weflo peuvent \xEAtre publi\xE9es sur <strong>${esc(input.shopDomain ?? "")}</strong>. Le th\xE8me est choisi uniquement au moment de publier.` : "Connecte une boutique de d\xE9veloppement ou ta boutique principale. Weflo ne publie rien sans ta confirmation."}</p>${connected ? `<div class="connected-actions"><a href="/creations">Choisir une page \xE0 publier</a><button data-shopify-disconnect>D\xE9connecter</button></div>` : `<form data-shopify-form><input type="hidden" name="workspaceId" value="${esc(input.workspaceId)}"><label>Domaine Shopify<input name="shopDomain" placeholder="ma-boutique.myshopify.com" value="${esc(input.shopDomain ?? "")}" required></label><label>Jeton d\u2019acc\xE8s Admin<input name="token" type="password" placeholder="shpat_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="off" required></label><button type="submit">Connecter Shopify</button><p data-shopify-error hidden></p></form>`}</div></section><section class="shopify-steps"><article><span>01</span><h3>Connecte</h3><p>Le catalogue et les th\xE8mes disponibles restent dans ton espace.</p></article><article><span>02</span><h3>Cr\xE9e</h3><p>Weflo construit de vraies sections \xE9ditables, pas une capture aplatie.</p></article><article><span>03</span><h3>Choisis le th\xE8me</h3><p>Actif, copie du th\xE8me actif ou nouveau th\xE8me Weflo au moment de publier.</p></article></section><section class="theme-note"><div><p class="eyebrow">PUBLICATION S\xDBRE</p><h2>Ton th\xE8me reste sous ton contr\xF4le.</h2></div><ul><li>Pr\xE9visualisation avant publication</li><li>Confirmation explicite pour le th\xE8me actif</li><li>Sections Liquid et r\xE9glages Shopify modifiables</li></ul></section></main></div>`;
}

// src/hydrate/session-guard.ts
async function guardSession() {
  const res = await fetch("/api/me");
  if (res.status === 401) {
    location.assign("/connexion");
    return null;
  }
  if (!res.ok) return null;
  return await res.json();
}

// src/hydrate/boutique.ts
async function api(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error === "unavailable" ? "La connexion Shopify n\u2019est pas encore configur\xE9e sur cet environnement." : "Impossible de connecter cette boutique. V\xE9rifie le domaine et le jeton.");
  return body;
}
async function start() {
  const me = await guardSession();
  if (!me) return;
  const root = document.querySelector("#boutique-app");
  if (!root) return;
  let state = await api("/api/shopify");
  const render = () => {
    root.innerHTML = renderBoutiqueView({ workspaceName: me.workspace.name, workspaceId: me.workspace.id, ...state });
    bind();
  };
  const bind = () => {
    root.querySelector("[data-shopify-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      const error = form.querySelector("[data-shopify-error]");
      button.disabled = true;
      button.textContent = "Connexion\u2026";
      error.hidden = true;
      try {
        const values = new FormData(form);
        state = await api("/api/shopify/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: values.get("workspaceId"), shopDomain: values.get("shopDomain"), token: values.get("token") }) });
        render();
      } catch (cause) {
        button.disabled = false;
        button.textContent = "R\xE9essayer";
        error.hidden = false;
        error.textContent = cause instanceof Error ? cause.message : "Connexion impossible";
      }
    });
    root.querySelector("[data-shopify-disconnect]")?.addEventListener("click", async () => {
      await api("/api/shopify/disconnect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: me.workspace.id }) });
      state = { status: "none", shopDomain: null };
      render();
    });
  };
  render();
}
void start();
