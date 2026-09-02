import { describe, expect, it } from "vitest";
import { createFalImageStudio } from "../src/studio/fal";
import { imageModel, imageSizeFor } from "../src/studio/models";

describe("Fal image studio", () => {
  it("maps each public model and format to a supported Fal request", () => {
    expect(imageModel("flux-kontext-pro").textEndpoint).toBe("fal-ai/flux-pro/kontext/text-to-image");
    expect(imageModel("flux-kontext-max").referenceEndpoint).toBe("fal-ai/flux-pro/kontext/max");
    expect(imageModel("ideogram-v3").textEndpoint).toBe("fal-ai/ideogram/v3");
    expect(imageModel("recraft-v3").referenceEndpoint).toBe("fal-ai/recraft/v3/image-to-image");
    expect(imageSizeFor("9:16")).toEqual({ width: 768, height: 1365 });
  });

  it("sends a reference image to a compatible image-to-image endpoint", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const studio = createFalImageStudio("secret", async (input, init) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ images: [{ url: "https://fal.media/generated.webp", width: 1024, height: 1024 }] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const result = await studio.generate({ model: "flux-kontext-pro", prompt: "Conserve exactement cette lampe", aspectRatio: "1:1", numImages: 1, referenceUrl: "https://cdn.example/lamp.jpg" });

    expect(request?.url).toBe("https://fal.run/fal-ai/flux-pro/kontext");
    expect(request?.init?.headers).toMatchObject({ Authorization: "Key secret" });
    expect(JSON.parse(String(request?.init?.body))).toMatchObject({ image_url: "https://cdn.example/lamp.jpg", prompt: expect.stringContaining("exactement") });
    expect(result.images[0].url).toContain("generated.webp");
  });
});
