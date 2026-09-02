import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createClaimToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashClaimToken(token) };
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function claimTokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashClaimToken(token));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
