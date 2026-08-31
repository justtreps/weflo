import { describe, it, expect } from "vitest";
import { health } from "../src/health";

describe("health", () => {
  it("returns ok", () => {
    expect(health()).toEqual({ ok: true });
  });
});
