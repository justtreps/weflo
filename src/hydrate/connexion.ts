type AuthMode = "login" | "signup";

function errorNode(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-auth-error]");
}

function showError(message: string) {
  const el = errorNode();
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function clearError() {
  const el = errorNode();
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

function inputBy(...selectors: string[]): HTMLInputElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLInputElement>(sel);
    if (el) return el;
  }
  return null;
}

async function postJson(url: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function hydrateConnexion() {
  const email = inputBy('input[name="email"]', 'input[type="email"]');
  const password = inputBy('input[name="password"]', 'input[type="password"]', 'input[type="{{ pwdType }}"]');
  const name = inputBy('input[name="name"]', 'input[type="text"]');
  const google = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ oauth }}"]');
  const cta = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ submit }}"]');
  const switchBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ switchMode }}"]');

  let mode: AuthMode = "login";

  async function submitEmail(e?: Event) {
    e?.preventDefault();
    clearError();
    const payload =
      mode === "signup"
        ? { email: email?.value.trim() ?? "", password: password?.value ?? "", name: name?.value.trim() ?? "" }
        : { email: email?.value.trim() ?? "", password: password?.value ?? "" };
    const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const res = await postJson(path, payload);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "invalid" }));
      showError(typeof data.error === "string" ? data.error : "invalid");
      return;
    }
    location.href = "/dashboard";
  }

  async function submitGoogle(e?: Event) {
    e?.preventDefault();
    clearError();
    const res = await postJson("/api/auth/google");
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.url !== "string") {
      showError(typeof data.error === "string" ? data.error : "invalid");
      return;
    }
    location.href = data.url;
  }

  cta?.addEventListener("click", (e) => {
    void submitEmail(e);
  });
  google?.addEventListener("click", (e) => {
    void submitGoogle(e);
  });
  email?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void submitEmail(e);
  });
  password?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void submitEmail(e);
  });
  name?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void submitEmail(e);
  });
  switchBtn?.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    const label = cta?.querySelector("span:last-child");
    if (label) label.textContent = mode === "signup" ? "Créer mon compte" : "Se connecter";
  });
}

hydrateConnexion();
