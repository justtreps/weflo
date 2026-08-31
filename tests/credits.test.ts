import { describe, it, expect } from "vitest";
import { spendCredits, totalCredits } from "../src/lib/credits";

const base = {
  workspaceId: "ws1",
  monthlyRemaining: 5,
  monthlyResetAt: new Date(Date.now() + 86400000).toISOString(),
  purchasedRemaining: 2,
};

describe("spendCredits", () => {
  it("spends monthly first then purchased", () => {
    const a = spendCredits(base, 6);
    expect(a.monthlyRemaining).toBe(0);
    expect(a.purchasedRemaining).toBe(1);
  });

  it("throws when not enough", () => {
    expect(() => spendCredits(base, 8)).toThrow(/credits/i);
  });

  it("totals both buckets", () => {
    expect(totalCredits(base)).toBe(7);
  });
});
