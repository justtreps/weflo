import type { CreationFormatId } from "../onboarding/creation-recipe";
import { FORMAT_FLOWS, flowForFormat, type CreationSource } from "./format-flow";
import { renderFormatIntake } from "./format-intake";
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

const creationSources = new Set<CreationSource>(["link", "image", "description", "shopify"]);

export function sourceForFormat(format: CreationFormatId | null, source: string | null): CreationSource | null {
  const selectedSource = source && creationSources.has(source as CreationSource) ? source as CreationSource : null;
  if (!format || !selectedSource) return selectedSource;
  const allowedSources = flowForFormat(format).allowedSources;
  if (allowedSources.includes(selectedSource)) return selectedSource;
  return allowedSources.includes("description") ? "description" : allowedSources[0] ?? null;
}

export function creationWorkspaceUrl(format: CreationFormatId | null, templateId: string | null, state: { source: string | null; prompt: string }): string {
  const params = new URLSearchParams();
  const source = sourceForFormat(format, state.source);
  if (format) params.set("format", format);
  if (templateId) params.set("template", templateId);
  if (source) params.set("source", source);
  if (state.prompt) params.set("prompt", state.prompt);
  const query = params.toString();
  return query ? `/creer?${query}` : "/creer";
}

function esc(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }

type RenderCreateWorkspaceInput = { workspaceName: string; selectedFormat: CreationFormatId | null; selectedTemplateId: string | null; source: string | null; prompt: string; answers: Record<string, string>; missingFieldIds?: string[] };

function renderIntake(format: CreationFormatId, source: string | null, prompt: string, answers: Record<string, string>, missingFieldIds: string[] = []): string {
  const flow = flowForFormat(format);
  return `<button class="back-template" data-back-template>← Changer de modèle</button><div class="create-heading"><p>${esc(flow.title)}</p><h1>Donne-nous la matière de départ.</h1><span>Weflo utilisera ces informations pour construire une première version fidèle à ton objectif.</span></div>${renderFormatIntake(flow, answers, source, { prompt, missingFieldIds })}`;
}

export function renderCreateWorkspace(input: RenderCreateWorkspaceInput): string {
  const cards = creationFormats.map((format) => `<button class="format-card" data-create-format="${format.id}"><span>${format.icon}</span><strong>${format.title}</strong><small>${format.description}</small></button>`).join("");
  const selected = creationFormats.find((format) => format.id === input.selectedFormat);
  const flow = input.selectedFormat ? flowForFormat(input.selectedFormat) : null;
  const source = sourceForFormat(input.selectedFormat, input.source);
  const hasTemplate = Boolean(flow?.templates.some((template) => template.id === input.selectedTemplateId));
  const content = !selected ? `<div class="create-heading"><p>Nouvelle création</p><h1>Qu’est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : selected.id === "blank" ? "" : !hasTemplate ? `<button class="back-format" data-back-format>← Changer de format</button>${renderTemplateGallery(flow!, null, (template) => creationWorkspaceUrl(flow!.id, template.id, { source, prompt: input.prompt }))}` : renderIntake(selected.id, source, input.prompt, input.answers, input.missingFieldIds);
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(input.workspaceName)}</small></aside><main>${content}</main></div>`;
}
