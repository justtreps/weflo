import type { EditorSection } from "../editor/document";
import { getSectionDefinition } from "../sections";
import { SECTION_CAPABILITIES } from "../sections/capabilities";
import type { SectionCapability } from "../sections/types";

export type ShopifyCapabilityState = "available" | "setup-required" | "unsupported";
export type ShopifyCapabilityAction = { label: string; href?: string };
export type ShopifyCapabilityStatus = { state: ShopifyCapabilityState; reason: string; action?: ShopifyCapabilityAction };
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
  appBlocks?: boolean;
  supported?: Partial<Record<SectionCapability, boolean>>;
};

export type CapabilityReportInput = {
  sections?: Pick<EditorSection, "type" | "settings">[];
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
  "selling-plan": "l’abonnement Shopify",
  preorder: "la précommande",
  "cart-drawer": "le tiroir panier",
  "app-blocks": "les blocs d’application Shopify",
  markets: "Shopify Markets",
  localization: "la localisation Shopify",
};

function requiredCapabilities(input: CapabilityReportInput): SectionCapability[] {
  const declared = input.capabilities ?? input.sections?.flatMap((section) => getSectionDefinition(section.type)?.capabilities ?? []) ?? [];
  return [...new Set(declared)];
}

function status(capability: SectionCapability, metadata: ShopifyCapabilityMetadata): ShopifyCapabilityStatus {
  const override = metadata.supported?.[capability];
  if (override === false) return { state: "unsupported", reason: `Cette boutique ne prend pas en charge ${labels[capability]}.` };
  if (override === true) return { state: "available", reason: `${labels[capability]} est disponible.` };

  if (capability === "custom-bundle") {
    return metadata.wefloExtensionInstalled
      ? { state: "available", reason: "L’extension Weflo Bundle et la Cart Transform sont installées." }
      : { state: "setup-required", reason: "Configure le bundle personnalisable avec l’extension Weflo Bundle et la Cart Transform.", action: { label: "Configurer le bundle personnalisable", href: "/dashboard#shopify" } };
  }
  if (capability === "app-blocks") {
    return metadata.wefloExtensionInstalled || metadata.appBlocks
      ? { state: "available", reason: "Les blocs d’application Weflo sont disponibles." }
      : { state: "setup-required", reason: "Installe l’extension de thème Weflo pour utiliser ce bloc d’application.", action: { label: "Installer l’extension Weflo", href: "/dashboard#shopify" } };
  }
  if (capability === "selling-plan") {
    return metadata.sellingPlans
      ? { state: "available", reason: "Un fournisseur d’abonnement Shopify est configuré." }
      : { state: "setup-required", reason: "Configure un fournisseur d’abonnement compatible avec les selling plans Shopify.", action: { label: "Configurer les abonnements", href: "/dashboard#shopify" } };
  }
  if (capability === "preorder") {
    return metadata.preorderProvider
      ? { state: "available", reason: "Un fournisseur de précommandes compatible est configuré." }
      : { state: "setup-required", reason: "Configure un fournisseur de précommandes compatible avant publication.", action: { label: "Configurer les précommandes", href: "/dashboard#shopify" } };
  }
  if (capability === "cart-drawer") {
    return metadata.cartDrawer
      ? { state: "available", reason: "Le thème expose un tiroir panier compatible." }
      : { state: "setup-required", reason: "Le tiroir panier du thème n’a pas été détecté ; l’ajout utilisera le panier Shopify standard.", action: { label: "Vérifier le thème" } };
  }
  if (capability === "markets" || capability === "localization") {
    const enabled = capability === "markets" ? metadata.markets : metadata.localization;
    return enabled
      ? { state: "available", reason: `${labels[capability]} est disponible.` }
      : { state: "setup-required", reason: `Active ${labels[capability]} dans l’administration Shopify.`, action: { label: "Ouvrir Shopify" } };
  }
  if (nativeCapabilities.has(capability)) {
    return metadata.connected === false || metadata.hasProductData === false
      ? { state: "setup-required", reason: `Connecte une boutique et associe les données produit pour utiliser ${labels[capability]}.`, action: { label: "Connecter Shopify", href: "/dashboard#shopify" } }
      : { state: "available", reason: `${labels[capability]} est rendu avec les objets Shopify au runtime.` };
  }
  return { state: "unsupported", reason: `Capacité Shopify inconnue : ${capability}.` };
}

export function buildCapabilityReport(input: CapabilityReportInput = {}): ShopifyCapabilityReport {
  const required = requiredCapabilities(input);
  // Compilation locale is intentionally permissive; publication supplies real connection facts.
  const metadata: ShopifyCapabilityMetadata = { connected: true, hasProductData: true, ...(input.shopify ?? {}) };
  const capabilities = Object.fromEntries(SECTION_CAPABILITIES.map((capability) => [capability, status(capability, metadata)])) as ShopifyCapabilityReport["capabilities"];
  const blockers = required
    .filter((capability) => capabilities[capability].state !== "available")
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
