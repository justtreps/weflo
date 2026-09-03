const sensitiveQueryParts = new Set(["token", "key", "apikey", "password", "secret", "auth", "signature", "credential"]);
const urlCandidate = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi;
const queryKey = /[?&#]([^=&#\s/]+)=/g;

function decoded(value: string): string {
  try { return decodeURIComponent(value.replace(/\+/g, " ")); } catch { return value; }
}

function isSensitiveQueryKey(value: string): boolean {
  const normalized = decoded(value)
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return normalized.split(/[^a-z\d]+/).some((part) => sensitiveQueryParts.has(part));
}

export function persistentCreationText(value: unknown): string {
  if (typeof value !== "string") return "";
  if (/\b(?:data|blob):/i.test(value)) return "";

  for (const candidate of value.match(urlCandidate) ?? []) {
    try {
      const url = new URL(candidate);
      if (url.username || url.password) return "";
      if ([...url.searchParams.keys()].some(isSensitiveQueryKey)) return "";
      const fragment = url.hash.slice(1);
      const fragmentParameters = fragment.includes("?") ? fragment.slice(fragment.indexOf("?") + 1) : fragment;
      if ([...new URLSearchParams(fragmentParameters).keys()].some(isSensitiveQueryKey)) return "";
    } catch { /* The raw query scan below still handles partial URLs. */ }
  }

  for (const match of value.matchAll(queryKey)) {
    if (isSensitiveQueryKey(match[1]!)) return "";
  }
  return value;
}
