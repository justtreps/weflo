import { describe, expect, it } from "vitest";
import { createFalImageStudio } from "../src/studio/fal";
import { imageModel, imageSizeFor } from "../src/studio/models";

describe("Fal image studio", () => {
  it("maps each public model and format to a supported Fal request", () => {
    expect(imageModel("nano-banana-2").textEndpoint).toBe("fal-ai/nano-banana-2");
    expect(imageModel("nano-banana-pro").referenceEndpoint).toContain("nano-banana-pro");
    expect(imageModel("gpt-image-2").textEndpoint).toBe("openai/gpt-image-2");
    expect(imageModel("flux-2-flex").textEndpoint).toContain("flux-2-flex");
    expect(imageSizeFor("9:16")).toEqual({ width: 768, height: 1365 });
  });

  it("uses aspect_ratio for modern multimodal models", async () => {
    let body: Record<string, unknown> = {};
    const studio = createFalImageStudio("secret", async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ images: [{ url: "https://fal.media/generated.webp" }] }), { status: 200 });
    });
    await studio.generate({ model: "nano-banana-2", prompt: "Produit premium", aspectRatio: "16:9", numImages: 1 });
    expect(body).toMatchObject({ aspect_ratio: "16:9", num_images: 1 });
    expect(body).not.toHaveProperty("image_size");
  });

  it("sends a reference image to a compatible image-to-image endpoint", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const studio = createFalImageStudio("secret", async (input, init) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ images: [{ url: "https://fal.media/generated.webp", width: 1024, height: 1024 }] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const result = await studio.generate({ model: "nano-banana-pro", prompt: "Conserve exactement cette lampe", aspectRatio: "1:1", numImages: 1, referenceUrl: "https://cdn.example/lamp.jpg" });

    expect(request?.url).toBe("https://fal.run/fal-ai/nano-banana-pro/edit");
    expect(request?.init?.headers).toMatchObject({ Authorization: "Key secret" });
    expect(JSON.parse(String(request?.init?.body))).toMatchObject({ image_urls: ["https://cdn.example/lamp.jpg"], prompt: expect.stringContaining("exactement") });
    expect(result.images[0].url).toContain("generated.webp");
  });

  it("uses the current FLUX.2 Flex edit endpoint and a supported output format", async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const studio = createFalImageStudio("secret", async (input, init) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ images: [{ url: `https://fal.media/flux-${requests.length}.png` }] }), { status: 200 });
    });

    const result = await studio.generate({ model: "flux-2-flex", prompt: "Photo produit", aspectRatio: "3:4", numImages: 2, referenceUrl: "https://cdn.example/product.png" });

    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe("https://fal.run/fal-ai/flux-2-flex/edit");
    expect(requests[0].body).toMatchObject({ image_urls: ["https://cdn.example/product.png"], output_format: "png", image_size: { width: 900, height: 1200 } });
    expect(requests[0].body).not.toHaveProperty("num_images");
    expect(result.images).toHaveLength(2);
  });
});
