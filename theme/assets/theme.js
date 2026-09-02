document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("[data-weflo-add]")) return;
  event.preventDefault();
  const data = new FormData(form);
  const btn = form.querySelector("button");
  if (btn) btn.disabled = true;
  try {
    await fetch("/cart/add.js", { method: "POST", body: data });
    window.location.href = "/cart";
  } catch {
    form.submit();
  } finally {
    if (btn) btn.disabled = false;
  }
});
