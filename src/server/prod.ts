import { createClient } from "@supabase/supabase-js";
import { createSessionResolver } from "../lib/session";
import { MemoryStore } from "../repos/memory";
import { PostgresStore } from "../repos/postgres";
import type { Store } from "../repos/types";
import type { AuthPort } from "../types";
import type { AppDeps } from "./app";

function createStore(): Store {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl ? new PostgresStore(databaseUrl) : new MemoryStore();
}

function createSupabaseAuth(url: string, anonKey: string): AuthPort {
  const supabase = createClient(url, anonKey);
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");

  return {
    async signInEmail(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw new Error("invalid");
      return {
        accessToken: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
          name: typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null,
        },
      };
    },
    async signUpEmail(email, password, name) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error || !data.session || !data.user) throw new Error("invalid");
      return {
        accessToken: data.session.access_token,
        user: { id: data.user.id, email: data.user.email ?? email, name },
      };
    },
    async signInGoogle() {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: appUrl ? `${appUrl}/dashboard` : undefined,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data.url) throw new Error("invalid");
      return { url: data.url };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };
}

export function prodDeps(): AppDeps {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const store = createStore();

  if (!url || !anonKey) {
    return { store, session: async () => null };
  }

  const supabase = createClient(url, anonKey);
  return {
    store,
    session: createSessionResolver({
      getUser: async (token) => {
        const { data } = await supabase.auth.getUser(token);
        const user = data.user;
        if (!user) return null;
        return { id: user.id, email: user.email ?? "" };
      },
    }),
    auth: createSupabaseAuth(url, anonKey),
  };
}
