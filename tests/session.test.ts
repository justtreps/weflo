import { describe, it, expect } from "vitest";
import { createSessionResolver } from "../src/lib/session";

describe("createSessionResolver", () => {
  it("returns null without cookie", async () => {
    const resolve = createSessionResolver({
      getUser: async () => { throw new Error("should not call"); },
    });
    expect(await resolve(new Request("http://x/"))).toBeNull();
  });

  it("returns user when getUser accepts the access token", async () => {
    const resolve = createSessionResolver({
      getUser: async (token) => token === "tok" ? { id: "u1", email: "a@b.c" } : null,
    });
    const req = new Request("http://x/", { headers: { cookie: "sb-access-token=tok" } });
    expect(await resolve(req)).toEqual({ id: "u1", email: "a@b.c" });
  });
});
