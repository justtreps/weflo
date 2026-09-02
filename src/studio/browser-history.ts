import type { ImageGeneration } from "./types";

function isGeneration(value: unknown): value is ImageGeneration {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ImageGeneration>;
  return typeof row.id === "string" && typeof row.prompt === "string" && typeof row.createdAt === "string" && Array.isArray(row.images) && row.images.every((image) => image && typeof image.url === "string");
}

export function readCachedGenerations(value: string | null): ImageGeneration[] {
  try { const parsed: unknown = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed.filter(isGeneration) : []; }
  catch { return []; }
}

export function mergeGenerations(primary: ImageGeneration[], secondary: ImageGeneration[]): ImageGeneration[] {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((generation) => !seen.has(generation.id) && Boolean(seen.add(generation.id))).slice(0, 100);
}
