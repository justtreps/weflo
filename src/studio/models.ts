import type { ImageAspectRatio, ImageModelId } from "./types";

export type ImageModelDefinition = { id: ImageModelId; label: string; description: string; textEndpoint: string; referenceEndpoint: string; inputMode: "aspect" | "size"; referenceKey: "image_url" | "image_urls" };

const MODELS: Record<ImageModelId, ImageModelDefinition> = {
  "nano-banana-2": { id: "nano-banana-2", label: "Nano Banana 2", description: "Rapide, réaliste et fidèle au produit", textEndpoint: "fal-ai/nano-banana-2", referenceEndpoint: "fal-ai/nano-banana-2/edit", inputMode: "aspect", referenceKey: "image_urls" },
  "nano-banana-pro": { id: "nano-banana-pro", label: "Nano Banana Pro", description: "Composition premium et texte précis", textEndpoint: "fal-ai/nano-banana-pro", referenceEndpoint: "fal-ai/nano-banana-pro/edit", inputMode: "aspect", referenceKey: "image_urls" },
  "gpt-image-2": { id: "gpt-image-2", label: "GPT Image 2", description: "Prompt complexe, typographie et retouche", textEndpoint: "openai/gpt-image-2", referenceEndpoint: "openai/gpt-image-2/edit", inputMode: "size", referenceKey: "image_urls" },
  "flux-2-flex": { id: "flux-2-flex", label: "FLUX.2 Flex", description: "Direction artistique et détails contrôlés", textEndpoint: "fal-ai/flux-2-flex", referenceEndpoint: "fal-ai/flux-2-flex/edit", inputMode: "size", referenceKey: "image_urls" },
};

const SIZES: Record<ImageAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 }, "4:3": { width: 1200, height: 900 }, "16:9": { width: 1365, height: 768 }, "3:4": { width: 900, height: 1200 }, "9:16": { width: 768, height: 1365 },
};

export function imageModel(id: ImageModelId): ImageModelDefinition { return MODELS[id]; }
export function imageSizeFor(ratio: ImageAspectRatio) { return SIZES[ratio]; }
export function imageModels(): ImageModelDefinition[] { return Object.values(MODELS); }
export function isImageModel(value: unknown): value is ImageModelId { return typeof value === "string" && value in MODELS; }
export function isImageAspectRatio(value: unknown): value is ImageAspectRatio { return typeof value === "string" && value in SIZES; }
