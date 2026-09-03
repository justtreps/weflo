type Attribute = { key: string; value: string };
type Component = { merchandiseId: string; quantity: number };
type CartLine = {
  id: string;
  quantity: number;
  sellingPlanAllocation?: unknown;
  attributes?: Attribute[];
  merchandise?: { product?: { metafield?: { value?: string | null } | null } | null } | null;
};
type CartTransformInput = { cart?: { lines?: CartLine[] } };
type Operation = { lineExpand: { cartLineId: string; expandedCartItems: Component[] } };

function attribute(line: CartLine, key: string): string | null {
  return line.attributes?.find((item) => item.key === key)?.value ?? null;
}

function configurations(line: CartLine): Set<string> {
  const raw = line.merchandise?.product?.metafield?.value;
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch { return new Set(); }
}

function components(raw: string | null): Component[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 20) return null;
    const result = parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Record<string, unknown>;
      const merchandiseId = candidate.merchandiseId;
      const quantity = candidate.quantity;
      return typeof merchandiseId === "string" && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(merchandiseId) && Number.isInteger(quantity) && Number(quantity) > 0 && Number(quantity) <= 99
        ? [{ merchandiseId, quantity: Number(quantity) }]
        : [];
    });
    return result.length === parsed.length ? result : null;
  } catch { return null; }
}

export function run(input: CartTransformInput): { operations: Operation[] } {
  const operations: Operation[] = [];
  for (const line of input.cart?.lines ?? []) {
    if (line.sellingPlanAllocation) continue; // Shopify purchase options stay separate from custom bundles.
    const configurationId = attribute(line, "_weflo_bundle_configuration");
    if (!configurationId || !/^wfbc_[A-Za-z0-9_-]{12,}$/.test(configurationId) || !configurations(line).has(configurationId)) continue;
    const selected = components(attribute(line, "_weflo_bundle_components"));
    if (!selected) continue;
    operations.push({ lineExpand: { cartLineId: line.id, expandedCartItems: selected.map((component) => ({ ...component, quantity: component.quantity * Math.max(1, line.quantity) })) } });
  }
  return { operations };
}
