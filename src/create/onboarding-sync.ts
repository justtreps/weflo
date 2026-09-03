import type { CreationFlowState } from "./flow-state";
import type { OnboardingDraft } from "../onboarding/types";

type SyncState = Pick<CreationFlowState, "format" | "templateId" | "answers">;

export function onboardingDraftPatch(
  state: SyncState,
  strategy?: Pick<OnboardingDraft, "personas" | "angles">,
) {
  return {
    creationFormat: state.format ?? "store",
    templateId: state.templateId,
    answers: { ...state.answers },
    language: "fr",
    ...(strategy ? { personas: strategy.personas, angles: strategy.angles } : {}),
  };
}
