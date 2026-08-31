import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { initialDocument } from "../src/lib/catalog";
import { PostgresStore } from "../src/repos/postgres";

function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== "DATABASE_URL") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

function redact(err: unknown): Error {
  const raw = err instanceof Error ? err.message : "database error";
  return new Error(raw.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[redacted]"));
}

const databaseUrl = loadDatabaseUrl();
const run = databaseUrl ? it : it.skip;

describe("PostgresStore", () => {
  run("creates a workspace, page, lists and deletes", async () => {
    const schema = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");
    const sql = postgres(databaseUrl!);
    const store = new PostgresStore(databaseUrl!);
    try {
      await sql.unsafe(schema);
      const ws = await store.createWorkspace({
        name: "ACAI Test",
        ownerUserId: `u_${Date.now()}`,
      });
      expect(ws.slug).toMatch(/^acai-test-[a-z0-9]+$/);

      await expect(store.assertMember("stranger", ws.id)).rejects.toThrow("forbidden");

      const credits = await store.getCredits(ws.id);
      expect(credits.monthlyRemaining).toBe(40);
      expect(credits.purchasedRemaining).toBe(0);

      const page = await store.createPage({
        workspaceId: ws.id,
        name: "Home",
        slug: "home",
        type: "sell",
        status: "draft",
        document: initialDocument("Home", "sell"),
      });
      expect((await store.listPages(ws.id)).map((p) => p.id)).toEqual([page.id]);

      await store.deletePage(page.id);
      expect(await store.listPages(ws.id)).toEqual([]);
    } catch (err) {
      throw redact(err);
    } finally {
      await store.close();
      await sql.end({ timeout: 5 });
    }
  });
});
