export type PublishingPlan = { status: "none" | "active" | "inactive"; planId: string | null };

export function publishAccessForBilling(plan: PublishingPlan, proPlanId: string | null) {
  const allowed = plan.status === "active" && (!proPlanId || plan.planId === proPlanId);
  return allowed
    ? { allowed: true as const }
    : { allowed: false as const, reason: "pro_required" as const };
}
