import { describe, expect, it } from "vitest";
import { publishAccessForBilling, renderPublishPaywall } from "../src/hydrate/publish-access";

describe("publishAccessForBilling", () => {
  it("opens the Pro paywall for a free workspace", () => {
    expect(publishAccessForBilling({ status: "none", planId: null }, "pro")).toEqual({
      allowed: false,
      reason: "pro_required",
    });
  });

  it("allows only the configured active Pro plan", () => {
    expect(publishAccessForBilling({ status: "active", planId: "starter" }, "pro").allowed).toBe(false);
    expect(publishAccessForBilling({ status: "active", planId: "pro" }, "pro").allowed).toBe(true);
  });
});

describe("publish paywall", () => {
  it("offers a clear Pro upgrade instead of publishing", () => {
    const html = renderPublishPaywall();
    expect(html).toContain("Unlock publishing with Weflo Pro");
    expect(html).toContain('href="/facturation"');
    expect(html).toContain("Upgrade to Weflo Pro");
  });
});
