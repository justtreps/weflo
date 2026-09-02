type AuthMode = "login" | "signup";

const COPY: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    oauthLabel: string;
    ctaLabel: string;
    switchText: string;
    switchCta: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    pwdPlaceholder: string;
  }
> = {
  login: {
    title: "Content de te revoir",
    subtitle: "Reprends là où tu t'es arrêté.",
    oauthLabel: "Continuer",
    ctaLabel: "Se connecter",
    switchText: "Pas encore de compte ?",
    switchCta: "En créer un",
    namePlaceholder: "Ton nom",
    emailPlaceholder: "toi@email.com",
    pwdPlaceholder: "••••••••",
  },
  signup: {
    title: "Crée ton compte",
    subtitle: "Deux minutes, aucune carte. Ta première page peut être en ligne aujourd'hui.",
    oauthLabel: "S'inscrire",
    ctaLabel: "Créer mon compte",
    switchText: "Tu as déjà un compte ?",
    switchCta: "Se connecter",
    namePlaceholder: "Ton nom",
    emailPlaceholder: "toi@email.com",
    pwdPlaceholder: "8 caractères minimum",
  },
};

function errorNode(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-auth-error]");
}

function ensureErrorNode(before: Element | null) {
  if (errorNode() || !before) return;
  const p = document.createElement("p");
  p.dataset.authError = "1";
  p.hidden = true;
  p.style.cssText = "margin:0;width:100%;font-size:13px;line-height:1.4;color:#B42318;text-align:center";
  before.parentElement?.insertBefore(p, before);
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

function setIf(selector: string, on: boolean) {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    el.style.setProperty("display", on ? "contents" : "none", "important");
  }
}

async function postJson(url: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function passwordScore(password: string): { width: string; bg: string; label: string } {
  const len = password.length;
  const varied =
    Number(/[A-Z]/.test(password)) + Number(/[0-9]/.test(password)) + Number(/[^A-Za-z0-9]/.test(password));
  const score = len === 0 ? 0 : Math.min(3, (len >= 8 ? 1 : 0) + (len >= 12 ? 1 : 0) + (varied >= 2 ? 1 : 0));
  return {
    width: `${(score / 3) * 100}%`,
    bg: score >= 3 ? "#2FA36B" : score === 2 ? "#FBC531" : "#D8A0AA",
    label: len === 0 ? "" : score >= 3 ? "Solide" : score === 2 ? "Correct" : "Trop court",
  };
}

export function hydrateConnexion() {
  const email = inputBy('input[name="email"]', 'input[type="email"]');
  const password = inputBy('input[name="password"]', 'input[type="password"]', 'input[type="text"]');
  const name = inputBy('input[name="name"]', 'input[type="text"]');
  const google = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ oauth }}"]');
  const cta = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ submit }}"]');
  const switchBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ switchMode }}"]');
  const revealBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleReveal }}"]');
  const rememberBtn = document.querySelector<HTMLElement>('[sc-camel-on-click="{{ toggleRemember }}"]');
  const titleEl = document.querySelector("h1");
  const subtitleEl = titleEl?.nextElementSibling as HTMLElement | null;
  const oauthLabel = google?.querySelector("span");
  const ctaLabel = cta?.querySelector("span:last-child");
  const switchText = switchBtn?.previousElementSibling as HTMLElement | null;
  const strengthBar = document.querySelector<HTMLElement>('span[style*="width: 0%"], span[style*="width: {{ strengthW }}"]');
  const strengthLabel = strengthBar?.parentElement?.nextElementSibling as HTMLElement | null;

  let mode: AuthMode = "login";
  let reveal = false;
  let remember = true;
  let busy = false;

  ensureErrorNode(cta);

  if (name) name.value = "";
  if (email) email.value = "";
  if (password) password.value = "";

  function ready(): boolean {
    const mailOk = /.+@.+\..+/.test(email?.value.trim() ?? "");
    const pwd = password?.value ?? "";
    const pwdOk = mode === "signup" ? pwd.length >= 8 : pwd.length > 0;
    const nameOk = mode === "signup" ? (name?.value.trim().length ?? 0) > 1 : true;
    return mailOk && pwdOk && nameOk && !busy;
  }

  function paint() {
    const copy = COPY[mode];
    document.body.classList.toggle("auth-mode-login", mode === "login");
    document.body.classList.toggle("auth-mode-signup", mode === "signup");
    setIf('sc-if[value="{{ isSignup }}"]', mode === "signup");
    setIf('sc-if[value="{{ isLogin }}"]', mode === "login");
    setIf('sc-if[value="{{ busy }}"]', busy);
    if (titleEl) titleEl.textContent = copy.title;
    if (subtitleEl) subtitleEl.textContent = copy.subtitle;
    if (oauthLabel) oauthLabel.textContent = `${copy.oauthLabel} avec Google`;
    if (ctaLabel) ctaLabel.textContent = busy ? (mode === "signup" ? "Création…" : "Connexion…") : copy.ctaLabel;
    if (switchText) switchText.textContent = copy.switchText;
    if (switchBtn) switchBtn.textContent = copy.switchCta;
    if (name) name.placeholder = copy.namePlaceholder;
    if (email) email.placeholder = copy.emailPlaceholder;
    if (password) {
      password.type = reveal ? "text" : "password";
      password.placeholder = copy.pwdPlaceholder;
    }
    if (revealBtn) revealBtn.textContent = reveal ? "Masquer" : "Afficher";
    if (email) email.style.borderColor = email.value && !/.+@.+\..+/.test(email.value) ? "#D8A0AA" : "#D8D5CE";
    if (cta) {
      cta.style.background = ready() ? "#FBC531" : "#F0E4BE";
      cta.style.cursor = ready() ? "pointer" : "not-allowed";
    }
    const box = rememberBtn?.querySelector<HTMLElement>("span");
    if (box) {
      box.style.background = remember ? "#FBC531" : "#fff";
      box.style.borderColor = remember ? "#FBC531" : "#D8D5CE";
      const tick = box.querySelector<HTMLElement>("svg");
      if (tick) tick.style.display = remember ? "block" : "none";
    }
    const score = passwordScore(password?.value ?? "");
    if (strengthBar) {
      strengthBar.style.width = score.width;
      strengthBar.style.background = score.bg;
    }
    if (strengthLabel) strengthLabel.textContent = score.label;
  }

  async function submitEmail(e?: Event) {
    e?.preventDefault();
    if (!ready()) return;
    clearError();
    busy = true;
    paint();
    const payload =
      mode === "signup"
        ? { email: email?.value.trim() ?? "", password: password?.value ?? "", name: name?.value.trim() ?? "" }
        : { email: email?.value.trim() ?? "", password: password?.value ?? "" };
    const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const res = await postJson(path, payload);
    if (!res.ok) {
      busy = false;
      paint();
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
  email?.addEventListener("input", paint);
  password?.addEventListener("input", paint);
  name?.addEventListener("input", paint);
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
    busy = false;
    if (password) password.value = "";
    clearError();
    paint();
  });
  revealBtn?.addEventListener("click", () => {
    reveal = !reveal;
    paint();
  });
  rememberBtn?.addEventListener("click", () => {
    remember = !remember;
    paint();
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ forgot }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    showError("Réinitialisation par e-mail bientôt disponible. Crée un nouveau compte ou contacte le support.");
  });

  paint();
}

hydrateConnexion();
