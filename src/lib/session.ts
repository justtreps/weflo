import type { AppSession, User } from "../types";

export function createSessionResolver(auth: {
  getUser: (accessToken: string) => Promise<User | null>;
}) {
  return async function session(req: Request): Promise<AppSession> {
    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    if (!match) return null;
    return auth.getUser(decodeURIComponent(match[1]));
  };
}
