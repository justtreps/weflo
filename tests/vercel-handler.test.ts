import { createServer } from "node:http";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createVercelNodeHandler } from "../src/server/vercel-node";
import { readFileSync } from "node:fs";

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

  it("restores the public route forwarded through the catch-all function", async () => {
    const app = new Hono();
    app.get("/api/auth/me", (c) => c.json({ route: c.req.path }));
    const server = createServer(createVercelNodeHandler(app));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing test server address");

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api?__weflo_path=api%2Fauth%2Fme`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ route: "/api/auth/me" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("reads the forwarded route from Vercel request.query", async () => {
    const app = new Hono();
    app.get("/api/auth/me", (c) => c.json({ route: c.req.path }));
    const handler = createVercelNodeHandler(app);
    const server = createServer((request, response) => {
      request.url = "/api";
      (request as typeof request & { query: Record<string, string> }).query = { __weflo_path: "api/auth/me" };
      void handler(request, response);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing test server address");

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ route: "/api/auth/me" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

describe("Vercel Hono entry", () => {
  it("uses the framework entrypoint so every route reaches the same Hono app", () => {
    const entry = readFileSync("src/index.ts", "utf8");
    const ignore = readFileSync(".vercelignore", "utf8");
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const vercel = readFileSync("vercel.json", "utf8");
    expect(entry).toContain("export default app");
    expect(ignore).toContain("api/**");
    expect(pkg.scripts.build).toBe("npm run build:hydrate");
    expect(vercel).toContain('"framework": "hono"');
    expect(vercel).not.toContain('"source": "/api/:path*"');
    expect(vercel).not.toContain('"outputDirectory"');
  });
});
