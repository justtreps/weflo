import "./maquette-dashboard.css";

const prompt = document.querySelector<HTMLTextAreaElement>("#store-prompt");
const picker = document.querySelector<HTMLInputElement>("[data-image-picker]");
const feedback = document.querySelector<HTMLElement>("[data-prompt-hint]");
const status = document.querySelector<HTMLElement>(".desk-feedback");
const shopifyPanel = document.querySelector<HTMLDialogElement>("[data-shopify-panel]");

function focusPrompt() {
  prompt?.focus();
  if (feedback) feedback.textContent = "Colle ton lien : on importe le produit, les variantes et les images.";
}

function openImagePicker() {
  picker?.click();
}

function openShopifyPanel() {
  shopifyPanel?.showModal();
}

function showBlankConfirmation() {
  if (!status) return;
  status.hidden = false;
  status.innerHTML = '<strong>Page vierge sélectionnée.</strong> L’éditeur s’ouvrira sans modèle imposé. <a href="/editeur">Ouvrir la page</a>';
}

document.querySelector('[data-start-mode="link"]')?.addEventListener("click", focusPrompt);
document.querySelector('[data-start-mode="image"]')?.addEventListener("click", openImagePicker);
for (const button of document.querySelectorAll('[data-start-mode="shopify"]')) button.addEventListener("click", openShopifyPanel);
document.querySelector('[data-start-mode="blank"]')?.addEventListener("click", showBlankConfirmation);
for (const button of document.querySelectorAll("[data-close-panel]")) button.addEventListener("click", () => shopifyPanel?.close());

picker?.addEventListener("change", () => {
  const file = picker.files?.[0];
  if (!file || !status) return;
  status.hidden = false;
  status.innerHTML = `<strong>${file.name}</strong> est prête. Weflo analysera ce produit avant de construire la boutique.`;
});

document.querySelector<HTMLFormElement>("[data-prompt-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!prompt?.value.trim()) return focusPrompt();
  location.assign(`/start?source=${encodeURIComponent(prompt.value.trim())}`);
});

