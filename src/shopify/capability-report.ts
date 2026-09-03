import type { EditorSection } from "../editor/document";
import { getSectionDefinition } from "../sections";
import { SECTION_CAPABILITIES } from "../sections/capabilities";
import { hasConfiguredOfferDiscount, isMixedProductOffer } from "../sections/quantity-offer-domain";
import type { SectionCapability } from "../sections/types";

export type ShopifyCapabilityState = "native" | "app-required" | "unavailable";
export type ShopifyCapabilityAction = { label: string; href?: string };
export type ShopifyCapabilityStatus = { state: ShopifyCapabilityState; available: boolean; reason: string; action?: ShopifyCapabilityAction };
export type ShopifyCapabilityReport = {
  capabilities: Record<SectionCapability, ShopifyCapabilityStatus>;
  required: SectionCapability[];
  blockers: string[];
};

/** Facts received from the Shopify connection or app-installation webhook. */
export type ShopifyCapabilityMetadata = {
  connected?: boolean;
  hasProductData?: boolean;
  cartDrawer?: boolean;
  markets?: boolean;
  localization?: boolean;
  sellingPlans?: boolean;
  preorderProvider?: boolean;
  wefloExtensionInstalled?: boolean;
  cartTransformInstalled?: boolean;
  discountRuleIds?: string[];
  appBlocks?: boolean;
  supported?: Partial<Record<SectionCapability, boolean>>;
};

export type CapabilityReportInput = {
  sections?: Pick<EditorSection, "type" | "settings" | "blocks">[];
  capabilities?: SectionCapability[];
  shopify?: ShopifyCapabilityMetadata;
};

const nativeCapabilities = new Set<SectionCapability>([
  "product-form", "variant-selection", "quantity-breaks", "collection-binding",
  "recommendations", "fixed-bundle",
]);

const labels: Record<SectionCapability, string> = {
  "product-form": "le formulaire produit Shopify",
  "variant-selection": "les variantes Shopify",
  "quantity-breaks": "les offres de quantité",
  "collection-binding": "la collection Shopify",
  recommendations: "les recommandations Shopify",
  "fixed-bundle": "le bundle fixe Shopify",
  "custom-bundle": "le bundle personnalisable",
  "discount-rules": "les règles de remise Shopify",
  "selling-plan": "l’abonnement Shopify",
  preorder: "la précommande",
  "cart-drawer": "le tiroir panier",
  "app-blocks": "les blocs d’application Shopify",
  markets: "Shopify Markets",
  localization: "la localisation Shopify",
};

function requiredCapabilities(input: CapabilityReportInput): SectionCapability[] {
  const sections = input.sections ?? [];
  const declared = [
    ...(input.capabilities ?? []),
    ...sections.flatMap((section) => getSectionDefinition(section.type)?.capabilities ?? []),
  ];
  for (const section of sections) {
    if (section.type !== "quantity-offer") continue;
    if (isMixedProductOffer(section)) declared.push("custom-bundle");
    if (hasConfiguredOfferDiscount(section)) declared.push("discount-rules");
  }
  return [...new Set(declared)];
}

function status(capability: SectionCapability, metadata: ShopifyCapabilityMetadata): ShopifyCapabilityStatus {
  const override = metadata.supported?.[capability];
  if (override === false) return { state: "unavailable", available: false, reason: `Cette boutique ne prend pas en charge ${labels[capability]}.` };

  if (capability === "custom-bundle") {
    const available = metadata.wefloExtensionInstalled === true && metadata.cartTransformInstalled === true;
    return available
      ? { state: "app-required", available, reason: "L’extension Weflo Bundle et sa Cart Transform sont attestées." }
      : { state: "app-required", available, reason: "Configure et atteste l’extension Weflo Bundle ainsi que sa Cart Transform avant publication.", action: { label: "Configurer le bundle personnalisable", href: "/dashboard#shopify" } };
  }
  if (capability === "discount-rules") {
    const available = Array.isArray(metadata.discountRuleIds) && metadata.discountRuleIds.some((id) => typeof id === "string" && id.trim().length > 0);
    return available
      ? { state: "app-required", available, reason: "Une règle de remise Shopify est attestée pour cette offre." }
      : { state: "app-required", available, reason: "Crée et atteste une règle de remise Shopify réelle avant d’afficher ces économies.", action: { label: "Configurer la remise", href: "/dashboard#shopify" } };
  }
  if (capability === "app-blocks") {
    const available = metadata.appBlocks === true;
    return available
      ? { state: "app-required", available, reason: "Les blocs d’application Weflo sont attestés." }
      : { state: "app-required", available, reason: "Installe et atteste l’extension de thème Weflo pour utiliser ce bloc d’application.", action: { label: "Installer l’extension Weflo", href: "/dashboard#shopify" } };
  }
  if (capability === "selling-plan") {
    const available = metadata.sellingPlans === true;
    return available
      ? { state: "app-required", available, reason: "Un fournisseur d’abonnement Shopify est attesté." }
      : { state: "app-required", available, reason: "Configure un fournisseur d’abonnement compatible avec les selling plans Shopify.", action: { label: "Configurer les abonnements", href: "/dashboard#shopify" } };
  }
  if (capability === "preorder") {
    const available = metadata.preorderProvider === true;
    return available
      ? { state: "app-required", available, reason: "Un fournisseur de précommandes compatible est attesté." }
      : { state: "app-required", available, reason: "Configure un fournisseur de précommandes compatible avant publication.", action: { label: "Configurer les précommandes", href: "/dashboard#shopify" } };
  }
  if (capability === "cart-drawer") {
    const available = metadata.cartDrawer === true;
    return available
      ? { state: "native", available, reason: "Le thème expose un tiroir panier compatible." }
      : { state: "unavailable", available, reason: "Le tiroir panier du thème n’a pas été détecté ; l’ajout utilisera le panier Shopify standard.", action: { label: "Vérifier le thème" } };
  }
  if (capability === "markets" || capability === "localization") {
    const available = (capability === "markets" ? metadata.markets : metadata.localization) === true;
    return available
      ? { state: "native", available, reason: `${labels[capability]} est disponible.` }
      : { state: "unavailable", available, reason: `Active ${labels[capability]} dans l’administration Shopify.`, action: { label: "Ouvrir Shopify" } };
  }
  if (nativeCapabilities.has(capability)) {
    const available = metadata.connected === true && metadata.hasProductData === true;
    return available
      ? { state: "native", available, reason: `${labels[capability]} est rendu avec les objets Shopify au runtime.` }
      : { state: "unavailable", available, reason: `Connecte une boutique et associe les données produit pour utiliser ${labels[capability]}.`, action: { label: "Connecter Shopify", href: "/dashboard#shopify" } };
  }
  return { state: "unavailable", available: false, reason: `Capacité Shopify inconnue : ${capability}.` };
}

export function buildCapabilityReport(input: CapabilityReportInput = {}): ShopifyCapabilityReport {
  const required = requiredCapabilities(input);
  const metadata: ShopifyCapabilityMetadata = input.shopify ?? {};
  const capabilities = Object.fromEntries(SECTION_CAPABILITIES.map((capability) => [capability, status(capability, metadata)])) as ShopifyCapabilityReport["capabilities"];
  const blockers = required
    .filter((capability) => !capabilities[capability].available)
    .map((capability) => capabilities[capability].reason);
  return { capabilities, required, blockers };
}

export function assertPublishCapabilities(report: ShopifyCapabilityReport): void {
  if (report.blockers.length) throw new Error(report.blockers.join(" "));
}

export function resolvePurchaseStrategy(input: { customBundle?: boolean; sellingPlan?: boolean; preorder?: boolean; fixedBundle?: boolean; multipack?: boolean }): { ok: true; strategy: "custom-bundle" | "selling-plan" | "preorder" | "fixed-bundle" | "multipack" | "one-time" } | { ok: false; reason: string } {
  if (input.customBundle && input.sellingPlan) return { ok: false, reason: "Un bundle personnalisable ne peut pas être combiné à un abonnement Shopify." };
  if (input.customBundle && input.preorder) return { ok: false, reason: "Un bundle personnalisable ne peut pas être combiné à une précommande." };
  if (input.sellingPlan && input.preorder) return { ok: false, reason: "Choisis soit un abonnement, soit une précommande pour cette offre." };
  if (input.customBundle) return { ok: true, strategy: "custom-bundle" };
  if (input.sellingPlan) return { ok: true, strategy: "selling-plan" };
  if (input.preorder) return { ok: true, strategy: "preorder" };
  if (input.fixedBundle) return { ok: true, strategy: "fixed-bundle" };
  if (input.multipack) return { ok: true, strategy: "multipack" };
  return { ok: true, strategy: "one-time" };
}
