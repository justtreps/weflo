import { describe, expect, it } from "vitest";
import {
  activeNavLabels,
  fillProfile,
  paintActiveNav,
  resolveNavHref,
  rewriteMockupHref,
  setScIf,
  workspaceCaption,
} from "../src/hydrate/app-chrome";

describe("resolveNavHref", () => {
  it("maps sidebar labels to app routes", () => {
    expect(resolveNavHref("Accueil")).toBe("/dashboard");
    expect(resolveNavHref("Pages")).toBe("/dashboard");
    expect(resolveNavHref("Mon abonnement")).toBe("/facturation");
    expect(resolveNavHref("Réglages")).toBe("/facturation");
    expect(resolveNavHref("Réglages de l'espace")).toBe("/facturation");
    expect(resolveNavHref("Réglages du compte")).toBe("/facturation");
    expect(resolveNavHref("Facturation")).toBe("/facturation");
    expect(resolveNavHref("Partager et gagner")).toBe("/parrainage");
    expect(resolveNavHref("Parrainage")).toBe("/parrainage");
    expect(resolveNavHref("Back to app")).toBe("/dashboard");
  });

  it("ignores labels that are not navigation", () => {
    expect(resolveNavHref("En savoir plus")).toBeNull();
    expect(resolveNavHref("Se déconnecter")).toBeNull();
  });
});

describe("rewriteMockupHref", () => {
  it("rewrites leftover mockup filenames to live routes", () => {
    expect(rewriteMockupHref("buildstore-parrainage.html")).toBe("/parrainage");
    expect(rewriteMockupHref("Facturation.dc.html")).toBe("/facturation");
    expect(rewriteMockupHref("Buildstore Dashboard.dc.html")).toBe("/dashboard");
    expect(rewriteMockupHref("buildstore-dashboard.html")).toBe("/dashboard");
  });

  it("keeps real urls", () => {
    expect(rewriteMockupHref("/parrainage")).toBe("/parrainage");
    expect(rewriteMockupHref("https://discord.gg/E7K6VADQJM")).toBe("https://discord.gg/E7K6VADQJM");
  });
});

describe("setScIf", () => {
  it("opens with important so extract CSS cannot keep the menu hidden", () => {
    const calls: unknown[][] = [];
    const el = {
      style: { setProperty: (...args: unknown[]) => calls.push(args) },
      removeAttribute: () => {},
    };
    setScIf(el as unknown as HTMLElement, true);
    expect(calls[0]).toEqual(["display", "block", "important"]);
    setScIf(el as unknown as HTMLElement, false);
    expect(calls[1]).toEqual(["display", "none", "important"]);
  });
});

describe("workspaceCaption", () => {
  it("does not duplicate Espace when the workspace default name is Espace", () => {
    expect(workspaceCaption("Espace")).toEqual({ title: "Espace", subtitle: "Ton espace" });
  });

  it("shows Espace + name when the workspace has a real name", () => {
    expect(workspaceCaption("ACAI")).toEqual({ title: "ACAI", subtitle: "Espace ACAI" });
  });
});

describe("fillProfile", () => {
  it("paints the workspace name once when it is Espace", () => {
    const title = { textContent: "ACAI" };
    const subtitle = { textContent: "Espace ACAI" };
    const grid = { querySelectorAll: () => [title, subtitle] };
    const toggle = { querySelector: () => grid };
    const root = {
      querySelector: (sel: string) => {
        if (sel.includes("toggleWorkspace")) return toggle;
        return null;
      },
    };
    fillProfile(
      {
        id: "u1",
        email: "a@b.c",
        name: "Amir",
        workspace: { id: "w1", name: "Espace", slug: "espace" },
      },
      root as unknown as ParentNode,
    );
    expect(title.textContent).toBe("Espace");
    expect(subtitle.textContent).toBe("Ton espace");
    expect(`${title.textContent} ${subtitle.textContent}`).not.toMatch(/Espace Espace/);
  });
});

describe("activeNavLabels", () => {
  it("maps routes to sidebar labels", () => {
    expect(activeNavLabels("/dashboard")).toEqual(["Accueil"]);
    expect(activeNavLabels("/parrainage")).toEqual(["Parrainage"]);
    expect(activeNavLabels("/facturation")).toEqual(["Mon abonnement"]);
  });
});

describe("paintActiveNav", () => {
  function navIf(label: string) {
    const calls: unknown[][] = [];
    const span = { textContent: label };
    return {
      querySelector: (sel: string) => (sel === "span" ? span : null),
      style: { setProperty: (...args: unknown[]) => calls.push(args) },
      removeAttribute: () => {},
      tagName: "SC-IF",
      calls,
    };
  }

  it("shows Accueil and hides Parrainage on /dashboard using labels", () => {
    const pagesOn = navIf("Accueil");
    const pagesOff = navIf("Accueil");
    const subOn = navIf("Mon abonnement");
    const subOff = navIf("Mon abonnement");
    const refOn = navIf("Parrainage");
    const refOff = navIf("Parrainage");
    const setOn = navIf("Réglages");
    const setOff = navIf("Réglages");
    const kids = [pagesOn, pagesOff, subOn, subOff, refOn, refOff, setOn, setOff];
    const group = {
      querySelectorAll: (sel: string) => (sel.includes("sc-if") ? kids : []),
      children: kids,
    };
    const root = {
      querySelectorAll: (sel: string) => {
        if (sel.includes("navItems")) return [group];
        return [];
      },
    };
    paintActiveNav("/dashboard", root as unknown as ParentNode);
    expect(pagesOn.calls.at(-1)).toEqual(["display", "block", "important"]);
    expect(pagesOff.calls.at(-1)).toEqual(["display", "none", "important"]);
    expect(refOn.calls.at(-1)).toEqual(["display", "none", "important"]);
    expect(refOff.calls.at(-1)).toEqual(["display", "block", "important"]);
  });

  it("highlights Parrainage on /parrainage", () => {
    const pagesOn = navIf("Pages");
    const pagesOff = navIf("Pages");
    const refOn = navIf("Parrainage");
    const refOff = navIf("Parrainage");
    const kids = [pagesOn, pagesOff, refOn, refOff];
    const group = {
      querySelectorAll: (sel: string) => (sel.includes("sc-if") ? kids : []),
      children: kids,
    };
    const root = {
      querySelectorAll: (sel: string) => (sel.includes("navItems") ? [group] : []),
    };
    paintActiveNav("/parrainage", root as unknown as ParentNode);
    expect(pagesOn.calls.at(-1)).toEqual(["display", "none", "important"]);
    expect(pagesOff.calls.at(-1)).toEqual(["display", "block", "important"]);
    expect(refOn.calls.at(-1)).toEqual(["display", "block", "important"]);
    expect(refOff.calls.at(-1)).toEqual(["display", "none", "important"]);
  });
});
