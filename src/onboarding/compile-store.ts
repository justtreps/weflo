import type { EditorBlock, EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import type { BrandKit, BuyerPersona, ImportedProduct, MarketingAngle } from "./types";
import { buildProductTruthSheet } from "./product-truth";
import { selectArtDirection } from "./art-direction";
import { buildStoreRecipe } from "./store-recipe";

export type BuildStoreInput = {
  product: ImportedProduct;
  language: string;
  brandName: string;
  modelId: string;
  personas: BuyerPersona[];
  angles: MarketingAngle[];
  brandKit: BrandKit;
};

const copy = {
  fr: {
    announcement: "Livraison suivie · Paiement sécurisé · Retours simplifiés",
    shop: "Découvrir", story: "Notre histoire", cart: "Panier",
    heroEyebrow: "Pensé pour votre quotidien", buy: "Ajouter au panier",
    gallery: "Découvrez-le sous tous les angles", product: "Choisissez votre option",
    bundle: "Plus vous équipez, plus vous économisez", benefits: "Pourquoi vous allez l’adopter",
    detail: "Conçu autour de ce qui compte vraiment", reviews: "Ce qu’en disent les clients",
    reviewsIntro: "Retours importés depuis la page produit source.", inspiration: "Pourquoi ce produit séduit",
    shipping: "Votre commande, en toute sérénité", guarantee: "Achetez en confiance",
    faq: "Questions fréquentes", cta: "Prêt à passer à l’action ?", footer: "Une expérience claire, du choix à la livraison.",
    single: "À l’unité", duo: "Duo — le plus populaire", family: "Pack maison",
    shippingItems: [["Commande suivie", "Recevez les informations de suivi dès l’expédition."], ["Paiement sécurisé", "Vos informations de paiement restent protégées."], ["Assistance disponible", "Une question ? Notre équipe vous accompagne."]],
    faqItems: [["Que contient ma commande ?", "Le contenu exact dépend de l’option sélectionnée au moment de l’achat."], ["Puis-je choisir une variante ?", "Oui, les options disponibles apparaissent directement dans la fiche produit."], ["Comment suivre mon colis ?", "Un lien de suivi est envoyé dès que la commande quitte l’entrepôt."]],
  },
  en: {
    announcement: "Tracked shipping · Secure checkout · Easy returns",
    shop: "Shop", story: "Our story", cart: "Cart",
    heroEyebrow: "Designed for real life", buy: "Add to cart",
    gallery: "See it from every angle", product: "Choose your option",
    bundle: "Save more when you bundle", benefits: "Why you’ll love it",
    detail: "Designed around what matters", reviews: "What customers say",
    reviewsIntro: "Feedback imported from the source product page.", inspiration: "Why this product stands out",
    shipping: "Your order, handled with care", guarantee: "Shop with confidence",
    faq: "Frequently asked questions", cta: "Ready to make it yours?", footer: "A clear experience, from choice to delivery.",
    single: "Single", duo: "Duo — most popular", family: "Home set",
    shippingItems: [["Tracked order", "Get tracking details as soon as your order ships."], ["Secure checkout", "Your payment information stays protected."], ["Helpful support", "Questions? Our team is here to help."]],
    faqItems: [["What is included?", "The exact contents depend on the option selected at checkout."], ["Can I choose a variant?", "Yes. Available options appear directly in the product section."], ["How can I track my order?", "A tracking link is sent as soon as the order leaves the warehouse."]],
  },
} as const;

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "store";
}

function money(value: number | null, currency: string): string {
  if (value === null) return "";
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

function item(id: string, title: string, text: string, extra: Record<string, SettingValue> = {}): EditorBlock {
  return { id, type: "item", settings: { title, text, ...extra } };
}

function makeSection(type: string, index: number, settings: Record<string, SettingValue>, blocks: EditorBlock[] = []): EditorSection {
  const definition = getSectionDefinition(type);
  if (!definition) throw new Error(`Unknown section type: ${type}`);
  return {
    id: `${type}-${index + 1}`,
    type,
    name: definition.name,
    hidden: false,
    locked: false,
    settings: { ...definition.defaults, ...settings },
    style: {},
    responsive: {},
    blocks,
  };
}

export function buildStoreDocument(input: BuildStoreInput): EditorDocument {
  const { product, brandKit } = input;
  const strings = input.language.toLowerCase().startsWith("fr") ? copy.fr : copy.en;
  const selectedPersonas = input.personas.filter((persona) => persona.selected);
  const selectedAngles = input.angles.filter((angle) => angle.selected);
  const heroImage = product.images[0] ?? "";
  const price = money(product.price, product.currency);
  const compareAt = money(product.compareAtPrice, product.currency);
  const productTruth = buildProductTruthSheet(product);
  const artDirection = selectArtDirection(productTruth);
  const recipe = buildStoreRecipe({ product, truth: productTruth, artDirection, personas: input.personas, angles: input.angles });
  const sectionInputs: Array<[string, Record<string, SettingValue>, EditorBlock[]?]> = [
    ["announcement", { text: strings.announcement, cta_label: "" }],
    ["navigation", { title: input.brandName, cta_label: strings.cart, cta_link: "#product" }, [
      item("navigation-shop", strings.shop, "", { label: strings.shop, link: "#product" }),
      item("navigation-story", strings.story, "", { label: strings.story, link: "#story" }),
    ]],
    ["productHero", { title: product.title, subtitle: product.vendor || strings.heroEyebrow, text: product.description, price, compare_at_price: compareAt, image: heroImage, image_alt: product.title, cta_label: strings.buy, cta_link: "#product" }],
    ["gallery", { title: strings.gallery, text: "" }, product.images.map((url, index) => item(`gallery-image-${index + 1}`, `${product.title} — ${index + 1}`, "", { image: url, image_alt: `${product.title} ${index + 1}` }))],
    ["productMain", { title: strings.product, text: selectedAngles[0]?.description ?? strings.heroEyebrow, price, compare_at_price: compareAt, image: heroImage, cta_label: strings.buy, product_handle: slugify(product.title) }, product.variants.map((variant, index) => ({ id: `variant-${index + 1}`, type: "variant", settings: { title: variant.title, variant_id: variant.id, price: money(variant.price, product.currency), image: variant.image ?? "" } }))],
    ["bundle", { title: strings.bundle, text: product.title, price, cta_label: strings.buy, cta_link: "#product" }, [
      item("bundle-single", strings.single, "", { price }),
      item("bundle-duo", strings.duo, "", { price: product.price === null ? "" : money(product.price * 1.8, product.currency) }),
      item("bundle-family", strings.family, "", { price: product.price === null ? "" : money(product.price * 2.55, product.currency) }),
    ]],
    ["benefits", { title: strings.benefits, text: selectedAngles.map((angle) => angle.title).slice(0, 3).join(" · ") || strings.detail }, selectedAngles.slice(0, 4).map((angle, index) => item(`benefit-${index + 1}`, `${angle.icon} ${angle.title}`.trim(), angle.description, { tags: angle.tags }))],
    ["imageText", { title: strings.detail, subtitle: selectedPersonas[0]?.title ?? "", text: selectedPersonas[0]?.insight ?? product.description, image: product.images[1] ?? heroImage, image_alt: product.title, cta_label: strings.shop, cta_link: "#product" }],
  ];

  if (product.reviews.length) {
    sectionInputs.push(["reviews", { title: strings.reviews, subtitle: product.rating ? `${product.rating}/5` : "", text: strings.reviewsIntro }, product.reviews.slice(0, 8).map((review, index) => item(`review-${index + 1}`, review.title || review.author, review.text, { author: review.author, rating: review.rating, image: review.image ?? "" }))]);
  } else {
    sectionInputs.push(["testimonials", { title: strings.inspiration, subtitle: "", text: "" }, selectedPersonas.slice(0, 3).map((persona, index) => item(`persona-proof-${index + 1}`, persona.title, persona.insight, { tags: persona.tags }))]);
  }

  sectionInputs.push(
    ["shipping", { title: strings.shipping, text: "" }, strings.shippingItems.map(([title, text], index) => item(`shipping-${index + 1}`, title, text))],
    ["guarantees", { title: strings.guarantee, text: "" }, selectedAngles.slice(0, 3).map((angle, index) => item(`guarantee-${index + 1}`, angle.title, angle.description))],
    ["faq", { title: strings.faq, text: "" }, strings.faqItems.map(([title, text], index) => item(`faq-${index + 1}`, title, text))],
    ["cta", { title: strings.cta, text: selectedPersonas[0]?.insight ?? strings.footer, cta_label: strings.buy, cta_link: "#product" }],
    ["footer", { title: input.brandName, text: strings.footer, cta_label: "" }, [item("footer-shop", strings.shop, "", { label: strings.shop, link: "#product" })]],
  );

  const recipeSections = recipe.sections.map((recipeItem) => {
    const source = sectionInputs.find(([type]) => type === recipeItem.type);
    if (!source) throw new Error(`Recipe uses unavailable section: ${recipeItem.type}`);
    return [source[0], { ...source[1], variant: recipeItem.variant, purpose: recipeItem.purpose }, source[2]] as [string, Record<string, SettingValue>, EditorBlock[]?];
  });
  const firstScheme = brandKit.schemes[0];
  const secondScheme = brandKit.schemes[1];
  return {
    version: 2,
    name: input.brandName,
    path: "/",
    kind: "product",
    modelId: input.modelId,
    theme: {
      background: artDirection.palette[0] ?? firstScheme?.background ?? "#ffffff",
      surface: artDirection.palette[3] ?? secondScheme?.background ?? brandKit.palette[3] ?? "#f4f1ec",
      ink: artDirection.palette[1] ?? firstScheme?.text ?? "#111111",
      muted: "#6d6963",
      accent: artDirection.palette[2] ?? firstScheme?.accent ?? brandKit.palette[1] ?? "#111111",
      display: "sans",
      radius: "soft",
    },
    pages: [{ id: `page-${slugify(input.brandName)}`, name: input.brandName, slug: slugify(input.brandName), sections: recipeSections.map(([type, settings, blocks], index) => makeSection(type, index, settings, blocks)) }],
    assets: product.images.map((url, index) => ({ id: `source-image-${index + 1}`, type: "image", url, alt: `${product.title} ${index + 1}` })),
    commerce: { sourceProduct: product, personas: input.personas, angles: input.angles, brandKit, storefrontLanguage: input.language, productTruth, artDirection, recipeId: recipe.id },
  };
}
