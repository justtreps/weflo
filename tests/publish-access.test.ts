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
    expect(html).toContain("Débloque la publication avec Weflo Pro");
    expect(html).toContain("data-pro-checkout");
    expect(html).not.toContain('href="/facturation"');
    expect(html).toContain("Passer à Weflo Pro");
  });
});
