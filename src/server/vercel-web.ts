import type { Hono } from "hono";

export function restoreForwardedRequest(request: Request): Request {
  const url = new URL(request.url);
  const scope = url.searchParams.get("__weflo_scope");
  const capturedPath = url.searchParams.get("path");
  if (scope !== null) {
    url.searchParams.delete("__weflo_scope");
    url.searchParams.delete("path");
    if (scope === "root") {
      url.pathname = "/";
    } else {
      const suffix = capturedPath?.replace(/^\/+/, "") ?? "";
      url.pathname = suffix ? `/${scope}/${suffix}` : `/${scope}`;
    }
    return new Request(url, request);
  }

  const forwardedPath = url.searchParams.get("__weflo_path");
  if (forwardedPath === null) return request;
  url.searchParams.delete("__weflo_path");
  url.pathname = forwardedPath ? `/${forwardedPath.replace(/^\/+/, "")}` : "/";
  return new Request(url, request);
}

export function createVercelWebHandler(app: Hono) {
  return {
    async fetch(request: Request): Promise<Response> {
      return app.fetch(restoreForwardedRequest(request));
    },
  };
}
