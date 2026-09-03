import type { EditorBlock, EditorSection, SettingValue } from "../editor/document";

export const OFFER_QUANTITY_MIN = 1;
export const OFFER_QUANTITY_MAX = 99;
export const OFFER_DISCOUNT_TYPES = ["none", "percentage", "fixed"] as const;
export type OfferDiscountType = typeof OFFER_DISCOUNT_TYPES[number];

export function normalizeOfferQuantity(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return OFFER_QUANTITY_MIN;
  return Math.min(OFFER_QUANTITY_MAX, Math.max(OFFER_QUANTITY_MIN, Math.round(number)));
}

export function normalizeOfferDiscountType(value: unknown): OfferDiscountType {
  if (value === "amount") return "fixed";
  return OFFER_DISCOUNT_TYPES.includes(value as OfferDiscountType) ? value as OfferDiscountType : "none";
}

export function normalizeOfferDiscountValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function inheritedValue(settings: Record<string, SettingValue>, inherited: Record<string, SettingValue>, key: string): SettingValue | undefined {
  return settings[key] ?? inherited[key];
}

function stringValue(value: SettingValue | undefined): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function normalizeOfferTierSettings(
  settings: Record<string, SettingValue>,
  inherited: Record<string, SettingValue> = {},
): Record<string, SettingValue> {
  const text = stringValue(inheritedValue(settings, inherited, "text"));
  const subtitle = stringValue(settings.subtitle) || text;
  const normalized: Record<string, SettingValue> = {
    ...inherited,
    ...settings,
    title: stringValue(inheritedValue(settings, inherited, "title")),
    subtitle,
    badge: stringValue(inheritedValue(settings, inherited, "badge")),
    quantity: normalizeOfferQuantity(inheritedValue(settings, inherited, "quantity") ?? 1),
    discount_type: normalizeOfferDiscountType(inheritedValue(settings, inherited, "discount_type")),
    discount_value: normalizeOfferDiscountValue(inheritedValue(settings, inherited, "discount_value")),
    product_handle: stringValue(inheritedValue(settings, inherited, "product_handle")),
    variant_id: stringValue(inheritedValue(settings, inherited, "variant_id")),
    preselected: inheritedValue(settings, inherited, "preselected") === true,
    show_variant_picker: inheritedValue(settings, inherited, "show_variant_picker") === true,
  };
  if (text) normalized.text = text;
  return normalized;
}

export function normalizeOfferSetting(key: string, value: SettingValue): SettingValue {
  if (key === "quantity") return normalizeOfferQuantity(value);
  if (key === "discount_type") return normalizeOfferDiscountType(value);
  if (key === "discount_value") return normalizeOfferDiscountValue(value);
  return value;
}

export function offerTierBlocks(section: Pick<EditorSection, "blocks">): EditorBlock[] {
  return section.blocks.filter((block) => block.type === "offer-tier" || block.type === "offer");
}

export function effectiveOfferProductHandles(section: Pick<EditorSection, "settings" | "blocks">): string[] {
  const sectionHandle = stringValue(section.settings.product_handle).trim().toLowerCase();
  return [...new Set(offerTierBlocks(section).map((tier) => {
    const handle = stringValue(tier.settings.product_handle).trim() || sectionHandle;
    return handle.toLowerCase();
  }).filter(Boolean))];
}

export function isMixedProductOffer(section: Pick<EditorSection, "settings" | "blocks">): boolean {
  return effectiveOfferProductHandles(section).length > 1;
}

export function hasConfiguredOfferDiscount(section: Pick<EditorSection, "blocks">): boolean {
  return offerTierBlocks(section).some((tier) => {
    const type = normalizeOfferDiscountType(tier.settings.discount_type);
    return type !== "none" && normalizeOfferDiscountValue(tier.settings.discount_value) > 0;
  });
}

export function normalizeQuantityBreaks(value: unknown): number[] {
  const source = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : [1, 2, 3];
  const quantities = source.map(normalizeOfferQuantity);
  return quantities.length ? quantities : [1, 2, 3];
}

export function offerDiscountLabel(settings: Record<string, SettingValue>): string {
  const type = normalizeOfferDiscountType(settings.discount_type);
  const amount = normalizeOfferDiscountValue(settings.discount_value);
  if (type === "none" || amount <= 0) return "";
  return type === "percentage" ? `−${amount} %` : `−${amount}`;
}
