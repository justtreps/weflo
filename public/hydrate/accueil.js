// src/hydrate/accueil.ts
function nextFormatIndex(current, key, total) {
  if (total <= 0) return current;
  if (key === "ArrowRight") return (current + 1) % total;
  if (key === "ArrowLeft") return (current - 1 + total) % total;
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  return current;
}
function hydrateFormatTabs() {
  const tabs = [...document.querySelectorAll("[data-format-tab]")];
  const panels = [...document.querySelectorAll("[data-format-panel]")];
  if (!tabs.length || tabs.length !== panels.length) return;
  const select = (selected, focus = false) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panels.find((item) => item.id === tab.getAttribute("aria-controls"));
      if (panel) panel.hidden = !active;
    });
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const next = nextFormatIndex(index, event.key, tabs.length);
      if (next === index && !["Home", "End"].includes(event.key)) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });
}
async function hydrateAccueil() {
  hydrateFormatTabs();
  const nav = document.querySelector("[data-nav-cta]");
  if (!nav) return;
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      await res.json();
      nav.textContent = "Tes pages";
      nav.href = "/dashboard";
      return;
    }
  } catch {
  }
  nav.textContent = "Se connecter";
  nav.href = "/connexion";
}
if (typeof document !== "undefined") void hydrateAccueil();
export {
  nextFormatIndex
};
