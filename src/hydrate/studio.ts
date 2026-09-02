import { renderStudioView } from "../studio/view";
import type { ImageGeneration, ImageAspectRatio, ImageModelId } from "../studio/types";
import { guardSession } from "./session-guard";
import type { Page } from "../types";
import "./studio.css";

type History = { generations: ImageGeneration[] };
type Pages = { pages: Page[] };
async function api<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, init); const text = await response.text(); let data: unknown = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || "Erreur serveur" }; } if (!response.ok) throw new Error((data as { message?: string }).message || `Erreur ${response.status}`); return data as T; }

async function start() {
  const me = await guardSession(); if (!me) return; const root = document.querySelector<HTMLElement>("#studio-app"); if (!root) return;
  let history = await api<History>("/api/studio/generations").catch(() => ({ generations: [] })); let model: ImageModelId = "flux-kontext-pro"; let ratio: ImageAspectRatio = "1:1"; let count = 1; let referenceUrl: string | null = null; let insertUrl = "";
  const render = () => { root.innerHTML = renderStudioView({ workspaceName: me.workspace.name, generations: history.generations }); bind(); };
  const setChoice = (selector: string, selected: HTMLElement) => { root.querySelectorAll(selector).forEach((item) => item.classList.remove("is-active")); selected.classList.add("is-active"); };
  const bind = () => {
    root.querySelectorAll<HTMLElement>("[data-model]").forEach((button) => button.addEventListener("click", () => { model = button.dataset.model as ImageModelId; setChoice("[data-model]", button); }));
    root.querySelectorAll<HTMLElement>("[data-ratio]").forEach((button) => button.addEventListener("click", () => { ratio = button.dataset.ratio as ImageAspectRatio; setChoice("[data-ratio]", button); }));
    root.querySelectorAll<HTMLElement>("[data-count]").forEach((button) => button.addEventListener("click", () => { count = Number(button.dataset.count); setChoice("[data-count]", button); }));
    root.querySelectorAll<HTMLElement>("[data-prompt-example]").forEach((button) => button.addEventListener("click", () => { const area = root.querySelector<HTMLTextAreaElement>("textarea"); if (area) { area.value = button.dataset.promptExample ?? ""; area.focus(); } }));
    const file = root.querySelector<HTMLInputElement>("[data-reference-input]"); file?.addEventListener("change", () => { const selected = file.files?.[0]; if (!selected) return; if (selected.size > 10 * 1024 * 1024) { alert("L’image doit peser moins de 10 Mo."); return; } const reader = new FileReader(); reader.onload = () => { referenceUrl = String(reader.result); paintReference(); }; reader.readAsDataURL(selected); });
    const paintReference = () => { const box = root.querySelector<HTMLElement>("[data-reference-preview]"); const image = box?.querySelector<HTMLImageElement>("img"); if (box) box.hidden = !referenceUrl; if (image && referenceUrl) image.src = referenceUrl; };
    root.querySelector("[data-reference-remove]")?.addEventListener("click", () => { referenceUrl = null; if (file) file.value = ""; paintReference(); }); paintReference();
    root.querySelector("[data-new-session]")?.addEventListener("click", () => { const area = root.querySelector<HTMLTextAreaElement>("textarea"); if (area) { area.value = ""; area.focus(); } referenceUrl = null; paintReference(); });
    root.querySelector<HTMLFormElement>("[data-studio-form]")?.addEventListener("submit", async (event) => { event.preventDefault(); const prompt = root.querySelector<HTMLTextAreaElement>("textarea")?.value.trim() ?? ""; if (!prompt) return; const grid = root.querySelector<HTMLElement>("[data-result-grid]"); if (grid) grid.innerHTML = `<div class="studio-progress"><div><span></span><h2>Weflo compose tes visuels…</h2><p>Le produit reste la référence centrale.</p></div></div>`; try { const generated = await api<ImageGeneration>("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model, aspectRatio: ratio, numImages: count, referenceUrl }) }); history = { generations: [generated, ...history.generations] }; render(); } catch (error) { if (grid) grid.innerHTML = `<div class="studio-error"><div><h2>La génération n’a pas abouti.</h2><p>${error instanceof Error ? error.message : "Réessaie dans un instant."}</p><button onclick="location.reload()">Réessayer</button></div></div>`; } });
    root.querySelectorAll<HTMLElement>("[data-image-command]").forEach((button) => button.addEventListener("click", async () => { const url = button.dataset.imageUrl ?? ""; if (button.dataset.imageCommand === "reference" || button.dataset.imageCommand === "variation") { referenceUrl = url; paintReference(); root.querySelector("textarea")?.focus(); } if (button.dataset.imageCommand === "insert") { insertUrl = url; const dialog = root.querySelector<HTMLDialogElement>("[data-insert-dialog]")!; const pages = await api<Pages>("/api/pages"); const choices = dialog.querySelector<HTMLElement>("[data-page-choices]")!; choices.innerHTML = pages.pages.length ? pages.pages.map((page) => `<button data-page-id="${page.id}">${page.name}<small> · ${page.type === "sell" ? "Page produit" : "Page"}</small></button>`).join("") : `<a href="/start">Créer une page d’abord</a>`; choices.querySelectorAll<HTMLElement>("[data-page-id]").forEach((choice) => choice.addEventListener("click", () => { const pageId = choice.dataset.pageId!; sessionStorage.setItem("weflo-studio-insert", JSON.stringify({ pageId, imageUrl: insertUrl })); location.assign(`/editeur?page=${pageId}`); })); dialog.showModal(); } }));
    const dialog = root.querySelector<HTMLDialogElement>("[data-insert-dialog]"); dialog?.querySelector("[data-insert-close]")?.addEventListener("click", () => dialog.close());
  };
  render();
}
void start();
