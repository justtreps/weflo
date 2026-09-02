import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { initialDocument } from "../src/lib/catalog";
import { createOnboardingDraftInput } from "../src/onboarding/schema";
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
  run("creates a workspace, page, lists and deletes", { timeout: 30000 }, async () => {
    const schema = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");
    const sql = postgres(databaseUrl!, { prepare: false });
    const store = new PostgresStore(databaseUrl!);
    let wsId: string | undefined;
    let draftId: string | undefined;
    try {
      try {
        await sql.unsafe(schema);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!/permission denied for schema public/i.test(msg)) throw err;
      }
      const ws = await store.createWorkspace({
        name: "ACAI Test",
        ownerUserId: `u_${Date.now()}`,
      });
      wsId = ws.id;
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

      const draft = await store.createOnboardingDraft(createOnboardingDraftInput({ claimTokenHash: "hash-test", sourceUrl: "https://example.com/product" }));
      draftId = draft.id;
      expect((await store.getOnboardingDraft(draft.id))?.sourceUrl).toBe("https://example.com/product");
      const updatedDraft = await store.updateOnboardingDraft(draft.id, { status: "questions", brandName: "Test Brand" });
      expect(updatedDraft).toMatchObject({ status: "questions", brandName: "Test Brand" });
      expect((await store.claimOnboardingDraft(draft.id, "hash-test", "user-test", "page-test"))).toMatchObject({ status: "claimed", claimedPageId: "page-test" });
    } catch (err) {
      throw redact(err);
    } finally {
      if (draftId) {
        try {
          await sql`delete from pages where id = ${draftId}`;
        } catch {
          /* cleanup best-effort */
        }
      }
      if (wsId) {
        try {
          await store.deleteWorkspace(wsId);
        } catch {
          /* cleanup best-effort */
        }
      }
      await store.close();
      await sql.end({ timeout: 5 });
    }
  });
});
