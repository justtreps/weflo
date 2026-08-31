import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../src/lib/encrypt";

const key = "0".repeat(64);

describe("encryptSecret", () => {
  it("roundtrips and does not contain the plaintext", () => {
    const enc = encryptSecret("shpat_secret", key);
    expect(enc).not.toContain("shpat_secret");
    expect(decryptSecret(enc, key)).toBe("shpat_secret");
  });
});
