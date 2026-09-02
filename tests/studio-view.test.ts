import { describe, expect, it } from "vitest";
import { renderStudioView } from "../src/studio/view";

describe("image studio view", () => {
  it("offers leading image models, five formats, references, history and page insertion", () => {
    const html = renderStudioView({ workspaceName: "Studio", generations: [{ id: "img_1", workspaceId: "ws_1", userId: "u1", model: "nano-banana-2", prompt: "Lampe sur un mur en travertin", aspectRatio: "1:1", referenceUrl: null, images: [{ url: "https://fal.media/lamp.webp" }], status: "completed", createdAt: "2026-09-02T12:00:00Z" }] });
    expect(html).toContain("Nano Banana 2");
    expect(html).toContain("Nano Banana Pro");
    expect(html).toContain("GPT Image 2");
    expect(html).toContain("FLUX.2 Flex");
    for (const ratio of ["1:1", "4:3", "16:9", "3:4", "9:16"]) expect(html).toContain(`data-ratio="${ratio}"`);
    expect(html).toContain('data-reference-input');
    expect(html).toContain('data-studio-history');
    expect(html).toContain('data-image-command="insert"');
    expect(html).toContain("https://fal.media/lamp.webp");
  });

  it("renders an active generation as the first conversation item", () => {
    const html = renderStudioView({ workspaceName: "Studio", generations: [], pending: { prompt: "Une lampe sur du travertin", model: "gpt-image-2", aspectRatio: "4:3" } });
    expect(html).toContain('data-generation-pending');
    expect(html.indexOf('data-generation-pending')).toBeLessThan(html.indexOf('data-result-grid'));
    expect(html).toContain("GPT Image 2");
    expect(html).toContain("Génération en cours");
  });
});
