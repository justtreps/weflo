import { describe, expect, it } from "vitest";
import { renderStudioView } from "../src/studio/view";

describe("image studio view", () => {
  it("offers four image models, five formats, references, history and page insertion", () => {
    const html = renderStudioView({ workspaceName: "Studio", generations: [{ id: "img_1", workspaceId: "ws_1", userId: "u1", model: "flux-kontext-pro", prompt: "Lampe sur un mur en travertin", aspectRatio: "1:1", referenceUrl: null, images: [{ url: "https://fal.media/lamp.webp" }], status: "completed", createdAt: "2026-09-02T12:00:00Z" }] });
    expect(html).toContain("Flux Kontext Pro");
    expect(html).toContain("Flux Kontext Max");
    expect(html).toContain("Ideogram V3");
    expect(html).toContain("Recraft V3");
    for (const ratio of ["1:1", "4:3", "16:9", "3:4", "9:16"]) expect(html).toContain(`data-ratio="${ratio}"`);
    expect(html).toContain('data-reference-input');
    expect(html).toContain('data-studio-history');
    expect(html).toContain('data-image-command="insert"');
    expect(html).toContain("https://fal.media/lamp.webp");
  });
});
