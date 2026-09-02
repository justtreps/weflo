import { imageModel, imageSizeFor } from "./models";
import type { GeneratedImage, ImageStudioPort } from "./types";

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function createFalImageStudio(key: string, fetcher: Fetch = fetch): ImageStudioPort {
  return { async generate(input) {
    const model = imageModel(input.model);
    const size = imageSizeFor(input.aspectRatio);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    const endpoint = input.referenceUrl ? model.referenceEndpoint : model.textEndpoint;
    const body: Record<string, unknown> = { prompt: input.prompt, num_images: input.numImages, output_format: "webp" };
    if (model.inputMode === "aspect") body.aspect_ratio = input.aspectRatio;
    else body.image_size = size;
    if (input.referenceUrl) body[model.referenceKey] = model.referenceKey === "image_urls" ? [input.referenceUrl] : input.referenceUrl;
    try {
      const response = await fetcher(`https://fal.run/${endpoint}`, { method: "POST", signal: controller.signal, headers: { Authorization: `Key ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Fal ${response.status}: ${(await response.text()).slice(0, 240)}`);
      const payload = await response.json() as { images?: GeneratedImage[]; image?: GeneratedImage };
      const images = Array.isArray(payload.images) ? payload.images : payload.image ? [payload.image] : [];
      if (!images.length || images.some((image) => typeof image?.url !== "string")) throw new Error("Fal returned no image");
      return { images };
    } finally { clearTimeout(timer); }
  } };
}
