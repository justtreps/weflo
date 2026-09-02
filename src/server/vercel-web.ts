import type { Hono } from "hono";

export function restoreForwardedRequest(request: Request): Request {
  const url = new URL(request.url);
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
