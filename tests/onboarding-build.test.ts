import { describe, expect, it } from "vitest";
import { buildStoreDocument } from "../src/onboarding/compile-store";
import { fallbackOnboardingAnalysis } from "../src/onboarding/fallback-analysis";
import type { BrandKit, ImportedProduct } from "../src/onboarding/types";
import { validateEditorDocument } from "../src/editor/schema";
import { getSectionDefinition } from "../src/sections/index";
import { TEMPLATE_RECIPES } from "../src/onboarding/template-recipe";
import { renderEditorDocument } from "../src/editor/render/render-document";
import { compileShopifyPage } from "../src/shopify/compiler";
import { isProductLedCreationFormat } from "../src/onboarding/creation-recipe";

const product: ImportedProduct = {
  sourceUrl: "https://lamp.example/products/infinity", title: "Infinity Wireless Wall Lamp", description: "Wireless magnetic light for renters", vendor: "Lights of Sweden", currency: "SEK", price: 508.99, compareAtPrice: 636,
  images: ["https://cdn.example/main.jpg", "https://cdn.example/white.jpg", "https://cdn.example/black.jpg"],
  variants: [{ id: "white", title: "White", price: 508.99, image: "https://cdn.example/white.jpg" }], rating: 4.7, reviewCount: 312,
  reviews: [{ author: "Elin K.", rating: 5, title: "Soft light", text: "Perfect warm light without drilling." }],
};
const strategy = fallbackOnboardingAnalysis(product, "fr");
const brandKit: BrandKit = { palette: ["#0A0A09", "#158F83", "#FFD400", "#E7E1DA"], headingFont: "Inter", bodyFont: "Inter", schemes: [{ name: "Paper", background: "#FFFFFF", text: "#111111", accent: "#158F83" }] };

describe("onboarding store compiler", () => {
  it("builds a factual premium store from registered editable sections", () => {
    const document = buildStoreDocument({ product, language: "fr", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit });
    const sectionTypes = document.pages[0].sections.map((section) => section.type);
    expect(sectionTypes).toEqual(expect.arrayContaining(["navigation", "productHero", "gallery", "productMain", "bundle", "benefits", "reviews", "shipping", "faq", "cta", "footer"]));
    expect(document.assets.map((asset) => asset.url)).toEqual(product.images);
    expect(document.commerce?.sourceProduct.title).toBe(product.title);
    expect(JSON.stringify(document)).toContain("LumiWall");
    expect(validateEditorDocument(document)).toMatchObject({ ok: true });
  });

  it("does not label invented testimonials as verified reviews", () => {
    const document = buildStoreDocument({ product: { ...product, reviews: [], rating: null, reviewCount: null }, language: "en", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit });
    expect(JSON.stringify(document)).not.toMatch(/verified buyer|avis vérifié/i);
  });

  it("does not repeat the supplier description across the whole storefront", () => {
    const document = buildStoreDocument({ product, language: "fr", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit });
    const repeats = document.pages[0].sections.filter((section) => section.settings.text === product.description);
    expect(repeats.length).toBeLessThanOrEqual(2);
  });

  it.each([
    ["advertorial", "advertorial-journal", ["richText", "press"]],
    ["quiz", "quiz-diagnostic", ["quiz", "form"]],
    ["home", "home-brand-editorial", ["collectionGrid", "newsletter"]],
  ] as const)("builds a valid %s page with its own section recipe", (creationFormat, templateId, expected) => {
    const document = buildStoreDocument({ language: "fr", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit, creationFormat, templateId, answers: {} });
    expect(document.pages[0].sections.map((section) => section.type)).toEqual(expect.arrayContaining([...expected]));
    expect(validateEditorDocument(document)).toMatchObject({ ok: true });
  });

  const answersByFormat = {
    store: { activity: "Éclairage", positioning: "Lampes sans perçage", collections: "Murales\nNomades", products: "12", identity: "Sobre", objective: "Présenter la gamme" },
    product: { benefits: "Sans perçage", objections: "Autonomie", offer: "L’offre affichée sur la fiche source", variants: "Blanc\nNoir", proof: "Avis de la fiche source" },
    landing: { campaign: "Rentrée", audience: "Locataires", promise: "Éclairer sans percer", traffic: "Email", cta: "Découvrir la solution" },
    advertorial: { angle: "Pourquoi les locataires évitent de percer", author: "L’équipe LumiWall", proof: "Démonstration produit", product: "Infinity Wireless Wall Lamp" },
    quiz: { objective: "Choisir une lumière", segments: "Lecture\nAmbiance", result: "Une recommandation selon l’usage", steps: "4", destination: "Page de résultat" },
    home: { brand: "LumiWall", activity: "Éclairage", promise: "Éclairer sans percer", collections: "Murales\nNomades", story: "Créée pour les intérieurs qui évoluent" },
    blog: { topic: "Éclairer un appartement loué", intent: "Comment ajouter de la lumière sans percer ?", angle: "Conseils pratiques", relatedProducts: "Lampes murales" },
    blank: {},
  } as const;

  it.each(TEMPLATE_RECIPES)("compiles $id through registered sections into a valid document", (recipe) => {
    const common = {
      language: "fr",
      brandName: "LumiWall",
      modelId: "proteo",
      personas: strategy.personas,
      angles: strategy.angles,
      brandKit,
      templateId: recipe.id,
      answers: answersByFormat[recipe.format],
    };
    const document = isProductLedCreationFormat(recipe.format)
      ? buildStoreDocument({ ...common, creationFormat: recipe.format, product })
      : buildStoreDocument({ ...common, creationFormat: recipe.format });

    expect(document.templateId).toBe(recipe.id);
    expect(document.templateVersion).toBe(1);
    expect(document.pages[0].sections.map((section) => section.type)).toEqual(recipe.sections);
    expect(document.pages[0].sections.every((section) => getSectionDefinition(section.type))).toBe(true);
    expect(validateEditorDocument(document)).toMatchObject({ ok: true });
  });

  it("compiles non-product formats only from submitted answers", () => {
    const document = buildStoreDocument({
      language: "fr",
      brandName: "Aube",
      modelId: "proteo",
      personas: [],
      angles: [],
      brandKit,
      creationFormat: "home",
      templateId: "home-brand-editorial",
      answers: { brand: "Aube", activity: "Objets durables", promise: "Une maison plus calme", collections: "Lumière\nTextile", story: "Créée à Lyon" },
    });

    expect(document.assets).toEqual([]);
    expect(document.commerce).toBeUndefined();
    expect(JSON.stringify(document)).not.toMatch(/508|636|cdn\.example|verified buyer|avis vérifié/i);
    expect(document.pages[0].sections.find((section) => section.type === "testimonials")?.blocks).toEqual([]);
    expect(JSON.stringify(document)).toContain("Créée à Lyon");
  });

  it("does not manufacture bundle discounts when the source contains only unit prices", () => {
    const document = buildStoreDocument({
      product: { ...product, reviews: [] },
      language: "fr",
      brandName: "LumiWall",
      modelId: "proteo",
      personas: strategy.personas,
      angles: strategy.angles,
      brandKit,
      creationFormat: "product",
      templateId: "product-bundle-first",
      answers: answersByFormat.product,
    });
    const bundle = document.pages[0].sections.find((section) => section.type === "bundle");
    expect(bundle?.blocks).toEqual([]);
    expect(JSON.stringify(bundle)).not.toMatch(/916\.18|1297\.92|duo|pack maison/i);
  });

  it("does not render unverified reviews, discounts, or fulfilment promises", () => {
    const document = buildStoreDocument({
      product: { ...product, reviews: [], rating: null, reviewCount: null },
      language: "fr", brandName: "LumiWall", modelId: "proteo", personas: strategy.personas, angles: strategy.angles, brandKit,
      creationFormat: "product", templateId: "product-buybox-premium", answers: answersByFormat.product,
    });
    const web = renderEditorDocument(document, { mode: "preview", breakpoint: "desktop" });
    const liquid = compileShopifyPage(document, { resource: "product" }).map((file) => file.value).join("\n");
    expect(`${web}\n${liquid}`).not.toMatch(/★★★★★|avis importés|bundle & économies|meilleur choix|paiement sécurisé|commande suivie/i);
  });

  it("maps submitted product variants without inventing source variants", () => {
    const document = buildStoreDocument({
      product: { ...product, variants: [] }, language: "fr", brandName: "LumiWall", modelId: "proteo", personas: [], angles: [], brandKit,
      creationFormat: "product", templateId: "product-buybox-premium", answers: answersByFormat.product,
    });
    const productMain = document.pages[0].sections.find((section) => section.type === "productMain");
    expect(productMain?.blocks.map((block) => block.settings.title)).toEqual(["Blanc", "Noir"]);
    expect(productMain?.blocks.every((block) => block.settings.variant_id === "")).toBe(true);
  });

  it("keeps submitted format metadata in the sections that present it", () => {
    const landing = buildStoreDocument({ language: "fr", brandName: "Rentrée", modelId: "template", personas: [], angles: [], brandKit, creationFormat: "landing", templateId: "landing-direct-response", answers: answersByFormat.landing });
    const advertorial = buildStoreDocument({ language: "fr", brandName: "Journal", modelId: "template", personas: [], angles: [], brandKit, creationFormat: "advertorial", templateId: "advertorial-journal", answers: answersByFormat.advertorial });
    const quiz = buildStoreDocument({ language: "fr", brandName: "Diagnostic", modelId: "template", personas: [], angles: [], brandKit, creationFormat: "quiz", templateId: "quiz-diagnostic", answers: answersByFormat.quiz });
    const store = buildStoreDocument({ product, language: "fr", brandName: "LumiWall", modelId: "template", personas: [], angles: [], brandKit, creationFormat: "store", templateId: "store-editorial-commerce", answers: answersByFormat.store });

    expect(landing.pages[0].sections.find((section) => section.type === "hero")?.settings.subtitle).toContain("Email");
    expect(advertorial.pages[0].sections.find((section) => section.type === "cta")?.settings.title).toBe("Infinity Wireless Wall Lamp");
    expect(quiz.pages[0].sections.find((section) => section.type === "quiz")?.settings.subtitle).toBe("4");
    expect(store.pages[0].sections.find((section) => section.type === "collectionGrid")?.settings.subtitle).toBe("12");
  });

  it("keeps blank as an empty structured editor document", () => {
    const document = buildStoreDocument({
      language: "fr", brandName: "Page vierge", modelId: "blank", personas: [], angles: [], brandKit,
      creationFormat: "blank", templateId: null, answers: {},
    });
    expect(document.pages[0].sections).toEqual([]);
    expect(validateEditorDocument(document)).toMatchObject({ ok: true });
  });
});
