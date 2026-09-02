import OpenAI, { toFile } from "openai";

export type ImageEditPort = { edit(input: { sourceUrl: string; prompt: string }): Promise<{ url: string }> };

export function createOpenAiImageEdit(apiKey: string): ImageEditPort {
  const client = new OpenAI({ apiKey });
  return {
    async edit({ sourceUrl, prompt }) {
      const source = await fetch(sourceUrl);
      if (!source.ok) throw new Error("The source product image could not be loaded.");
      const type = source.headers.get("content-type") || "image/png";
      if (!type.startsWith("image/")) throw new Error("The source must be an image.");
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.byteLength > 20_000_000) throw new Error("The source image is too large.");
      const result = await client.images.edit({ model: "gpt-image-1", image: await toFile(bytes, `product.${type.includes("jpeg") ? "jpg" : type.split("/")[1] || "png"}`, { type }), prompt: `Preserve the exact same physical product, silhouette, proportions, materials, colours, branding, labels, controls and distinctive details from the source image. Do not redesign, replace or reinterpret the product. Only change the scene, composition, lighting or marketing treatment requested here: ${prompt}`, size: "1536x1024", quality: "high", output_format: "webp", response_format: "b64_json" });
      const encoded = result.data?.[0]?.b64_json;
      if (!encoded) throw new Error("The image model returned no image.");
      return { url: `data:image/webp;base64,${encoded}` };
    },
  };
}
