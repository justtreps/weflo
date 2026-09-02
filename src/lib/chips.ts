export type ChipPair = { selected: HTMLElement; idle: HTMLElement };

export function chipIf(btn: HTMLElement): HTMLElement | null {
  return btn.closest("sc-if");
}

export function chipLabel(btn: HTMLElement): string {
  return btn.querySelector("span")?.textContent?.trim() ?? btn.textContent?.trim() ?? "";
}

export function groupChips(buttons: Iterable<HTMLElement>): Map<string, ChipPair> {
  const groups = new Map<string, ChipPair>();
  for (const btn of buttons) {
    const label = chipLabel(btn);
    if (!label) continue;
    const wrap = chipIf(btn);
    if (!wrap) continue;
    const existing = groups.get(label);
    if (!existing) groups.set(label, { selected: wrap, idle: wrap });
    else existing.idle = wrap;
  }
  return groups;
}

export function paintChip(
  groups: Map<string, ChipPair>,
  active: string,
  setIf: (el: HTMLElement | null, open: boolean) => void,
) {
  for (const [label, pair] of groups) {
    const on = label === active;
    if (pair.selected === pair.idle) {
      setIf(pair.selected, true);
      continue;
    }
    setIf(pair.selected, on);
    setIf(pair.idle, !on);
  }
}
