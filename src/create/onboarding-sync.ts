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

export async function synchronizeOnboardingDraft(input: {
  draftId: string;
  claimToken: string;
  state: SyncState;
  strategy?: Pick<OnboardingDraft, "personas" | "angles">;
  request: (url: string, init: RequestInit) => Promise<unknown>;
}): Promise<unknown> {
  return input.request(`/api/onboarding/${encodeURIComponent(input.draftId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-weflo-claim-token": input.claimToken },
    body: JSON.stringify(onboardingDraftPatch(input.state, input.strategy)),
  });
}
