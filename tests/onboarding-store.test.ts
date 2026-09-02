import { describe, expect, it } from "vitest";
import { MemoryStore } from "../src/repos/memory";
import { createOnboardingDraftInput } from "../src/onboarding/schema";

describe("onboarding draft repository", () => {
  it("persists edits and claims an anonymous draft exactly once", async () => {
    const store = new MemoryStore();
    const draft = await store.createOnboardingDraft(createOnboardingDraftInput({
      claimTokenHash: "hash-1",
      sourceUrl: "https://shop.example/products/lamp",
    }));

    await store.updateOnboardingDraft(draft.id, { language: "fr", brandName: "LumiWall" });
    const claimed = await store.claimOnboardingDraft(draft.id, "hash-1", "user-1", "page-1");

    expect(claimed).toMatchObject({ language: "fr", brandName: "LumiWall", claimedPageId: "page-1" });
    expect(await store.claimOnboardingDraft(draft.id, "hash-1", "user-1", "page-1")).toMatchObject({ claimedPageId: "page-1" });
    await expect(store.claimOnboardingDraft(draft.id, "wrong", "user-2", "page-2")).rejects.toThrow("invalid claim token");
  });

  it("returns isolated copies so callers cannot mutate stored progress", async () => {
    const store = new MemoryStore();
    const draft = await store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: "hash-2", sourceUrl: "https://shop.example/p/1" }));
    draft.stages[0].state = "complete";
    expect((await store.getOnboardingDraft(draft.id))?.stages[0].state).toBe("waiting");
  });
});
