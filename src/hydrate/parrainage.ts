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

  for (const btn of document.querySelectorAll<HTMLElement>('[sc-camel-on-click="{{ copyLink }}"]')) {
    btn.addEventListener(
      "click",
      async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          window.prompt("Lien de parrainage", link);
        }
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
}

void hydrateParrainage();
