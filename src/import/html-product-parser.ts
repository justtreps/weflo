import type { ImportedProduct } from "../onboarding/types";

type Json = Record<string, unknown>;

function record(value: unknown): value is Json { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function list<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : ""; }
function number(value: unknown): number | null { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function resolveUrl(value: unknown, base: string): string | null { const raw = text(value); if (!raw) return null; try { const url = new URL(raw, base); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; } }

function productNode(value: unknown): Json | null {
  if (Array.isArray(value)) for (const item of value) { const found = productNode(item); if (found) return found; }
  if (!record(value)) return null;
  const types = list(value["@type"] as string | string[] | undefined).map(String);
  if (types.some((type) => type.toLowerCase() === "product")) return value;
  return productNode(value["@graph"]);
}

function meta(html: string, key: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key.toLowerCase()) continue;
    return tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  }
  return "";
}

function jsonLdProduct(html: string): Json | null {
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const found = productNode(JSON.parse(match[1].trim())); if (found) return found; } catch { /* ignore malformed blocks */ }
  }
  return null;
}

export function extractProductFromHtml(html: string, sourceUrl: string): ImportedProduct {
  const node = jsonLdProduct(html);
  const offers = record(node?.offers) ? node.offers : Array.isArray(node?.offers) && record(node.offers[0]) ? node.offers[0] : {};
  const brand = record(node?.brand) ? node.brand.name : node?.brand;
  const aggregate = record(node?.aggregateRating) ? node.aggregateRating : {};
  const imageValues = node ? list(node.image as unknown) : [];
  const variants = node ? list(node.hasVariant as unknown).filter(record).map((variant, index) => {
    const variantOffer = record(variant.offers) ? variant.offers : {};
    const image = resolveUrl(variant.image, sourceUrl) ?? undefined;
    return { id: text(variant.sku) || `variant-${index + 1}`, title: text(variant.name) || `Variant ${index + 1}`, price: number(variantOffer.price), ...(image ? { image } : {}) };
  }) : [];
  const imageCandidates = [...imageValues, ...variants.map((variant) => variant.image), meta(html, "og:image")];
  const images = [...new Set(imageCandidates.map((value) => resolveUrl(value, sourceUrl)).filter((value): value is string => Boolean(value)))];
  const reviews = node ? list(node.review as unknown).filter(record).map((review) => {
    const author = record(review.author) ? review.author.name : review.author;
    const rating = record(review.reviewRating) ? review.reviewRating.ratingValue : null;
    return { author: text(author) || "Customer", rating: number(rating), title: text(review.name), text: text(review.reviewBody) };
  }).filter((review) => review.text) : [];
  const title = text(node?.name) || meta(html, "og:title") || meta(html, "twitter:title");
  const description = text(node?.description) || meta(html, "og:description") || meta(html, "description");
  const price = number(offers.price ?? meta(html, "product:price:amount"));
  const currency = text(offers.priceCurrency) || meta(html, "product:price:currency");
  if (!title || (!images.length && price === null && !description)) throw new Error("No usable product data was found.");
  return {
    sourceUrl,
    title,
    description,
    vendor: text(brand),
    currency,
    price,
    compareAtPrice: number(node?.compareAtPrice),
    images,
    variants,
    rating: number(aggregate.ratingValue),
    reviewCount: number(aggregate.reviewCount ?? aggregate.ratingCount),
    reviews,
  };
}
