import type { CreationFormatId } from "../onboarding/creation-recipe";
import { FORMAT_FLOWS, flowForFormat, type CreationSource, type IntakeField } from "./format-flow";
import { renderTemplateGallery } from "./template-gallery";

const formatIcons: Record<CreationFormatId, string> = {
  store: "◆", product: "▣", landing: "↗", advertorial: "¶",
  quiz: "?", home: "⌂", blog: "≡", blank: "＋",
};

export const creationFormats = FORMAT_FLOWS.map(({ id, title, description }) => ({ id, title, description, icon: formatIcons[id] }));

export function creationActionUrl(action: "generate" | "link" | "image" | "blank", prompt = ""): string {
  if (action === "link") return "/creer?source=link";
  if (action === "image") return "/creer?source=image";
  if (action === "blank") return "/creer?format=blank";
  return prompt ? `/creer?source=description&prompt=${encodeURIComponent(prompt)}` : "/creer";
}

function esc(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }

type RenderCreateWorkspaceInput = { workspaceName: string; selectedFormat: CreationFormatId | null; selectedTemplateId: string | null; source: string | null; prompt: string; answers: Record<string, string> };

const sourceLabels: Record<CreationSource, { icon: string; title: string; description: string }> = {
  link: { icon: "↗", title: "Importer un lien", description: "Amazon, AliExpress, Shopify ou autre site" },
  image: { icon: "▧", title: "Ajouter une image", description: "PNG, JPG ou WebP" },
  description: { icon: "Aa", title: "Décrire mon idée", description: "Partir d’une intention claire" },
  shopify: { icon: "S", title: "Depuis Shopify", description: "Choisir dans le catalogue connecté" },
};

function renderField(field: IntakeField, answers: Record<string, string>): string {
  const value = esc(answers[field.id] ?? "");
  const required = field.required ? " required" : "";
  if (field.kind === "textarea" || field.kind === "list") return `<label class="intake-field ${field.kind === "list" ? "intake-list" : ""}"><span>${esc(field.label)}${field.required ? "" : " (facultatif)"}</span><textarea name="${esc(field.id)}" placeholder="${esc(field.placeholder)}"${required}>${value}</textarea></label>`;
  return `<label class="intake-field"><span>${esc(field.label)}${field.required ? "" : " (facultatif)"}</span><input name="${esc(field.id)}" value="${value}" placeholder="${esc(field.placeholder)}"${required}></label>`;
}

function renderSource(source: CreationSource): string {
  const item = sourceLabels[source];
  if (source === "image") return `<label data-create-source="image"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label>`;
  return `<button type="button" data-create-source="${source}"><b>${item.icon}</b><strong>${item.title}</strong><small>${item.description}</small></button>`;
}

function renderIntake(format: CreationFormatId, source: string | null, prompt: string, answers: Record<string, string>): string {
  const flow = flowForFormat(format);
  return `<button class="back-template" data-back-template>← Changer de modèle</button><div class="create-heading"><p>${esc(flow.title)}</p><h1>Donne-nous la matière de départ.</h1><span>Weflo utilisera ces informations pour construire une première version fidèle à ton objectif.</span></div><div class="source-grid source-grid-${flow.allowedSources.length}">${flow.allowedSources.map(renderSource).join("")}</div><form class="source-form format-intake" data-source-form><div class="intake-fields">${flow.intake.map((field) => renderField(field, answers)).join("")}</div><label class="intake-field intake-prompt"><span>Contexte à ajouter</span><textarea name="prompt" placeholder="${source === "link" ? "Colle le lien de ton produit…" : "Ajoute une précision utile pour cette page…"}">${esc(prompt)}</textarea></label><button>Analyser et continuer</button></form>`;
}

export function renderCreateWorkspace(input: RenderCreateWorkspaceInput): string {
  const cards = creationFormats.map((format) => `<button class="format-card" data-create-format="${format.id}"><span>${format.icon}</span><strong>${format.title}</strong><small>${format.description}</small></button>`).join("");
  const selected = creationFormats.find((format) => format.id === input.selectedFormat);
  const flow = input.selectedFormat ? flowForFormat(input.selectedFormat) : null;
  const hasTemplate = Boolean(flow?.templates.some((template) => template.id === input.selectedTemplateId));
  const content = !selected ? `<div class="create-heading"><p>Nouvelle création</p><h1>Qu’est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : selected.id === "blank" ? "" : !hasTemplate ? `<button class="back-format" data-back-format>← Changer de format</button>${renderTemplateGallery(flow!, null)}` : renderIntake(selected.id, input.source, input.prompt, input.answers);
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(input.workspaceName)}</small></aside><main>${content}</main></div>`;
}
