import type { ArtDirectionProfile } from "../onboarding/types";

export type DesignArchetype = "editorial" | "clinical" | "playful" | "luxury" | "technical" | "natural" | "sport" | "utility";
export type DesignProfile = {
  id: string;
  market: string;
  archetype: DesignArchetype;
  typography: { heading: string; body: string; scale: number };
  colors: { background: string; surface: string; ink: string; accent: string };
  spacing: { section: number; gap: number };
  radius: { card: number; button: number };
  borders: { width: number; color: string };
  media: { ratio: "portrait" | "square" | "landscape"; treatment: "clean" | "editorial" | "immersive" };
  motion: { reveal: "none" | "fade" | "slide"; durationMs: number };
  density: "airy" | "balanced" | "dense";
};

export type DesignProfileValidation = { ok: true; value: DesignProfile } | { ok: false; errors: string[] };

const FONTS = new Set(["Inter", "Manrope", "DM Sans", "Space Grotesk", "Arial", "Syne", "Cormorant Garamond", "Fraunces"]);
const ARCHETYPES = new Set<DesignArchetype>(["editorial", "clinical", "playful", "luxury", "technical", "natural", "sport", "utility"]);
const RATIOS = new Set<DesignProfile["media"]["ratio"]>(["portrait", "square", "landscape"]);
const TREATMENTS = new Set<DesignProfile["media"]["treatment"]>(["clean", "editorial", "immersive"]);
const REVEALS = new Set<DesignProfile["motion"]["reveal"]>(["none", "fade", "slide"]);
const DENSITIES = new Set<DesignProfile["density"]>(["airy", "balanced", "dense"]);
const HEX = /^#[0-9a-f]{6}$/i;

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function within(value: unknown, min: number, max: number): value is number { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }

export function validateDesignProfile(value: unknown): DesignProfileValidation {
  if (!record(value)) return { ok: false, errors: ["Profil de design invalide."] };
  const errors: string[] = [];
  const typography = record(value.typography) ? value.typography : {};
  const colors = record(value.colors) ? value.colors : {};
  const spacing = record(value.spacing) ? value.spacing : {};
  const radius = record(value.radius) ? value.radius : {};
  const borders = record(value.borders) ? value.borders : {};
  const media = record(value.media) ? value.media : {};
  const motion = record(value.motion) ? value.motion : {};
  if (typeof value.id !== "string" || !value.id.trim()) errors.push("Identifiant de profil invalide.");
  if (typeof value.market !== "string" || !value.market.trim()) errors.push("Marché invalide.");
  if (!ARCHETYPES.has(value.archetype as DesignArchetype)) errors.push("Archétype invalide.");
  if (!FONTS.has(typography.heading as string)) errors.push("Police de titre invalide.");
  if (!FONTS.has(typography.body as string)) errors.push("Police de texte invalide.");
  if (!within(typography.scale, .8, 1.4)) errors.push("Échelle typographique invalide.");
  for (const [key, color] of Object.entries(colors)) if (!["background", "surface", "ink", "accent"].includes(key) || typeof color !== "string" || !HEX.test(color)) errors.push("Couleur invalide.");
  if (Object.keys(colors).length !== 4) errors.push("Couleurs incomplètes.");
  if (!within(spacing.section, 0, 160) || !within(spacing.gap, 0, 160)) errors.push("Espacement invalide.");
  if (!within(radius.card, 0, 48) || !within(radius.button, 0, 48)) errors.push("Rayon invalide.");
  if (!within(borders.width, 0, 8) || typeof borders.color !== "string" || !HEX.test(borders.color)) errors.push("Bordure invalide.");
  if (!RATIOS.has(media.ratio as DesignProfile["media"]["ratio"]) || !TREATMENTS.has(media.treatment as DesignProfile["media"]["treatment"])) errors.push("Direction média invalide.");
  if (!REVEALS.has(motion.reveal as DesignProfile["motion"]["reveal"]) || !within(motion.durationMs, 0, 800)) errors.push("Mouvement invalide.");
  if (!DENSITIES.has(value.density as DesignProfile["density"])) errors.push("Densité invalide.");
  return errors.length ? { ok: false, errors } : { ok: true, value: value as DesignProfile };
}

const ART_DIRECTION_ARCHETYPE: Record<ArtDirectionProfile["id"], DesignArchetype> = {
  "warm-home": "natural", "editorial-beauty": "editorial", "clinical-wellness": "clinical",
  "technical-performance": "technical", "direct-response": "utility", "playful-gifting": "playful",
  "premium-accessories": "luxury", "food-craft": "natural",
};

export function profileFromArtDirection(direction: ArtDirectionProfile, market = "FR"): DesignProfile {
  const density = direction.spacing === "compact" ? "dense" : direction.spacing === "airy" ? "airy" : "balanced";
  const card = direction.radius === "none" ? 0 : direction.radius === "round" ? 32 : 16;
  return {
    id: `profile-${direction.id}`, market, archetype: ART_DIRECTION_ARCHETYPE[direction.id],
    typography: { heading: direction.headingFont, body: direction.bodyFont, scale: 1 },
    colors: { background: direction.palette[0] ?? "#FFFFFF", ink: direction.palette[1] ?? "#111111", accent: direction.palette[2] ?? "#111111", surface: direction.palette[3] ?? "#FFFFFF" },
    spacing: { section: direction.spacing === "airy" ? 112 : direction.spacing === "compact" ? 56 : 80, gap: direction.spacing === "airy" ? 32 : 20 },
    radius: { card, button: direction.buttonStyle === "pill" ? 48 : card },
    borders: { width: 1, color: direction.palette[1] ?? "#111111" },
    media: { ratio: direction.mediaRatio, treatment: direction.proofMode === "editorial" ? "editorial" : direction.proofMode === "technical" ? "clean" : "immersive" },
    motion: { reveal: "fade", durationMs: 240 }, density,
  };
}
