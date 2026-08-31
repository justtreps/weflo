import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

const auth = {
  signInEmail: async (email: string, password: string) => {
    if (password !== "ok") throw new Error("invalid");
    return { accessToken: "tok", user: { id: "u1", email } };
  },
  signUpEmail: async (email: string, password: string, name: string) => ({
    accessToken: "tok", user: { id: "u2", email, name },
  }),
  signInGoogle: async () => ({ url: "https://accounts.google.com/x" }),
  signOut: async () => {},
};

describe("auth API", () => {
  it("sets cookie on email login and returns 401 on bad password", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null, auth });
    const bad = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "no" }),
    });
    expect(bad.status).toBe(401);

    const ok = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "ok" }),
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toMatch(/sb-access-token=tok/);
  });

  it("returns Google redirect URL", async () => {
    const app = createApp({ store: new MemoryStore(), session: async () => null, auth });
    const res = await app.request("/api/auth/google", { method: "POST" });
    expect((await res.json()).url).toMatch(/google/);
  });
});
