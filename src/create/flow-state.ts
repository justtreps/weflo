import { flowForFormat, templateById, type CreationSource } from "./format-flow";
import { sourceForFormat } from "./workspace";
import { isCreationFormat, type CreationFormatId } from "../onboarding/creation-recipe";
import { persistentCreationText } from "./draft-safety";

export type CreationStep = "format" | "template" | "intake" | "strategy" | "build" | "create-blank";

export type CreationFlowState = {
  format: CreationFormatId | null;
  templateId: string | null;
  source: CreationSource | null;
  prompt: string;
  answers: Record<string, string>;
  step: CreationStep;
};

export type CreationFlowEvent =
  | { type: "SELECT_FORMAT"; format: CreationFormatId }
  | { type: "SELECT_TEMPLATE"; templateId: string }
  | { type: "SELECT_SOURCE"; source: CreationSource | null }
  | { type: "UPDATE_INTAKE"; prompt: string; answers: Record<string, string> }
  | { type: "CONTINUE" }
  | { type: "BACK" }
  | { type: "START_BUILD" };

const steps = new Set<CreationStep>(["format", "template", "intake", "strategy", "build", "create-blank"]);
const sources = new Set<CreationSource>(["link", "image", "description", "shopify"]);

function assertCompatibleTemplate(format: CreationFormatId, templateId: string): void {
  const template = templateById(templateId);
  if (template.format !== format) throw new Error(`Template ${templateId} is not compatible with ${format}`);
}

function safeAnswers(format: CreationFormatId | null, value: unknown): Record<string, string> {
  if (!format || format === "blank" || !value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return Object.fromEntries(flowForFormat(format).intake.flatMap((field) => {
    const answer = raw[field.id];
    return typeof answer === "string" && persistentCreationText(answer) === answer ? [[field.id, answer] as const] : [];
  }));
}

function missingRequiredFields(state: CreationFlowState): string[] {
  if (!state.format || state.format === "blank") return [];
  return flowForFormat(state.format).intake
    .filter((field) => field.required && !(state.answers[field.id] ?? "").trim())
    .map((field) => field.id);
}

function assertState(state: CreationFlowState): void {
  if (!state.format) {
    if (state.templateId) throw new Error("A template requires a creation format");
    if (state.step !== "format") throw new Error("A creation format must be selected before continuing");
    return;
  }

  if (state.format === "blank") {
    if (state.templateId) throw new Error("A blank page cannot use a template");
    if (state.source) throw new Error("A blank page cannot use an import source");
    if (state.step !== "create-blank") throw new Error("A blank page must open directly in creation");
    return;
  }

  if (state.templateId) assertCompatibleTemplate(state.format, state.templateId);
  if (state.step === "create-blank") throw new Error("Only a blank page can use the create-blank step");
  if (state.step === "format" && state.templateId) throw new Error("The format choice cannot have a selected template");
  if (state.step === "template" && state.templateId) throw new Error("The template gallery cannot have a selected template");
  if ((state.step === "intake" || state.step === "strategy" || state.step === "build") && !state.templateId) {
    throw new Error("A template must be selected before intake");
  }
  if (state.source && !flowForFormat(state.format).allowedSources.includes(state.source)) {
    throw new Error(`Source ${state.source} is not compatible with ${state.format}`);
  }
  if ((state.step === "strategy" || state.step === "build") && missingRequiredFields(state).length) {
    throw new Error(`Missing required intake fields: ${missingRequiredFields(state).join(", ")}`);
  }
}

export function initialCreationState(url: URL): CreationFlowState {
  const requestedFormat = url.searchParams.get("format");
  const format = isCreationFormat(requestedFormat) ? requestedFormat : null;
  const requestedTemplate = url.searchParams.get("template");
  const templateId = format && format !== "blank" && requestedTemplate ? requestedTemplate : null;
  if (format && templateId) assertCompatibleTemplate(format, templateId);

  const state: CreationFlowState = {
    format,
    templateId,
    source: format === "blank" ? null : sourceForFormat(format, url.searchParams.get("source")),
    prompt: url.searchParams.get("prompt") ?? "",
    answers: {},
    step: format === "blank" ? "create-blank" : !format ? "format" : templateId ? "intake" : "template",
  };
  assertState(state);
  return state;
}

export function transitionCreationFlow(state: CreationFlowState, event: CreationFlowEvent): CreationFlowState {
  assertState(state);
  let next: CreationFlowState;

  switch (event.type) {
    case "SELECT_FORMAT": {
      const format = event.format;
      next = {
        ...state,
        format,
        templateId: null,
        source: format === "blank" ? null : sourceForFormat(format, state.source),
        answers: safeAnswers(format, state.answers),
        step: format === "blank" ? "create-blank" : "template",
      };
      break;
    }
    case "SELECT_TEMPLATE":
      if (!state.format || state.format === "blank") throw new Error("Select a creation format before a template");
      assertCompatibleTemplate(state.format, event.templateId);
      next = { ...state, templateId: event.templateId, step: "intake" };
      break;
    case "SELECT_SOURCE":
      if (!state.format || state.format === "blank") throw new Error("Select a compatible creation format before a source");
      next = { ...state, source: sourceForFormat(state.format, event.source) };
      break;
    case "UPDATE_INTAKE":
      next = {
        ...state,
        prompt: event.prompt,
        answers: safeAnswers(state.format, event.answers),
      };
      break;
    case "CONTINUE": {
      if (state.format === "blank") return state;
      if (state.step !== "intake") throw new Error("The creation flow cannot continue from this step");
      const missing = missingRequiredFields(state);
      if (missing.length) throw new Error(`Missing required intake fields: ${missing.join(", ")}`);
      next = { ...state, step: "strategy" };
      break;
    }
    case "START_BUILD":
      if (state.step !== "strategy") throw new Error("Strategy must be ready before construction");
      next = { ...state, step: "build" };
      break;
    case "BACK":
      if (state.step === "build") next = { ...state, step: "strategy" };
      else if (state.step === "strategy") next = { ...state, step: "intake" };
      else if (state.step === "intake") next = { ...state, templateId: null, step: "template" };
      else if (state.step === "template") next = { ...state, templateId: null, step: "format" };
      else next = state;
      break;
  }

  assertState(next);
  return next;
}

export function serializeCreationDraft(state: CreationFlowState): string {
  const format = isCreationFormat(state.format) ? state.format : null;
  const templateId = format && format !== "blank" && state.templateId ? state.templateId : null;
  if (format && templateId) assertCompatibleTemplate(format, templateId);
  const source = format === "blank" ? null : sourceForFormat(format, state.source);
  return JSON.stringify({
    version: 2,
    format,
    templateId,
    source,
    prompt: persistentCreationText(state.prompt),
    answers: safeAnswers(format, state.answers),
    step: state.step,
  });
}

export function restoreCreationDraft(raw: string | null): CreationFlowState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.version !== undefined && value.version !== 2) return null;
    const format = value.format === null ? null : isCreationFormat(value.format) ? value.format : null;
    if (value.format !== null && !format) return null;
    const templateId = value.templateId === null ? null : typeof value.templateId === "string" ? value.templateId : null;
    if (value.templateId !== null && !templateId) return null;
    const source = value.source === null ? null : sources.has(value.source as CreationSource) ? value.source as CreationSource : null;
    if (value.source !== null && !source) return null;
    const step = value.step === undefined
      ? format === "blank" ? "create-blank" : !format ? "format" : templateId ? "intake" : "template"
      : steps.has(value.step as CreationStep) ? value.step as CreationStep : null;
    if (!step) return null;

    const state: CreationFlowState = {
      format,
      templateId,
      source,
      prompt: persistentCreationText(value.prompt),
      answers: safeAnswers(format, value.answers),
      step,
    };
    assertState(state);
    return state;
  } catch {
    return null;
  }
}

export function mergeCompatibleCreationDraft(urlState: CreationFlowState, saved: CreationFlowState | null, url: URL): CreationFlowState {
  if (!saved) return urlState;
  const explicitFormat = url.searchParams.has("format");
  if (explicitFormat && saved.format !== urlState.format) return urlState;

  const format = explicitFormat ? urlState.format : saved.format;
  if (!format) return urlState;
  if (url.searchParams.has("source") && urlState.source && sourceForFormat(format, urlState.source) !== urlState.source) return urlState;
  if (format === "blank") return { ...urlState, format, templateId: null, source: null, answers: {}, step: "create-blank" };

  const explicitTemplate = url.searchParams.has("template");
  const templateId = explicitTemplate ? urlState.templateId : saved.templateId;
  if (templateId) {
    try { assertCompatibleTemplate(format, templateId); } catch { return urlState; }
  }
  const source = url.searchParams.has("source") ? sourceForFormat(format, urlState.source) : sourceForFormat(format, saved.source);
  const prompt = url.searchParams.has("prompt") ? urlState.prompt : saved.prompt;
  const answers = safeAnswers(format, saved.answers);
  const step: CreationStep = !templateId && saved.step === "format" ? "format" : templateId ? "intake" : "template";
  const merged = { format, templateId, source, prompt, answers, step } satisfies CreationFlowState;
  assertState(merged);
  return merged;
}

export function submissionActionForState(state: CreationFlowState): "link" | "image" | "simple" {
  assertState(state);
  if (state.source === "link") return "link";
  if (state.source === "image") return "image";
  return "simple";
}

export function creationStartupAction(state: CreationFlowState): "create-blank" | "render" {
  assertState(state);
  return state.step === "create-blank" ? "create-blank" : "render";
}
