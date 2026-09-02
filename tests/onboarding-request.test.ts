import { describe, expect, it } from "vitest";
import { fetchWithDeadline, readApiJson } from "../src/hydrate/onboarding-request";

describe("onboarding browser requests", () => {
  it("aborts a stalled import and returns control to the interface", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });

    await expect(fetchWithDeadline("/api/onboarding/import", { method: "POST" }, 5, fetchImpl)).rejects.toThrow(/temps/i);
  });

  it("turns a plain-text server failure into a useful JSON-shaped error", async () => {
    const result = await readApiJson(new Response("Internal Server Error", { status: 500 }));
    expect(result).toEqual({ message: "Le serveur a rencontré une erreur. Réessaie dans un instant." });
  });
});
