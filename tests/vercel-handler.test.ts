import { createServer } from "node:http";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createVercelNodeHandler } from "../src/server/vercel-node";

describe("Vercel Node handler", () => {
  it("reads JSON POST bodies and returns the Hono response", async () => {
    const app = new Hono();
    app.post("/api/echo", async (c) => c.json(await c.req.json(), 201));
    const server = createServer(createVercelNodeHandler(app));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing test server address");

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/echo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: "lampe" }),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ product: "lampe" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
