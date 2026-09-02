import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { readFileSync } from "node:fs";

describe("GET /api/me", () => {
  it("returns 401 then profile", async () => {
    const store = new MemoryStore();
    const loggedOut = createApp({ store, session: async () => null });
    expect((await loggedOut.request("/api/me")).status).toBe(401);

    const app = createApp({
      store,
      session: async () => ({ id: "u1", email: "amir@test.com", name: "Amir" }),
    });
    const me = await (await app.request("/api/me")).json();
    expect(me.email).toBe("amir@test.com");
    expect(me.workspace).toBeTruthy();
  });
});

describe("dashboard loading state", () => {
  it("mounts the visual home before waiting for remote pages", () => {
    const source = readFileSync("src/hydrate/dashboard.ts", "utf8");
    const html = readFileSync("public/dashboard.html", "utf8");
    expect(source).toContain("mountHome();\n  await reload();");
    expect(html).toContain('class="dashboard-boot"');
  });
});
