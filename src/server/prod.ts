import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenAiLlm } from "../lib/canardo";
import { createSessionResolver } from "../lib/session";
import { MemoryStore } from "../repos/memory";
import { PostgresStore } from "../repos/postgres";
import type { Store } from "../repos/types";
import { createShopifyPort } from "../lib/shopify";
import type { AuthPort, LlmPort } from "../types";
import type { AppDeps } from "./app";

function loadDotEnv() {
  try {
    const text = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* no .env file */
  }
}

function openaiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

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

function createLlm(): LlmPort | undefined {
  const key = openaiApiKey();
  return key ? createOpenAiLlm(key) : undefined;
}

function shopifyDeps(): Pick<AppDeps, "shopify" | "encryptionKey"> {
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) return {};
  return { shopify: createShopifyPort(), encryptionKey };
}

export function prodDeps(): AppDeps {
  loadDotEnv();
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const llm = createLlm();
  const shopify = shopifyDeps();

  const store = createStore();

  if (!url || !anonKey) {
    return { store, session: async () => null, llm, ...shopify };
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
    llm,
    ...shopify,
  };
}
