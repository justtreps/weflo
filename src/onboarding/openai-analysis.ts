import OpenAI from "openai";
import { validateOnboardingAnalysis, type OnboardingAiPort } from "./analyser";
import type { ImportedProduct } from "./types";

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim().slice(0, 500) : fallback;
}

function imageSourceUrl(fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "produit.jpg";
  return `https://image.weflo.local/${encodeURIComponent(safeName)}`;
}

function productFromImageOutput(value: unknown, imageDataUrl: string, fileName: string): ImportedProduct {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const fallbackTitle = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Produit importé";
  return {
    sourceUrl: imageSourceUrl(fileName),
    title: text(input.title, fallbackTitle).slice(0, 180),
    description: text(input.description, "Produit importé à partir d’une image."),
    vendor: text(input.vendor).slice(0, 120),
    currency: text(input.currency, "EUR").slice(0, 8),
    price: null,
    compareAtPrice: null,
    images: [imageDataUrl],
    variants: [],
    rating: null,
    reviewCount: null,
    reviews: [],
  };
}

export function createOpenAiOnboarding(apiKey: string): OnboardingAiPort {
  const client = new OpenAI({ apiKey });
  return {
    async analyse({ product, language }) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are Weflo's ecommerce strategist. Return strict JSON with exactly eight unique brandNames, four personas and four angles. Each persona has id,title,insight,icon,tags,selected. Each angle has id,title,description,icon,tags,selected. Base every proposal on supplied facts and reviews. Do not add product facts, prices, ratings, certifications or claims. Write proposals in the requested storefront language." },
          { role: "user", content: JSON.stringify({ language, product }) },
        ],
      });
      return validateOnboardingAnalysis(JSON.parse(response.choices[0]?.message?.content ?? "{}"), product);
    },
    async analyseImage({ imageDataUrl, fileName, language }) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are Weflo's ecommerce product analyst. Inspect the supplied product image. Return strict JSON with a product object containing only title, description, vendor and currency, plus exactly eight unique brandNames, four personas and four angles. Each persona has id,title,insight,icon,tags,selected. Each angle has id,title,description,icon,tags,selected. Never invent a price, rating, certification, material or technical claim that cannot be seen. Write all customer-facing proposals in the requested storefront language." },
          { role: "user", content: [
            { type: "text", text: JSON.stringify({ language, fileName }) },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
          ] },
        ],
      });
      const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
      const product = productFromImageOutput(parsed.product, imageDataUrl, fileName);
      return { product, analysis: validateOnboardingAnalysis(parsed, product) };
    },
  };
}
