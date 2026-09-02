import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

describe("image-to-image API", () => {
  it("passes the source image as an identity anchor", async () => {
    let received: Record<string, string> = {};
    const app = createApp({ store: new MemoryStore(), session: async () => ({ id: "u1", email: "u@x.test" }), imageEdit: { edit: async (input) => { received = input; return { url: "data:image/webp;base64,edited" }; } } });
    const response = await app.request("/api/images/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceUrl: "https://cdn.example/product.jpg", prompt: "Place it in a premium bedroom" }) });
    expect(response.status).toBe(200);
    expect(received.sourceUrl).toContain("product.jpg");
    expect(received.prompt).toContain("premium bedroom");
    expect(await response.json()).toMatchObject({ url: expect.stringContaining("data:image") });
  });
});
