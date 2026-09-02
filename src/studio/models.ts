import type { ImageAspectRatio, ImageModelId } from "./types";

export type ImageModelDefinition = { id: ImageModelId; label: string; description: string; textEndpoint: string; referenceEndpoint: string };

const MODELS: Record<ImageModelId, ImageModelDefinition> = {
  "flux-kontext-pro": { id: "flux-kontext-pro", label: "Flux Kontext Pro", description: "Rapide, fidèle au produit", textEndpoint: "fal-ai/flux-pro/kontext/text-to-image", referenceEndpoint: "fal-ai/flux-pro/kontext" },
  "flux-kontext-max": { id: "flux-kontext-max", label: "Flux Kontext Max", description: "Fidélité et finition maximales", textEndpoint: "fal-ai/flux-pro/kontext/max/text-to-image", referenceEndpoint: "fal-ai/flux-pro/kontext/max" },
  "ideogram-v3": { id: "ideogram-v3", label: "Ideogram V3", description: "Visuels publicitaires avec texte", textEndpoint: "fal-ai/ideogram/v3", referenceEndpoint: "fal-ai/flux-pro/kontext" },
  "recraft-v3": { id: "recraft-v3", label: "Recraft V3", description: "Direction artistique e-commerce", textEndpoint: "fal-ai/recraft/v3/text-to-image", referenceEndpoint: "fal-ai/recraft/v3/image-to-image" },
};

const SIZES: Record<ImageAspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 }, "4:3": { width: 1200, height: 900 }, "16:9": { width: 1365, height: 768 }, "3:4": { width: 900, height: 1200 }, "9:16": { width: 768, height: 1365 },
};

export function imageModel(id: ImageModelId): ImageModelDefinition { return MODELS[id]; }
export function imageSizeFor(ratio: ImageAspectRatio) { return SIZES[ratio]; }
export function imageModels(): ImageModelDefinition[] { return Object.values(MODELS); }
export function isImageModel(value: unknown): value is ImageModelId { return typeof value === "string" && value in MODELS; }
export function isImageAspectRatio(value: unknown): value is ImageAspectRatio { return typeof value === "string" && value in SIZES; }
