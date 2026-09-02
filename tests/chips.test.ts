import { describe, expect, it } from "vitest";
import { groupChips, paintChip } from "../src/lib/chips";
import { setScIf } from "../src/hydrate/app-chrome";

function fakeIf() {
  const calls: unknown[][] = [];
  const el = {
    style: { setProperty: (...args: unknown[]) => calls.push(args) },
    removeAttribute: () => {},
  };
  return { el: el as unknown as HTMLElement, calls };
}

function fakeBtn(label: string, scIf: HTMLElement, parent: HTMLElement) {
  return {
    querySelector: (sel: string) => (sel === "span" ? { textContent: label } : null),
    closest: (sel: string) => (sel === "sc-if" ? scIf : null),
    parentElement: parent,
  } as unknown as HTMLElement;
}

describe("groupChips", () => {
  it("pairs selected/idle on the sc-if ancestor, not the inner button wrap", () => {
    const selected = fakeIf();
    const idle = fakeIf();
    const innerWrap = fakeIf();
    const btnSelected = fakeBtn("Accueil", selected.el, innerWrap.el);
    const btnIdle = fakeBtn("Accueil", idle.el, innerWrap.el);

    const groups = groupChips([btnSelected, btnIdle]);
    const pair = groups.get("Accueil");
    expect(pair?.selected).toBe(selected.el);
    expect(pair?.idle).toBe(idle.el);
    expect(pair?.selected).not.toBe(innerWrap.el);
  });
});

describe("paintChip", () => {
  it("keeps Accueil visible when selected by toggling both sc-if with !important", () => {
    const selected = fakeIf();
    const idle = fakeIf();
    const groups = new Map([
      ["Accueil", { selected: selected.el, idle: idle.el }],
      ["Tout", { selected: fakeIf().el, idle: fakeIf().el }],
    ]);

    paintChip(groups, "Accueil", setScIf);

    expect(selected.calls).toContainEqual(["display", "block", "important"]);
    expect(idle.calls).toContainEqual(["display", "none", "important"]);
  });

  it("never hides Accueil if selected and idle are the same node", () => {
    const only = fakeIf();
    const groups = new Map([["Accueil", { selected: only.el, idle: only.el }]]);
    paintChip(groups, "Accueil", setScIf);
    expect(only.calls.at(-1)).toEqual(["display", "block", "important"]);
  });
});
