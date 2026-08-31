import { createClient } from "@supabase/supabase-js";
import { createSessionResolver } from "../lib/session";
import { MemoryStore } from "../repos/memory";
import type { AppDeps } from "./app";

export function prodDeps(): AppDeps {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  let session: AppDeps["session"];
  if (url && anonKey) {
    const supabase = createClient(url, anonKey);
    session = createSessionResolver({
      getUser: async (token) => {
        const { data } = await supabase.auth.getUser(token);
        const user = data.user;
        if (!user) return null;
        return { id: user.id, email: user.email ?? "" };
      },
    });
  } else {
    session = async () => null;
  }

  return {
    store: new MemoryStore(),
    session,
  };
}
