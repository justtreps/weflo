import { describe, expect, it } from "vitest";
import { mergeGenerations, readCachedGenerations } from "../src/studio/browser-history";
import type { ImageGeneration } from "../src/studio/types";

const generation = (id: string): ImageGeneration => ({ id, workspaceId: "ws_1", userId: "u1", model: "nano-banana-2", prompt: id, aspectRatio: "1:1", referenceUrl: null, images: [{ url: `https://fal.media/${id}.webp` }], status: "completed", createdAt: "2026-09-02T12:00:00Z" });

describe("studio browser history", () => {
  it("reads valid cached generations and rejects malformed storage", () => {
    expect(readCachedGenerations(JSON.stringify([generation("one")]))).toHaveLength(1);
    expect(readCachedGenerations("not-json")).toEqual([]);
  });

  it("merges cached and server history without duplicates", () => {
    expect(mergeGenerations([generation("new"), generation("same")], [generation("same"), generation("old")]).map((item) => item.id)).toEqual(["new", "same", "old"]);
  });
});
