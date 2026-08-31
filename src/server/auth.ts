import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { AppDeps } from "./app";

const COOKIE = "sb-access-token";

function cookieOpts() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function authRoutes(deps: AppDeps) {
  const app = new Hono();

  app.post("/auth/signup", async (c) => {
    if (!deps.auth) return c.json({ error: "unavailable" }, 503);
    const body = await c.req.json<{ email?: string; password?: string; name?: string }>().catch(() => ({}));
    try {
      const { accessToken, user } = await deps.auth.signUpEmail(
        typeof body.email === "string" ? body.email : "",
        typeof body.password === "string" ? body.password : "",
        typeof body.name === "string" ? body.name : "",
      );
      setCookie(c, COOKIE, accessToken, cookieOpts());
      return c.json({ user });
    } catch {
      return c.json({ error: "invalid" }, 401);
    }
  });

  app.post("/auth/login", async (c) => {
    if (!deps.auth) return c.json({ error: "unavailable" }, 503);
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}));
    try {
      const { accessToken, user } = await deps.auth.signInEmail(
        typeof body.email === "string" ? body.email : "",
        typeof body.password === "string" ? body.password : "",
      );
      setCookie(c, COOKIE, accessToken, cookieOpts());
      return c.json({ user });
    } catch {
      return c.json({ error: "invalid" }, 401);
    }
  });

  app.post("/auth/google", async (c) => {
    if (!deps.auth) return c.json({ error: "unavailable" }, 503);
    try {
      return c.json(await deps.auth.signInGoogle());
    } catch {
      return c.json({ error: "invalid" }, 401);
    }
  });

  app.post("/auth/logout", async (c) => {
    if (deps.auth) await deps.auth.signOut().catch(() => undefined);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
