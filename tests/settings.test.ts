import { describe, it, expect } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";

describe("workspace and account settings", () => {
  it("PATCH /api/workspace updates the name as owner", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    const app = createApp({
      store,
      session: async () => ({ id: "owner", email: "owner@x.test" }),
    });

    const res = await app.request("/api/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Nouveau" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Nouveau");
    expect((await store.getWorkspace(ws.id))?.name).toBe("Nouveau");
  });

  it("PATCH /api/workspace rejects a non-owner member", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    await store.addMembership({ userId: "member", workspaceId: ws.id, role: "member" });
    const app = createApp({
      store,
      session: async () => ({ id: "member", email: "member@x.test" }),
    });

    const res = await app.request("/api/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Hack" }),
    });
    expect(res.status).toBe(403);
    expect((await store.getWorkspace(ws.id))?.name).toBe("ACAI");
  });

  it("POST /api/workspace/members invites via inviteEmail", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    const invited: { email: string; workspaceId: string; role: string }[] = [];
    const app = createApp({
      store,
      session: async () => ({ id: "owner", email: "owner@x.test" }),
      inviteEmail: async (input) => {
        invited.push(input);
      },
    });

    const res = await app.request("/api/workspace/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@x.test", role: "member" }),
    });
    expect(res.status).toBe(200);
    expect(invited).toEqual([{ email: "new@x.test", workspaceId: ws.id, role: "member" }]);
  });

  it("DELETE /api/workspace removes the workspace as owner", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    const app = createApp({
      store,
      session: async () => ({ id: "owner", email: "owner@x.test" }),
    });

    const res = await app.request("/api/workspace", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(await store.getWorkspace(ws.id)).toBeNull();
    expect(await store.listWorkspaces("owner")).toEqual([]);
  });

  it("DELETE /api/workspace rejects a non-owner member", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    await store.addMembership({ userId: "member", workspaceId: ws.id, role: "member" });
    const app = createApp({
      store,
      session: async () => ({ id: "member", email: "member@x.test" }),
    });

    const res = await app.request("/api/workspace", { method: "DELETE" });
    expect(res.status).toBe(403);
    expect(await store.getWorkspace(ws.id)).not.toBeNull();
  });

  it("DELETE /api/me removes memberships and calls deleteUser", async () => {
    const store = new MemoryStore();
    const ws = await store.createWorkspace({ name: "ACAI", ownerUserId: "owner" });
    await store.addMembership({ userId: "guest", workspaceId: ws.id, role: "member" });
    const deleted: string[] = [];
    const app = createApp({
      store,
      session: async () => ({ id: "guest", email: "guest@x.test" }),
      deleteUser: async (userId) => {
        deleted.push(userId);
      },
    });

    const res = await app.request("/api/me", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(deleted).toEqual(["guest"]);
    expect(await store.listWorkspaces("guest")).toEqual([]);
    expect(await store.getWorkspace(ws.id)).not.toBeNull();
  });
});
