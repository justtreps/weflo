import { describe, expect, it } from "vitest";
import {
  initialCreationState,
  mergeCompatibleCreationDraft,
  restoreCreationDraft,
  serializeCreationDraft,
  submissionActionForState,
  transitionCreationFlow,
} from "../src/create/flow-state";
import { creationWorkspaceUrl } from "../src/create/workspace";

describe("creation flow state", () => {
  it("starts a homepage at its template gallery", () => {
    expect(initialCreationState(new URL("https://weflo.test/creer?format=home"))).toMatchObject({
      format: "home",
      templateId: null,
      step: "template",
    });
  });

  it("rejects a template belonging to another format", () => {
    expect(() => initialCreationState(new URL("https://weflo.test/creer?format=home&template=product-buybox-premium")))
      .toThrow("Template product-buybox-premium is not compatible with home");
  });

  it("opens a blank page directly in creation", () => {
    expect(initialCreationState(new URL("https://weflo.test/creer?format=blank"))).toMatchObject({
      format: "blank",
      templateId: null,
      source: null,
      step: "create-blank",
    });
  });

  it("preserves compatible intake values while moving backward", () => {
    let state = initialCreationState(new URL("https://weflo.test/creer?format=home&template=home-brand-editorial"));
    state = transitionCreationFlow(state, { type: "SELECT_SOURCE", source: "description" });
    state = transitionCreationFlow(state, {
      type: "UPDATE_INTAKE",
      prompt: "Une maison apaisante",
      answers: {
        brand: "Aube",
        activity: "Objets durables",
        promise: "Un intérieur plus calme",
        collections: "Maison, bureau",
        story: "Créée à Lyon",
      },
    });

    const gallery = transitionCreationFlow(state, { type: "BACK" });
    const resumed = transitionCreationFlow(gallery, { type: "SELECT_TEMPLATE", templateId: "home-story-first" });

    expect(gallery).toMatchObject({ step: "template", templateId: null, prompt: "Une maison apaisante" });
    expect(resumed).toMatchObject({
      step: "intake",
      templateId: "home-story-first",
      source: "description",
      answers: { brand: "Aube", story: "Créée à Lyon" },
    });
  });

  it("preserves a format draft after backing all the way to format choice and refreshing", () => {
    let state = initialCreationState(new URL("https://weflo.test/creer?format=home&template=home-brand-editorial"));
    state = transitionCreationFlow(state, {
      type: "UPDATE_INTAKE",
      prompt: "Conserver ce contexte",
      answers: { brand: "Aube", activity: "Maison" },
    });
    state = transitionCreationFlow(transitionCreationFlow(state, { type: "BACK" }), { type: "BACK" });

    expect(state).toMatchObject({ format: "home", templateId: null, step: "format", answers: { brand: "Aube" } });
    const restored = restoreCreationDraft(serializeCreationDraft(state));
    expect(mergeCompatibleCreationDraft(
      initialCreationState(new URL("https://weflo.test/creer?format=home")),
      restored,
      new URL("https://weflo.test/creer?format=home"),
    )).toMatchObject({ format: "home", templateId: null, step: "format", answers: { brand: "Aube" } });
  });

  it("does not advance until every required intake answer is present", () => {
    const state = transitionCreationFlow(
      initialCreationState(new URL("https://weflo.test/creer?format=blog&template=blog-guide")),
      { type: "UPDATE_INTAKE", prompt: "", answers: { topic: "La lumière" } },
    );

    expect(() => transitionCreationFlow(state, { type: "CONTINUE" }))
      .toThrow("Missing required intake fields: intent, angle");
  });

  it("serializes only whitelisted safe textual draft values", () => {
    const raw = serializeCreationDraft({
      format: "home",
      templateId: "home-brand-editorial",
      source: "description",
      prompt: "data:image/png;base64,secret-image",
      answers: {
        brand: "Aube",
        story: "Créée à Lyon",
        password: "never-store-this",
        collections: "data:text/plain;base64,ZmlsZQ==",
      },
      step: "intake",
    });

    expect(JSON.parse(raw)).toEqual({
      version: 2,
      format: "home",
      templateId: "home-brand-editorial",
      source: "description",
      prompt: "",
      answers: { brand: "Aube", story: "Créée à Lyon" },
      step: "intake",
    });
    expect(raw).not.toContain("secret-image");
    expect(raw).not.toContain("never-store-this");
    expect(raw).not.toContain("ZmlsZQ");
  });

  it.each([
    "https://user:password@example.test/product",
    "https://example.test/product?access_token=secret",
    "https://example.test/product?accessToken=secret",
    "https://example.test/product?key=secret",
    "https://example.test/product?api_key=secret",
    "https://example.test/product?password=secret",
    "https://example.test/product?secret=secret",
    "https://example.test/product?clientSecret=secret",
    "https://example.test/product?auth=secret",
    "https://example.test/product?signature=secret",
    "https://example.test/product?credential=secret",
    "https://example.test/callback#access_token=secret",
    "https://example.test/callback#id_token=secret",
    "https://example.test/#/oauth/callback?refresh_token=secret",
    "Consulte blob:https://example.test/private-payload",
    "Préfixe data:image/png;base64,secret-image",
  ])("keeps an unsafe prompt transient and omits it from storage and history: %s", (prompt) => {
    const state = transitionCreationFlow(
      initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=link")),
      { type: "UPDATE_INTAKE", prompt, answers: {} },
    );

    expect(state.prompt).toBe(prompt);
    expect(JSON.parse(serializeCreationDraft(state)).prompt).toBe("");
    expect(creationWorkspaceUrl(state.format, state.templateId, state)).toBe("/creer?format=product&template=product-buybox-premium&source=link");
  });

  it("persists benign words ending in metadata colon text", () => {
    const prompt = "Conserver les metadata: produit et les métadonnées: éditoriales";
    const state = transitionCreationFlow(
      initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=description")),
      { type: "UPDATE_INTAKE", prompt, answers: {} },
    );

    expect(JSON.parse(serializeCreationDraft(state)).prompt).toBe(prompt);
    expect(new URL(creationWorkspaceUrl(state.format, state.templateId, state), "https://weflo.test").searchParams.get("prompt")).toBe(prompt);
  });

  it("restores a current safe draft and rejects malformed or incompatible drafts", () => {
    const raw = JSON.stringify({
      version: 2,
      format: "landing",
      templateId: "landing-direct-response",
      source: "description",
      prompt: "Une campagne solaire",
      answers: { campaign: "Été", audience: "Familles" },
      step: "intake",
    });

    expect(restoreCreationDraft(raw)).toMatchObject({
      format: "landing",
      templateId: "landing-direct-response",
      prompt: "Une campagne solaire",
      answers: { campaign: "Été", audience: "Familles" },
      step: "intake",
    });
    expect(restoreCreationDraft("not-json")).toBeNull();
    expect(restoreCreationDraft(JSON.stringify({
      version: 2,
      format: "home",
      templateId: "product-buybox-premium",
      source: "description",
      prompt: "",
      answers: {},
      step: "intake",
    }))).toBeNull();
    expect(restoreCreationDraft(JSON.stringify({
      version: 2,
      format: "home",
      templateId: null,
      source: "description",
      prompt: "",
      answers: {},
      step: "create-blank",
    }))).toBeNull();
  });

  it("lets explicit URL selections win while restoring compatible saved answers", () => {
    const fromUrl = initialCreationState(new URL("https://weflo.test/creer?format=home&template=home-story-first&source=description&prompt=URL"));
    const saved = restoreCreationDraft(JSON.stringify({
      version: 2,
      format: "home",
      templateId: "home-brand-editorial",
      source: "description",
      prompt: "Saved",
      answers: { brand: "Aube", activity: "Maison" },
      step: "intake",
    }));

    expect(mergeCompatibleCreationDraft(fromUrl, saved, new URL("https://weflo.test/creer?format=home&template=home-story-first&source=description&prompt=URL"))).toMatchObject({
      format: "home",
      templateId: "home-story-first",
      source: "description",
      prompt: "URL",
      answers: { brand: "Aube", activity: "Maison" },
      step: "intake",
    });

    const incompatible = restoreCreationDraft(JSON.stringify({
      version: 2,
      format: "product",
      templateId: "product-buybox-premium",
      source: "link",
      prompt: "https://example.test/product",
      answers: {},
      step: "intake",
    }));
    expect(mergeCompatibleCreationDraft(fromUrl, incompatible, new URL("https://weflo.test/creer?format=home"))).toEqual(fromUrl);
  });

  it("requires an explicit product-backed source instead of promoting a description", () => {
    const describedProduct = initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=description&prompt=https%3A%2F%2Fexample.test%2Fproduct"));
    const normalizedHome = initialCreationState(new URL("https://weflo.test/creer?format=home&template=home-brand-editorial&source=link&prompt=https%3A%2F%2Fexample.test%2Fproduct"));
    const linkedProduct = initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=link&prompt=https%3A%2F%2Fexample.test%2Fproduct"));

    expect(describedProduct.source).toBeNull();
    expect(submissionActionForState(describedProduct)).toBe("product-required");
    expect(submissionActionForState(normalizedHome)).toBe("simple");
    expect(submissionActionForState(linkedProduct)).toBe("link");
  });

  it("keeps Shopify as a distinct catalog import action", () => {
    const state = initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=shopify"));

    expect(submissionActionForState(state)).toBe("shopify");
  });

  it("returns from strategy to intake without losing the selected draft", () => {
    let state = initialCreationState(new URL("https://weflo.test/creer?format=product&template=product-buybox-premium&source=link"));
    state = transitionCreationFlow(state, {
      type: "UPDATE_INTAKE",
      prompt: "Une fiche précise",
      answers: { benefits: "Rapide", objections: "Prix", offer: "49 €", variants: "Noir" },
    });
    state = transitionCreationFlow(state, { type: "CONTINUE" });

    expect(transitionCreationFlow(state, { type: "BACK" })).toMatchObject({
      step: "intake",
      format: "product",
      templateId: "product-buybox-premium",
      source: "link",
      prompt: "Une fiche précise",
      answers: { benefits: "Rapide", offer: "49 €" },
    });
  });

  it("ignores a completed draft when a dashboard link starts a new flow", () => {
    const completed = restoreCreationDraft(JSON.stringify({
      version: 2,
      format: "home",
      templateId: "home-brand-editorial",
      source: "description",
      prompt: "Ancienne création",
      answers: {
        brand: "Ancienne marque",
        activity: "Maison",
        promise: "Ancienne promesse",
        collections: "Ancienne collection",
        story: "Ancienne histoire",
      },
      step: "build",
    }));
    const url = new URL("https://weflo.test/creer?format=home&new=1");
    const fresh = mergeCompatibleCreationDraft(initialCreationState(url), completed, url);

    expect(fresh).toMatchObject({ format: "home", templateId: null, source: null, prompt: "", answers: {}, step: "template" });
  });
});
