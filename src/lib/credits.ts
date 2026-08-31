import type { CreditLedger } from "../types";

export function totalCredits(l: CreditLedger) {
  return l.monthlyRemaining + l.purchasedRemaining;
}

export function spendCredits(l: CreditLedger, n: number): CreditLedger {
  if (n <= 0) return l;
  if (totalCredits(l) < n) throw new Error("credits");
  let left = n;
  const monthly = Math.max(0, l.monthlyRemaining - left);
  left -= l.monthlyRemaining - monthly;
  return {
    ...l,
    monthlyRemaining: monthly,
    purchasedRemaining: l.purchasedRemaining - left,
  };
}
