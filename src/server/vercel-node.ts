import type { IncomingMessage, ServerResponse } from "node:http";
import type { Hono } from "hono";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

function requestHeaders(incoming: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

async function requestBody(incoming: VercelRequest): Promise<BodyInit | undefined> {
  if (incoming.method === "GET" || incoming.method === "HEAD") return undefined;
  if (incoming.body !== undefined) {
    if (typeof incoming.body === "string") return incoming.body;
    if (incoming.body instanceof Uint8Array) return Uint8Array.from(incoming.body);
    return JSON.stringify(incoming.body);
  }
  if (incoming.readableEnded || incoming.complete) return undefined;
  const chunks: Uint8Array[] = [];
  for await (const chunk of incoming) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return chunks.length ? Uint8Array.from(Buffer.concat(chunks)) : undefined;
}

function requestUrl(incoming: VercelRequest): string {
  const forwardedProto = incoming.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || "https";
  const host = incoming.headers.host || "localhost";
  const url = new URL(incoming.url || "/", `${protocol}://${host}`);
  const queryPath = incoming.query?.__weflo_path;
  const forwardedPath = url.searchParams.get("__weflo_path") ?? (Array.isArray(queryPath) ? queryPath[0] : queryPath) ?? null;
  if (forwardedPath !== null) {
    url.searchParams.delete("__weflo_path");
    url.pathname = forwardedPath ? `/${forwardedPath.replace(/^\/+/, "")}` : "/";
  }
  return url.toString();
}

async function writeResponse(response: Response, outgoing: ServerResponse): Promise<void> {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  const body = response.body ? Buffer.from(await response.arrayBuffer()) : undefined;
  outgoing.end(body);
}

export function createVercelNodeHandler(app: Hono) {
  return async (incoming: VercelRequest, outgoing: ServerResponse): Promise<void> => {
    try {
      const body = await requestBody(incoming);
      const request = new Request(requestUrl(incoming), {
        method: incoming.method,
        headers: requestHeaders(incoming),
        body,
      });
      await writeResponse(await app.fetch(request), outgoing);
    } catch (error) {
      console.error(error);
      if (!outgoing.headersSent) outgoing.setHeader("content-type", "application/json; charset=UTF-8");
      outgoing.statusCode = 500;
      outgoing.end(JSON.stringify({ error: "internal_error", message: "Le serveur a rencontré une erreur. Réessaie dans un instant." }));
    }
  };
}
