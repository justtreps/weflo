import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { MemoryStore } from "../src/repos/memory";
import { buildModelDocument } from "../src/models/model-manifest";
import { planCanardoLocally } from "../src/canardo/local-planner";
import { validateCanardoResponse } from "../src/canardo/validate";

describe("Canardo vibecode", () => {
  it.each(["Ajoute un accordéon interactif", "Crée un calculateur de quantité"])("creates a safe isolated interaction for: %s", (prompt) => {
    const document = buildModelDocument("proteo", "Shop");
    const response = planCanardoLocally(prompt, document, null);
    expect(response.commands[0]).toMatchObject({ type: "insertSection", section: { type: "customCode" } });
    expect(validateCanardoResponse(response, document).ok).toBe(true);
  });

  it.each(["document.cookie", "fetch('https://evil.test')", "window.top.location='https://evil.test'"])("rejects adversarial generated code: %s", (js) => {
    const document = buildModelDocument("proteo", "Shop");
    const page = document.pages[0];
    const response = { message: "x", summary: "x", commands: [{ type: "insertSection" as const, pageId: page.id, index: 1, section: { ...page.sections[2], id: `custom-${js.length}`, type: "customCode", settings: { html: "<button>Test</button>", css: "", js } } }] };
    expect(validateCanardoResponse(response, document).ok).toBe(false);
  });

  it("previews consequential code, then persists only after confirmation", async () => {
    const store = new MemoryStore();
    const workspace = await store.createWorkspace({ name: "Shop", ownerUserId: "u1" });
    const editorDocument = buildModelDocument("proteo", "Shop");
    const page = await store.createPage({ workspaceId: workspace.id, name: "Shop", slug: "shop", type: "sell", status: "draft", document: editorDocument as never });
    const beforeCredits = (await store.getCredits(workspace.id)).monthlyRemaining;
    const app = createApp({ store, session: async () => ({ id: "u1", email: "a@b.c" }) });
    const preview = await app.request(`/api/pages/${page.id}/canardo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "Ajoute un accordéon interactif" }) });
    expect(preview.status).toBe(200);
    const proposal = await preview.json();
    expect(proposal.requiresConfirmation).toBe(true);
    expect((await store.getCredits(workspace.id)).monthlyRemaining).toBe(beforeCredits);
    expect((await store.getPage(page.id))!.document).toEqual(editorDocument);
    const accepted = await app.request(`/api/pages/${page.id}/canardo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "Ajoute un accordéon interactif", confirm: true, response: { message: proposal.message, summary: proposal.summary, commands: proposal.commands } }) });
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).requiresConfirmation).toBe(false);
    expect(((await store.getPage(page.id))!.document as never as typeof editorDocument).pages[0].sections.at(-1)?.type).toBe("customCode");
    expect((await store.getCredits(workspace.id)).monthlyRemaining).toBe(beforeCredits - 1);
  });
});
