export type ImageModelId = "flux-kontext-pro" | "flux-kontext-max" | "ideogram-v3" | "recraft-v3";
export type ImageAspectRatio = "1:1" | "4:3" | "16:9" | "3:4" | "9:16";
export type GeneratedImage = { url: string; width?: number; height?: number; contentType?: string };
export type ImageGeneration = {
  id: string;
  workspaceId: string;
  userId: string;
  model: ImageModelId;
  prompt: string;
  aspectRatio: ImageAspectRatio;
  referenceUrl: string | null;
  images: GeneratedImage[];
  status: "completed" | "failed";
  createdAt: string;
};
export type GenerateImageInput = Pick<ImageGeneration, "model" | "prompt" | "aspectRatio"> & { numImages: number; referenceUrl?: string | null };
export type ImageGenerationResult = { images: GeneratedImage[] };
export type ImageStudioPort = { generate(input: GenerateImageInput): Promise<ImageGenerationResult> };
