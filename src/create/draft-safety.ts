const sensitiveQueryKey = /(?:^|[_-])(?:token|key|api[_-]?key|password|secret|auth|signature|credential)(?:$|[_-])/i;
const urlCandidate = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi;
const queryKey = /[?&]([^=&#\s]+)=/g;

function decoded(value: string): string {
  try { return decodeURIComponent(value.replace(/\+/g, " ")); } catch { return value; }
}

export function persistentCreationText(value: unknown): string {
  if (typeof value !== "string") return "";
  if (/(?:data|blob):/i.test(value)) return "";

  for (const candidate of value.match(urlCandidate) ?? []) {
    try {
      const url = new URL(candidate);
      if (url.username || url.password) return "";
      if ([...url.searchParams.keys()].some((key) => sensitiveQueryKey.test(key))) return "";
    } catch { /* The raw query scan below still handles partial URLs. */ }
  }

  for (const match of value.matchAll(queryKey)) {
    if (sensitiveQueryKey.test(decoded(match[1]!))) return "";
  }
  return value;
}
