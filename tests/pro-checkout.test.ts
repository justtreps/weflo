import { describe, expect, it, vi } from "vitest";
import { createProCheckout } from "../src/hydrate/pro-checkout";

describe("createProCheckout", () => {
  it("creates a Pro checkout for the authenticated workspace", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workspace: { id: "ws_1" }, catalog: { pro: "plan_pro" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://whop.com/checkout/config_test" }), { status: 200 }));

    await expect(createProCheckout(fetchMock)).resolves.toBe("https://whop.com/checkout/config_test");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/billing/checkout", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ workspaceId: "ws_1", kind: "subscription", planId: "plan_pro" }),
    }));
  });

  it("rejects missing plans, invalid URLs, and failed requests", async () => {
    await expect(createProCheckout(async () => new Response(JSON.stringify({ workspace: { id: "ws" }, catalog: { pro: null } })))).rejects.toThrow("offre Pro");
    const invalidUrl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workspace: { id: "ws" }, catalog: { pro: "pro" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://evil.example/pay" })));
    await expect(createProCheckout(invalidUrl)).rejects.toThrow("paiement");
    await expect(createProCheckout(async () => new Response("no", { status: 500 }))).rejects.toThrow("facturation");
  });
});
