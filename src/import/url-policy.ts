import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type HostResolver = (hostname: string) => Promise<string[]>;

function unsafeAddress(address: string): boolean {
  const value = address.toLowerCase().replace(/^::ffff:/, "");
  if (value === "::1" || value === "::" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (!isIP(value) && value !== "localhost") return false;
  const parts = value.split(".").map(Number);
  if (parts.length !== 4) return value === "localhost";
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

const defaultResolver: HostResolver = async (hostname) => {
  const result = await lookup(hostname, { all: true, verbatim: true });
  return result.map((entry) => entry.address);
};

export async function assertPublicProductUrl(raw: string, resolver: HostResolver = defaultResolver): Promise<URL> {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Use a public HTTPS product page."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hostname.toLowerCase() === "localhost") throw new Error("Use a public HTTPS product page.");
  const addresses = isIP(url.hostname) ? [url.hostname] : await resolver(url.hostname);
  if (!addresses.length || addresses.some(unsafeAddress)) throw new Error("Use a public HTTPS product page.");
  return url;
}
