export function shopifyHandle(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

export function sectionFileName(type: string): string { return `sections/weflo-${shopifyHandle(type)}.liquid`; }
