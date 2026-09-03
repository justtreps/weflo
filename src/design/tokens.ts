import type { DesignProfile } from "./profile";

/** Safe, namespaced custom properties shared by Web and Liquid renderers. */
export function designTokenStyle(profile: DesignProfile): string {
  return [
    `--wf-profile-background:${profile.colors.background}`,
    `--wf-profile-surface:${profile.colors.surface}`,
    `--wf-profile-ink:${profile.colors.ink}`,
    `--wf-profile-accent:${profile.colors.accent}`,
    `--wf-profile-section:${profile.spacing.section}px`,
    `--wf-profile-gap:${profile.spacing.gap}px`,
    `--wf-profile-card-radius:${profile.radius.card}px`,
    `--wf-profile-button-radius:${profile.radius.button}px`,
    `--wf-profile-border-width:${profile.borders.width}px`,
    `--wf-profile-border-color:${profile.borders.color}`,
    `--wf-profile-motion:${profile.motion.durationMs}ms`,
  ].join(";") + ";";
}
