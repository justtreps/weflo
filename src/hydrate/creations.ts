import { dashboardHomeModel } from "../dashboard/home-model";
import { renderCreationsView } from "../dashboard/creations-view";
import { renderPreviewDialog } from "../dashboard/preview-dialog";
import { guardSession } from "./session-guard";
import type { Page, Workspace } from "../types";
import "./creations.css";

type Payload = { workspace: Workspace; pages: Page[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Erreur ${response.status}`);
  return response.status === 204 ? undefined as T : await response.json() as T;
}

function toast(message: string) {
  const node = document.createElement("div"); node.className = "creation-toast"; node.textContent = message; document.body.append(node);
  window.setTimeout(() => node.remove(), 2200);
}

async function start() {
  const me = await guardSession(); if (!me) return;
  const root = document.querySelector<HTMLElement>("#creations-app"); if (!root) return;
  let data = await api<Payload>("/api/pages");
  const render = () => {
    const model = dashboardHomeModel({ pages: data.pages, workspace: data.workspace, userName: me.name });
    root.innerHTML = renderCreationsView({ ...model, projects: data.pages.map((page) => dashboardHomeModel({ pages: [page], workspace: data.workspace, userName: me.name }).projects[0]) });
    bind();
  };
  const reload = async () => { data = await api<Payload>("/api/pages"); render(); };
  const openPreview = (page: Page, trigger: HTMLElement) => {
    document.body.insertAdjacentHTML("beforeend", renderPreviewDialog({ url: `/s/${data.workspace.slug}/${page.slug}`, name: page.name }));
    const dialog = document.querySelector<HTMLDialogElement>("[data-preview-dialog]")!; dialog.showModal();
    const close = () => { dialog.close(); dialog.remove(); trigger.focus(); };
    dialog.querySelector("[data-preview-close]")?.addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    for (const button of dialog.querySelectorAll<HTMLElement>("[data-preview-size]")) button.addEventListener("click", () => {
      dialog.classList.toggle("is-mobile", button.dataset.previewSize === "mobile");
      dialog.querySelectorAll("[data-preview-size]").forEach((item) => item.classList.toggle("is-active", item === button));
    });
  };
  const bind = () => {
    const cards = [...root.querySelectorAll<HTMLElement>("[data-project-id]")];
    const filter = () => {
      const query = root.querySelector<HTMLInputElement>("[data-creation-search]")?.value.trim().toLowerCase() ?? "";
      const type = root.querySelector<HTMLElement>("[data-filter].is-active")?.dataset.filter ?? "all";
      cards.forEach((card) => { const page = data.pages.find((item) => item.id === card.dataset.projectId); card.hidden = !page || (type !== "all" && page.type !== type) || (!!query && !page.name.toLowerCase().includes(query)); });
    };
    root.querySelector("[data-creation-search]")?.addEventListener("input", filter);
    root.querySelectorAll<HTMLElement>("[data-filter]").forEach((button) => button.addEventListener("click", () => { root.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active")); button.classList.add("is-active"); filter(); }));
    cards.forEach((card) => card.querySelectorAll<HTMLElement>("[data-command]").forEach((button) => button.addEventListener("click", async (event) => {
      event.preventDefault(); event.stopPropagation(); const page = data.pages.find((item) => item.id === card.dataset.projectId); if (!page) return;
      const command = button.dataset.command;
      if (command === "preview") openPreview(page, button);
      if (command === "edit") location.assign(`/editeur?page=${page.id}`);
      if (command === "duplicate") { await api(`/api/pages/${page.id}/duplicate`, { method: "POST" }); await reload(); }
      if (command === "rename") { const name = prompt("Nouveau nom", page.name)?.trim(); if (name) { await api(`/api/pages/${page.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }); await reload(); } }
      if (command === "copy") { const url = `${location.origin}/s/${data.workspace.slug}/${page.slug}`; try { await navigator.clipboard.writeText(url); toast("Lien copié"); } catch { prompt("Copie ce lien", url); } }
      if (command === "delete" && confirm(`Supprimer « ${page.name} » ?`)) { await api(`/api/pages/${page.id}`, { method: "DELETE" }); await reload(); }
    })));
  };
  render();
}

void start();
