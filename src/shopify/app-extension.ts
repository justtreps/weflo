export const WEFLO_PURCHASE_OPTIONS_EXTENSION = "weflo-purchase-options";
export const WEFLO_CART_TRANSFORM_EXTENSION = "weflo-cart-transform";

export type WefloExtensionInstallationMetadata = {
  appHandles?: string[];
  themeAppExtensionHandles?: string[];
  cartTransformFunctionHandles?: string[];
};

export type WefloExtensionInstallation = {
  themeAppExtensionInstalled: boolean;
  cartTransformInstalled: boolean;
  installed: boolean;
};

/** Installation is confirmed by Shopify app metadata, never by an editor section. */
export function detectWefloExtensionInstallation(metadata: WefloExtensionInstallationMetadata = {}): WefloExtensionInstallation {
  const handles = new Set([...(metadata.appHandles ?? []), ...(metadata.themeAppExtensionHandles ?? [])]);
  const transforms = new Set(metadata.cartTransformFunctionHandles ?? []);
  const themeAppExtensionInstalled = handles.has(WEFLO_PURCHASE_OPTIONS_EXTENSION);
  const cartTransformInstalled = transforms.has(WEFLO_CART_TRANSFORM_EXTENSION);
  return { themeAppExtensionInstalled, cartTransformInstalled, installed: themeAppExtensionInstalled && cartTransformInstalled };
}

export type WefloBundleComponent = { merchandiseId: string; quantity: number };
export type WefloBundleConfiguration = {
  /** Opaque configuration id signed/resolved by the Weflo app, not client-generated pricing. */
  configurationId: string;
  components: WefloBundleComponent[];
};

export function isWefloBundleConfiguration(value: unknown): value is WefloBundleConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.configurationId === "string" && /^wfbc_[A-Za-z0-9_-]{12,}$/.test(candidate.configurationId)
    && Array.isArray(candidate.components)
    && candidate.components.length > 0
    && candidate.components.length <= 20
    && candidate.components.every((component) => component && typeof component === "object"
      && typeof (component as Record<string, unknown>).merchandiseId === "string"
      && /^gid:\/\/shopify\/ProductVariant\//.test((component as Record<string, unknown>).merchandiseId as string)
      && Number.isInteger((component as Record<string, unknown>).quantity)
      && Number((component as Record<string, unknown>).quantity) > 0);
}
