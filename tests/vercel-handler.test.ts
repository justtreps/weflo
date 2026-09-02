import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel server entrypoint", () => {
  it("uses Hono's Web Request adapter so POST bodies are readable on Vercel", () => {
    const source = readFileSync("src/server/vercel-handler.ts", "utf8");

    expect(source).toContain('from "hono/vercel"');
    expect(source).toContain("handle(app)");
    expect(source).not.toContain("getRequestListener");
  });
});
