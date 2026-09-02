import type { BrandKit, ImportedProduct } from "./types";

const palettes: Record<string, string[]> = {
  proteo: ["#11110F", "#2F6B55", "#D9E7D5", "#F5F1E9"],
  amaro: ["#2A100A", "#A63212", "#E8B79F", "#FFF5EC"],
  kleen: ["#171513", "#B69B8D", "#DFD1C8", "#F7F3EF"],
  apothec: ["#102016", "#456A2E", "#D5DDBB", "#F7F6EF"],
  bloom: ["#271015", "#CA5266", "#F2C7CF", "#FFF4F4"],
};

export function createBrandKit(product: ImportedProduct, modelId: string): BrandKit {
  const palette = palettes[modelId] ?? ["#10100F", "#167C72", "#FFD33D", "#E8E2DA"];
  const premium = /beauty|lux|serum|parfum|jewel|bijou/i.test(`${product.title} ${product.description}`);
  const headingFont = premium ? "DM Sans" : "Inter";
  return {
    palette,
    headingFont,
    bodyFont: "Inter",
    schemes: [
      { name: "Paper", background: "#FFFFFF", text: palette[0], accent: palette[1] },
      { name: "Soft surface", background: palette[3], text: palette[0], accent: palette[1] },
      { name: "Anchor", background: palette[0], text: "#FFFFFF", accent: palette[2] },
    ],
  };
}
