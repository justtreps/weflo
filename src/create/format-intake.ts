import type { CreationSource, FormatFlow, IntakeField } from "./format-flow";

const sourceLabels: Record<CreationSource, { icon: string; title: string; description: string }> = {
  link: { icon: "↗", title: "Importer un lien", description: "Amazon, AliExpress, Shopify ou autre site" },
  image: { icon: "▧", title: "Ajouter une image", description: "PNG, JPG ou WebP" },
  description: { icon: "Aa", title: "Décrire mon idée", description: "Partir d’une intention claire" },
  shopify: { icon: "S", title: "Depuis Shopify", description: "Choisir dans le catalogue connecté" },
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function renderField(field: IntakeField, answers: Record<string, string>, missingFields: Set<string>): string {
  const value = esc(answers[field.id] ?? "");
  const required = field.required ? " required" : "";
  const missing = missingFields.has(field.id);
  const error = missing ? `<small class="intake-error" id="error-${esc(field.id)}">Ce champ est obligatoire.</small>` : "";
  const accessibility = missing ? ` aria-invalid="true" aria-describedby="error-${esc(field.id)}"` : "";
  const name = `answers[${esc(field.id)}]`;
  const label = `<span>${esc(field.label)}${field.required ? "" : " (facultatif)"}</span>`;

  if (field.kind === "textarea" || field.kind === "list") {
    return `<label class="intake-field ${field.kind === "list" ? "intake-list" : ""}">${label}<textarea name="${name}" placeholder="${esc(field.placeholder)}"${required}${accessibility}>${value}</textarea>${error}</label>`;
  }

  return `<label class="intake-field">${label}<input name="${name}" value="${value}" placeholder="${esc(field.placeholder)}"${required}${accessibility}>${error}</label>`;
}

function renderSource(source: CreationSource): string {
  const item = sourceLabels[source];
  if (source === "image") {
    return `<label data-create-source="image"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label>`;
  }
  return `<button type="button" data-create-source="${source}"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small></button>`;
}

export function validateFormatIntake(flow: FormatFlow, answers: Record<string, string>): string[] {
  return flow.intake.filter((field) => field.required && !(answers[field.id] ?? "").trim()).map((field) => field.id);
}

export function answersFromFormData(form: FormData): Record<string, string> {
  return Object.fromEntries([...form.entries()].flatMap(([key, value]) => {
    const fieldId = /^answers\[(.+)\]$/.exec(key)?.[1];
    return fieldId ? [[fieldId, String(value)]] : [];
  }));
}

type IntakeRenderState = { prompt?: string; missingFieldIds?: string[]; busy?: boolean; error?: string };

export function renderFormatIntake(flow: FormatFlow, answers: Record<string, string>, source: string | null, state: IntakeRenderState = {}): string {
  const missingFields = new Set(state.missingFieldIds ?? []);
  const productLed = flow.id === "store" || flow.id === "product";
  const promptPlaceholder = source === "link"
    ? "Colle le lien de ton produit…"
    : productLed && !source
      ? "Choisis d’abord un lien, une image ou un produit Shopify."
      : "Ajoute une précision utile pour cette page…";

  const recovery = state.error
    ? `<div class="intake-request-error create-error" role="alert"><p>${esc(state.error)}</p>${source === "image" ? '<button type="button" data-image-retry>Choisir une autre image</button>' : ""}</div>`
    : "";
  const submit = state.busy
    ? '<button disabled>Analyse en cours…</button>'
    : `<button${state.error && source !== "image" ? " data-intake-retry" : ""}>${state.error && source !== "image" ? "Réessayer" : "Analyser et continuer"}</button>`;
  return `<div class="source-grid source-grid-${flow.allowedSources.length}">${flow.allowedSources.map(renderSource).join("")}</div><form class="source-form format-intake" data-source-form novalidate><div class="intake-fields">${flow.intake.map((field) => renderField(field, answers, missingFields)).join("")}</div><label class="intake-field intake-prompt"><span>Contexte à ajouter</span><textarea name="prompt" placeholder="${promptPlaceholder}">${esc(state.prompt ?? "")}</textarea></label>${recovery}${submit}</form>`;
}
