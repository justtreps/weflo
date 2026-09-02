import { applyAppChrome, setScIf } from "./app-chrome";
import { guardSession } from "./session-guard";

type ReferralPublic = {
  slug: string;
  link?: string;
  earningsUsd: string;
  referrals: number;
  clicks: number;
};

function formatUsd(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

export async function hydrateParrainage() {
  const me = await guardSession();
  if (!me) return;
  applyAppChrome(me, "/parrainage");

  const fallback = `${location.origin}/r/${me.workspace.slug}`;
  let data: ReferralPublic | null = null;
  try {
    const res = await fetch("/api/referral");
    if (res.ok) data = (await res.json()) as ReferralPublic;
  } catch {
    /* keep fallback link */
  }

  const link = data?.link?.startsWith("http") ? data.link : fallback;

  for (const el of document.querySelectorAll("span")) {
    const raw = el.textContent?.trim() ?? "";
    if (raw === "{{ link }}" || raw.startsWith("buildstore.app/r/")) {
      el.textContent = link;
    }
    if (raw === "{{ clicksLabel }}" && data) {
      el.textContent = `${data.clicks} clics · ${data.referrals} inscriptions`;
    }
    if (raw === "{{ copyLabel }}") el.textContent = "Copier le lien";
  }

  const emptyBits = [...document.querySelectorAll("span")];
  if (data) {
    for (const el of emptyBits) {
      const raw = el.textContent?.trim() ?? "";
      if (raw === "0 clic" || raw === "0 clics") el.textContent = `${data.clicks} clic${data.clicks === 1 ? "" : "s"}`;
      if (raw === "0 inscription" || raw === "0 inscriptions") {
        el.textContent = `${data.referrals} inscription${data.referrals === 1 ? "" : "s"}`;
      }
      if (raw === "0,00 € gagnés") el.textContent = `${formatUsd(data.earningsUsd)} gagnés`;
    }

    const valueSpans = document.querySelectorAll('sc-for[list="{{ stats }}"] span[style*="26px"]');
    const values = [
      formatUsd(data.earningsUsd),
      formatUsd(data.earningsUsd),
      String(data.referrals),
      data.clicks > 0 ? `${((data.referrals / data.clicks) * 100).toFixed(1).replace(".", ",")} %` : "0 %",
    ];
    valueSpans.forEach((el, i) => {
      if (values[i] != null) el.textContent = values[i];
    });
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Lien de parrainage", link);
    }
  };

  for (const btn of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ copyLink }}"]')) {
    btn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        await copy();
        const label = btn.querySelector("span");
        if (label) {
          label.textContent = "Lien copié";
          window.setTimeout(() => {
            label.textContent = "Copier le lien";
          }, 1800);
        }
      },
      true,
    );
  }

  const shareByLabel: Record<string, () => void> = {
    "E-mail": () => {
      location.assign(`mailto:?subject=${encodeURIComponent("Rejoins Weflo")}&body=${encodeURIComponent(link)}`);
    },
    Discord: () => {
      void copy();
    },
    "Afficher le code QR": () => {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };

  const setChat = (open: boolean) => {
    setScIf(document.querySelector<HTMLElement>('sc-if[value="{{ chatClosed }}"]'), !open);
    const opened = document.querySelector<HTMLElement>('sc-if[value="{{ chatOpen }}"]');
    if (opened) opened.style.setProperty("display", open ? "flex" : "none", "important");
  };
  const greeting = document.querySelector('sc-for[list="{{ chatMsgs }}"] div');
  if (greeting) {
    greeting.textContent = "Je t'aide sur tes pages boutique. Ouvre tes pages pour coder ou modifier une page.";
    if (!greeting.parentElement?.querySelector("[data-weflo-pages-link]")) {
      const link = document.createElement("a");
      link.dataset.wefloPagesLink = "1";
      link.href = "/dashboard";
      link.textContent = "Ouvrir mes pages";
      link.style.cssText = "display:inline-block;margin-top:8px;color:#141310;font-weight:600";
      greeting.parentElement?.appendChild(link);
    }
  }
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ openChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(true);
  });
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ closeChat }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(false);
  });
  const goPages = (e: Event) => {
    e.preventDefault();
    location.assign("/dashboard");
  };
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ sendChat }}"]')?.addEventListener("click", goPages);
  document.querySelector<HTMLInputElement>('input[sc-camel-on-change="{{ onChatInput }}"]')?.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter") return;
      goPages(e);
    },
  );
  document.querySelector<HTMLElement>('[sc-camel-on-click="{{ closeAll }}"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    setChat(false);
  });

  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ f.onPick }}"]')) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void copy();
    });
  }

  for (const el of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ c.onPick }}"]')) {
    const label = el.querySelector("span")?.textContent?.trim() ?? "";
    const action = shareByLabel[label];
    if (!action) continue;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    });
  }
}

void hydrateParrainage();
