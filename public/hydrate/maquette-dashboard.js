// src/hydrate/maquette-dashboard.ts
var prompt = document.querySelector("#store-prompt");
var picker = document.querySelector("[data-image-picker]");
var feedback = document.querySelector("[data-prompt-hint]");
var status = document.querySelector(".desk-feedback");
var shopifyPanel = document.querySelector("[data-shopify-panel]");
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
  status.innerHTML = '<strong>Page vierge s\xE9lectionn\xE9e.</strong> L\u2019\xE9diteur s\u2019ouvrira sans mod\xE8le impos\xE9. <a href="/editeur">Ouvrir la page</a>';
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
  status.innerHTML = `<strong>${file.name}</strong> est pr\xEAte. Weflo analysera ce produit avant de construire la boutique.`;
});
document.querySelector("[data-prompt-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!prompt?.value.trim()) return focusPrompt();
  location.assign(`/start?source=${encodeURIComponent(prompt.value.trim())}`);
});
