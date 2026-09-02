export async function fetchWithDeadline(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 30_000,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("L’importation prend trop de temps. Réessaie ou importe directement une image.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readApiJson(response: Response): Promise<Record<string, any>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json() as Record<string, any>;
    } catch {
      /* use a stable message below */
    }
  }
  return {
    message: response.status >= 500
      ? "Le serveur a rencontré une erreur. Réessaie dans un instant."
      : "La réponse du serveur est invalide. Réessaie.",
  };
}
