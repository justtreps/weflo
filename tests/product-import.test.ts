import { describe, expect, it } from "vitest";
import { extractProductFromHtml } from "../src/import/html-product-parser";
import { assertPublicProductUrl } from "../src/import/url-policy";

const html = `<!doctype html><html><head>
<script type="application/ld+json">{
  "@context":"https://schema.org","@type":"Product","name":"Infinity Wireless Wall Lamp",
  "description":"Wireless magnetic light","brand":{"name":"Lights of Sweden"},
  "image":["https://cdn.example/lamp-main.jpg","https://cdn.example/lamp-white.jpg","https://cdn.example/lamp-black.jpg"],
  "aggregateRating":{"ratingValue":"4.7","reviewCount":"312"},
  "offers":{"price":"508.99","priceCurrency":"SEK"},
  "hasVariant":[
    {"sku":"white","name":"White","image":"https://cdn.example/lamp-white.jpg","offers":{"price":"508.99"}},
    {"sku":"black","name":"Black","image":"https://cdn.example/lamp-black.jpg","offers":{"price":"508.99"}}
  ]
}</script></head></html>`;

describe("product import", () => {
  it("extracts all JSON-LD product images, facts and variants", () => {
    const product = extractProductFromHtml(html, "https://lamp.example/products/infinity");
    expect(product).toMatchObject({ title: "Infinity Wireless Wall Lamp", vendor: "Lights of Sweden", currency: "SEK", price: 508.99, rating: 4.7, reviewCount: 312 });
    expect(product.images).toEqual([
      "https://cdn.example/lamp-main.jpg",
      "https://cdn.example/lamp-white.jpg",
      "https://cdn.example/lamp-black.jpg",
    ]);
    expect(product.variants).toHaveLength(2);
  });

  it("uses Open Graph as a factual fallback", () => {
    const product = extractProductFromHtml(`<meta property="og:title" content="Travel case"><meta property="og:image" content="/case.jpg"><meta property="product:price:amount" content="39.90"><meta property="product:price:currency" content="EUR">`, "https://shop.example/p/case");
    expect(product).toMatchObject({ title: "Travel case", price: 39.9, currency: "EUR", images: ["https://shop.example/case.jpg"] });
  });

  it.each(["http://127.0.0.1/a", "https://localhost/a", "file:///etc/passwd", "https://user:pass@example.com/p"])("rejects unsafe source %s", async (url) => {
    await expect(assertPublicProductUrl(url, async () => ["127.0.0.1"])).rejects.toThrow("public HTTPS product page");
  });

  it("accepts a public https product host", async () => {
    await expect(assertPublicProductUrl("https://shop.example/products/1", async () => ["93.184.216.34"])).resolves.toMatchObject({ hostname: "shop.example" });
  });
});
