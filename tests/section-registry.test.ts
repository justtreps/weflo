import { describe, expect, it } from "vitest";
import { getSectionDefinition, listSectionDefinitions, registerSection } from "../src/sections/registry";
import type { SectionDefinition } from "../src/sections/types";
import { escapeHtml, formatPrice, safeLink, safeMediaUrl } from "../src/sections/shared";

function definition(type: string): SectionDefinition {
  return {
    type,
    name: "Test section",
    category: "content",
    defaults: { title: "Hello" },
    settings: [{ key: "title", label: "Title", type: "text" }],
    blocks: [],
    renderWeb: ({ section }) => `<h2>${section.settings.title}</h2>`,
    renderLiquid: () => "<h2>{{ section.settings.title }}</h2>",
  };
}

describe("commerce section registry", () => {
  it("registers complete definitions and finds them by type", () => {
    const entry = definition(`test-${Date.now()}`);
    registerSection(entry);
    expect(getSectionDefinition(entry.type)).toBe(entry);
    expect(listSectionDefinitions()).toContain(entry);
  });

  it("rejects duplicate and incomplete definitions", () => {
    const entry = definition(`duplicate-${Date.now()}`);
    registerSection(entry);
    expect(() => registerSection(entry)).toThrow(/already registered/i);
    expect(() => registerSection({ ...definition(""), type: "" })).toThrow(/type/i);
  });

  it("provides safe shared rendering helpers", () => {
    expect(escapeHtml(`<b title="x">&`)).toBe("&lt;b title=&quot;x&quot;&gt;&amp;");
    expect(safeMediaUrl("javascript:alert(1)")).toBe("");
    expect(safeMediaUrl("/assets/a.jpg")).toBe("/assets/a.jpg");
    expect(safeLink("javascript:alert(1)")).toBe("#");
    expect(formatPrice(1299, "EUR", "fr-FR")).toContain("12,99");
  });
});
