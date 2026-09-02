import { describe, expect, it } from "vitest";
import type { EditorSection } from "../src/editor/document";
import { customCodeSection } from "../src/sections/custom-code";
import { scopeCustomCss, validateCustomCode } from "../src/editor/custom-code-policy";

describe("custom code policy", () => {
  it.each([
    { html: '<script src="https://evil.test/x.js"></script>', css: "", js: "" },
    { html: "<p>Hello</p>", css: '@import url("https://evil.test/x.css");', js: "" },
    { html: "<p>Hello</p>", css: "body{color:red}", js: "" },
    { html: "<p>Hello</p>", css: "", js: "fetch('/api/session')" },
    { html: "<p>Hello</p>", css: "", js: "document.cookie" },
    { html: "{% render 'passwords' %}", css: "", js: "" },
  ])("rejects unsafe code", (input) => expect(validateCustomCode({ ...input, allowedDomains: [], namespace: "demo" }).ok).toBe(false));

  it("allows local interactions when CSS is namespaced", () => {
    const result = validateCustomCode({ html: '<button data-action="toggle">Ouvrir</button>', css: '[data-wf-custom-id="demo"] button{color:red}', js: 'document.querySelector("button").addEventListener("click",()=>{})', allowedDomains: [], namespace: "demo" });
    expect(result.ok).toBe(true);
  });

  it("scopes safe CSS and renders code in a sandboxed iframe", () => {
    expect(scopeCustomCss(".card{color:red}", "demo")).toContain('[data-wf-custom-id="demo"] .card');
    const section: EditorSection = { id: "demo", type: "customCode", name: "Code", hidden: false, locked: false, settings: { html: "<h2>Sur mesure</h2>", css: '[data-wf-custom-id="demo"] h2{color:red}', js: "" }, style: {}, responsive: {}, blocks: [] };
    const html = customCodeSection.renderWeb({ section, pageName: "Page" });
    expect(html).toContain("sandbox=\"allow-scripts\"");
    expect(html).toContain("srcdoc=");
    expect(html).toContain("Sur mesure");
  });
});
